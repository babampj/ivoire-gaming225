import prisma from '../../lib/prisma.js';
import { errors } from '../../common/ApiError.js';
import { pageFromQuery, paginate } from '../../common/paginate.js';

export async function listNotifications(userId: string, unreadOnly = false, page = 1, limit = 30) {
  const { skip, take } = pageFromQuery({ page, limit }, 50);
  const where = { userId, ...(unreadOnly ? { read: false } : {}) };
  const [total, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);
  return paginate(items, total, page, take);
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markRead(userId: string, id: string) {
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif || notif.userId !== userId) throw errors.notFound('Notification introuvable.');
  return prisma.notification.update({ where: { id }, data: { read: true } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  return { ok: true };
}

export async function listAnnouncements() {
  return prisma.announcement.findMany({
    where: { active: true },
    include: { user: { select: { id: true, username: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createAnnouncement(userId: string, input: { title: string; content: string; image?: string }) {
  return prisma.announcement.create({
    data: { title: input.title, content: input.content, image: input.image, createdById: userId },
  });
}