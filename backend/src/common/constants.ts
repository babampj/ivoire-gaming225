export const ROLES = {
  USER: 'USER',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
} as const;

export const PRESENCE = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  IN_GAME: 'IN_GAME',
} as const;

export const REQUEST_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
} as const;

export const EVENT_STATUS = {
  UPCOMING: 'UPCOMING',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const REPORT_STATUS = {
  PENDING: 'PENDING',
  REVIEWED: 'REVIEWED',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
} as const;

export const REPORT_TYPES = [
  'USER',
  'FORUM',
  'POST',
  'MESSAGE',
  'GAME_CHAT',
  'EVENT',
  'ROOM',
  'GROUP',
] as const;

export const NOTIFICATION_TYPES = [
  'FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
  'NEW_MESSAGE',
  'INCOMING_CALL',
  'GROUP_INVITE',
  'VOICE_INVITE',
  'EVENT_REMINDER',
  'FORUM_REPLY',
  'FORUM_MENTION',
] as const;

export const MAX_FAVORITE_GAMES = 3;

export const MESSAGE_TYPES = ['TEXT', 'IMAGE'] as const;