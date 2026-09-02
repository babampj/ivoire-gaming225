import prisma from '../../lib/prisma.js';
import { errors } from '../../common/ApiError.js';
import { getIO } from '../../lib/socket.js';
import { notify } from '../../lib/notify.js';

export type ForumSort = 'recent' | 'popular' | 'trending';

export async function listForums(gameSlug: string, sort: ForumSort, search: string | undefined, page = 1, limit = 20) {
  const game = await prisma.game.findUnique({ where: { slug: gameSlug } });
  if (!game) throw errors.notFound('Jeu introuvable.');

  const where = {
    gameId: game.id,
    status: 'OPEN',
    ...(search ? { OR: [{ title: { contains: search } }, { content: { contains: search } }] } : {}),
  };

  const total = await prisma.forum.count({ where });
  const forums = await prisma.forum.findMany({
    where,
    include: {
      author: { select: { id: true, username: true, avatar: true, status: true } },
      _count: { select: { posts: true } },
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy:
      sort === 'recent'
        ? { createdAt: 'desc' }
        : sort === 'popular'
          ? [{ pinned: 'desc' }, { createdAt: 'desc' }]
          : [{ pinned: 'desc' }, { createdAt: 'desc' }],
  });

  // comptage des likes pour ces forums (approche "populaire"/"tendance")
  const postIds = (await prisma.forumPost.findMany({
    where: { forumId: { in: forums.map((f) => f.id) } },
    select: { id: true, forumId: true },
  })).reduce<Record<string, string[]>>((acc, p) => {
    (acc[p.forumId] ??= []).push(p.id);
    return acc;
  }, {});

  const likeCounts: Record<string, number> = {};
  for (const [fid, ids] of Object.entries(postIds)) {
    const likes = await prisma.forumLike.groupBy({
      by: ['forumPostId'],
      where: { forumPostId: { in: ids } },
      _count: true,
    });
    likeCounts[fid] = likes.reduce((sum, l) => sum + l._count, 0);
  }

  // score "tendance" : likes + réponses pondérées par la fraîcheur
  const now = Date.now();
  const items = forums
    .map((f) => ({
      id: f.id,
      title: f.title,
      content: f.content,
      pinned: f.pinned,
      createdAt: f.createdAt,
      author: f.author,
      repliesCount: f._count.posts,
      likesCount: likeCounts[f.id] ?? 0,
      trendingScore: (likeCounts[f.id] ?? 0) * 3 + f._count.posts * 2 + Math.max(0, 7 - (now - f.createdAt.getTime()) / 86400000),
    }))
    .sort((a, b) => {
      if (sort === 'popular') return b.likesCount * 3 + b.repliesCount - (a.likesCount * 3 + a.repliesCount);
      if (sort === 'trending') return b.trendingScore - a.trendingScore;
      return +b.pinned - +a.pinned;
    });

  return { total, page, items };
}

export async function createForum(userId: string, gameSlug: string, title: string, content: string) {
  const game = await prisma.game.findUnique({ where: { slug: gameSlug } });
  if (!game) throw errors.notFound('Jeu introuvable.');
  if (title.trim().length < 4) throw errors.badRequest('Le titre est trop court.');
  if (content.trim().length < 2) throw errors.badRequest('Le contenu est vide.');

  return prisma.forum.create({
    data: { gameId: game.id, authorId: userId, title: title.trim(), content: content.trim() },
    include: { author: { select: { id: true, username: true, avatar: true, status: true } } },
  });
}

export async function getForum(id: string, meId?: string) {
  const forum = await prisma.forum.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, username: true, avatar: true, status: true, city: true } },
      posts: {
        include: {
          author: { select: { id: true, username: true, avatar: true, status: true } },
          _count: { select: { likes: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!forum) throw errors.notFound('Discussion introuvable.');

  let likedByMe: string[] = [];
  if (meId) {
    const likes = await prisma.forumLike.findMany({
      where: { forumPostId: { in: forum.posts.map((p) => p.id) }, userId: meId },
      select: { forumPostId: true },
    });
    likedByMe = likes.map((l) => l.forumPostId);
  }

  return {
    id: forum.id,
    title: forum.title,
    content: forum.content,
    pinned: forum.pinned,
    createdAt: forum.createdAt,
    author: forum.author,
    posts: forum.posts.map((p) => ({
      id: p.id,
      content: p.content,
      createdAt: p.createdAt,
      author: p.author,
      likesCount: p._count.likes,
      likedByMe: likedByMe.includes(p.id),
    })),
  };
}

export async function createPost(userId: string, forumId: string, content: string) {
  const forum = await prisma.forum.findUnique({ where: { id: forumId }, include: { author: true } });
  if (!forum) throw errors.notFound('Discussion introuvable.');
  if (forum.status === 'CLOSED') throw errors.forbidden('Cette discussion est fermée.');
  if (content.trim().length < 1) throw errors.badRequest('Réponse vide.');

  const post = await prisma.forumPost.create({
    data: { forumId, authorId: userId, content: content.trim() },
    include: { author: { select: { id: true, username: true, avatar: true, status: true } } },
  });

  getIO().to(`forum:${forumId}`).emit('forum:reply', post);

  if (forum.authorId !== userId) {
    await notify({
      userId: forum.authorId,
      type: 'FORUM_REPLY',
      content: `${post.author.username} a répondu à « ${forum.title} ».`,
      refType: 'forum',
      refId: forumId,
    });
  }
  return post;
}

export async function toggleLike(userId: string, postId: string) {
  const post = await prisma.forumPost.findUnique({ where: { id: postId } });
  if (!post) throw errors.notFound('Publication introuvable.');
  const existing = await prisma.forumLike.findUnique({
    where: { forumPostId_userId: { forumPostId: postId, userId } },
  });
  if (existing) {
    await prisma.forumLike.delete({ where: { forumPostId_userId: { forumPostId: postId, userId } } });
    return { liked: false };
  }
  await prisma.forumLike.create({ data: { forumPostId: postId, userId } });
  return { liked: true };
}

export async function deleteForum(id: string, meId: string, role: string) {
  const forum = await prisma.forum.findUnique({ where: { id } });
  if (!forum) throw errors.notFound('Discussion introuvable.');
  if (forum.authorId !== meId && !['MODERATOR', 'ADMIN'].includes(role)) {
    throw errors.forbidden();
  }
  await prisma.forum.delete({ where: { id } });
  return { ok: true };
}

export async function deletePost(id: string, meId: string, role: string) {
  const post = await prisma.forumPost.findUnique({ where: { id } });
  if (!post) throw errors.notFound('Publication introuvable.');
  if (post.authorId !== meId && !['MODERATOR', 'ADMIN'].includes(role)) {
    throw errors.forbidden();
  }
  await prisma.forumPost.delete({ where: { id } });
  return { ok: true };
}