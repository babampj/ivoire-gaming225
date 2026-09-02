import prisma from '../../lib/prisma.js';
import { errors } from '../../common/ApiError.js';
import { REPORT_TYPES, REPORT_STATUS } from '../../common/constants.js';
import { pageFromQuery, paginate } from '../../common/paginate.js';

export type ReportInput = {
  contentType: string;
  contentId?: string;
  reportedUserId?: string;
  reason: string;
};

export async function createReport(reporterId: string, input: ReportInput) {
  if (!REPORT_TYPES.includes(input.contentType as never)) {
    throw errors.badRequest('Type de contenu invalide.');
  }
  if (input.contentType === 'USER' && !input.reportedUserId) {
    throw errors.badRequest('Utilisateur signalé requis.');
  }
  if (input.reason.trim().length < 5) throw errors.badRequest('Merci de préciser le motif (5 caractères min).');

  return prisma.report.create({
    data: {
      reporterId,
      reportedUserId: input.reportedUserId ?? null,
      contentType: input.contentType,
      contentId: input.contentId ?? null,
      reason: input.reason.trim(),
      status: REPORT_STATUS.PENDING,
    },
  });
}

export async function listReports(status: string | undefined, page = 1, limit = 20) {
  const { skip, take } = pageFromQuery({ page, limit }, 50);
  const where = status ? { status } : {};
  const [total, items] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      include: {
        reporter: { select: { id: true, username: true, avatar: true } },
        reported: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);
  return paginate(items, total, page, take);
}

export async function resolveReport(id: string, status: string, resolvedBy: string) {
  if (!Object.values(REPORT_STATUS).includes(status as never)) {
    throw errors.badRequest('Statut invalide.');
  }
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) throw errors.notFound('Signalement introuvable.');
  return prisma.report.update({
    where: { id },
    data: { status, resolvedBy, resolvedAt: new Date() },
  });
}

export async function listBannedUsers() {
  return prisma.user.findMany({
    where: { banned: true },
    select: { id: true, username: true, email: true, avatar: true, banReason: true, banExpiresAt: true, bannedAt: true },
    orderBy: { bannedAt: 'desc' },
  });
}

export async function banUser(userId: string, reason: string, days?: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw errors.notFound('Utilisateur introuvable.');

  const banExpiresAt = days && days > 0 ? new Date(Date.now() + days * 86400000) : null;
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { banned: true, banReason: reason, banExpiresAt, bannedAt: new Date() },
  });

  // déconnecter ses sessions
  await prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
  const { getIO } = await import('../../lib/socket.js');
  try {
    getIO().to(`user:${userId}`).emit('user:banned', { reason, banExpiresAt });
  } catch {
    // io pas prêt (tests)
  }
  return updated;
}

export async function unbanUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw errors.notFound('Utilisateur introuvable.');
  return prisma.user.update({
    where: { id: userId },
    data: { banned: false, banReason: null, banExpiresAt: null, bannedAt: null },
  });
}

/**
 * Suppression de contenu modéré. Seuls les types connus sont acceptés.
 * Retourne le type + l'id, indépendamment du domaine d'origine.
 */
export async function deleteContent(contentType: string, id: string) {
  switch (contentType) {
    case 'FORUM':
      await prisma.forum.deleteMany({ where: { id } });
      return { ok: true };
    case 'POST':
      await prisma.forumPost.deleteMany({ where: { id } });
      return { ok: true };
    case 'MESSAGE':
      await prisma.message.deleteMany({ where: { id } });
      return { ok: true };
    case 'GAME_CHAT':
      await prisma.gameChatMessage.deleteMany({ where: { id } });
      return { ok: true };
    case 'EVENT':
      await prisma.event.deleteMany({ where: { id } });
      return { ok: true };
    case 'ROOM':
      await prisma.voiceRoom.deleteMany({ where: { id } });
      return { ok: true };
    case 'GROUP':
      await prisma.group.deleteMany({ where: { id } });
      return { ok: true };
    default:
      throw errors.badRequest('Type de contenu non modérable.');
  }
}

export async function dashboardStats() {
  const [
    usersCount,
    onlineUsers,
    gamesCount,
    eventsCount,
    pendingReports,
    roomsCount,
    messagesToday,
    forumsCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ONLINE' } }),
    prisma.game.count({ where: { active: true } }),
    prisma.event.count(),
    prisma.report.count({ where: { status: REPORT_STATUS.PENDING } }),
    prisma.voiceRoom.count(),
    prisma.message.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    prisma.forum.count(),
  ]);
  return {
    usersCount,
    onlineUsers,
    gamesCount,
    eventsCount,
    pendingReports,
    roomsCount,
    messagesToday,
    forumsCount,
  };
}