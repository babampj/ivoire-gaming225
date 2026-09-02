/** Types partagés — alignés sur les réponses de l'API. */

export interface UserCard {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  city: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'IN_GAME';
  lastSeen: string | null;
  createdAt: string;
  relation?: {
    relation: 'self' | 'friend' | 'requestSent' | 'requestReceived' | 'none' | 'blocked';
    friendRequestId: string | null;
  };
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  icon?: string | null;
  active: boolean;
  createdAt?: string;
  isFavorite?: boolean;
  _count?: { forums: number; voiceRooms: number; events: number };
}

export interface FavoriteGame {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  position: number;
}

export interface Me {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar: string | null;
  bio: string | null;
  city: string | null;
  birthDate?: string | null;
  status: string;
  lastSeen: string | null;
  createdAt: string;
  favorites: FavoriteGame[];
  friendsCount: number;
  groupsCount: number;
  privacy: {
    showOnline: boolean;
    allowFriendRequests: boolean;
    allowDirectMessages: boolean;
    notificationsEnabled: boolean;
  } | null;
}

export interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  location: string;
  startDate: string;
  endDate?: string | null;
  link?: string | null;
  game?: { id: string; name: string; slug: string; icon: string | null } | null;
  organizer: UserCard;
  participantsCount?: number;
  status?: string;
  isParticipating?: boolean;
}

export interface Room {
  id: string;
  name: string;
  description?: string | null;
  isPrivate: boolean;
  game?: { id: string; name: string; slug: string; icon: string | null } | null;
  owner: { id: string; username: string; avatar: string | null } | null;
  members: UserCard[];
  memberCount: number;
  isOwner: boolean;
  isMember: boolean;
  canJoin: boolean;
  isInvited: boolean;
  createdAt: string;
}

export interface ForumItem {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  author: UserCard;
  repliesCount: number;
  likesCount: number;
  game?: { slug?: string } | null;
}

export interface ForumPost {
  id: string;
  content: string;
  createdAt: string;
  author: UserCard;
  likesCount: number;
  likedByMe: boolean;
}

export interface ForumDetail {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  author: UserCard;
  posts: ForumPost[];
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'TEXT' | 'IMAGE';
  imageUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
  sender?: UserCard;
}

export interface Conversation {
  user: UserCard;
  lastMessage: { id: string; content: string; type: string; createdAt: string; fromMe: boolean; read: boolean };
  unread: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  content: string;
  refType?: string | null;
  refId?: string | null;
  read: boolean;
  createdAt: string;
}

export interface GroupDetail {
  id: string;
  name: string;
  description?: string | null;
  avatar?: string | null;
  isTeam: boolean;
  createdAt: string;
  owner: UserCard;
  members: (UserCard & { roleInGroup: string })[];
  messagesCount: number;
  myRole: string;
}

export interface GameCommunity {
  id: string;
  game: { id: string; name: string; slug: string; icon: string | null } | null;
  name: string;
  membersCount: number;
  createdAt: string;
}

export interface GameCommunityDetail {
  id: string;
  game: { id: string; name: string; slug: string; icon: string | null } | null;
  name: string;
  isMember: boolean;
  membersCount: number;
  members: UserCard[];
}

export type ApiError = {
  error: { message: string; code: string; details?: unknown };
};
