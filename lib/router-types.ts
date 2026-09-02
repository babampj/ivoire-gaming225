import type { Game, GroupDetail, ForumDetail, UserCard, Room } from './types';

export type RouteName =
  | 'GameDetail'
  | 'GameChat'
  | 'Community'
  | 'GameForums'
  | 'CreateForum'
  | 'ForumDetail'
  | 'UserDetail'
  | 'Conversation'
  | 'GroupChat'
  | 'CreateGroup'
  | 'CreateVoiceRoom'
  | 'VoiceRoom'
  | 'EventDetail'
  | 'Search'
  | 'EditProfile'
  | 'Settings'
  | 'Notifications'
  | 'Onboarding';

export type RouteParams = {
  GameDetail: { slug: string; game?: Game };
  GameChat: { slug: string; name: string };
  Community: { slug: string; name: string };
  GameForums: { slug: string; name: string };
  CreateForum: { slug: string; name: string };
  ForumDetail: { id: string };
  UserDetail: { id: string };
  Conversation: { user: UserCard };
  GroupChat: { group: GroupDetail };
  CreateGroup: undefined;
  CreateVoiceRoom: { slug?: string; name?: string } | undefined;
  VoiceRoom: { room: Room; livekit?: { room: string; token: string } | null };
  EventDetail: { eventId: string };
  Search: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Notifications: undefined;
  Onboarding: undefined;
};

export type { Game, GroupDetail, ForumDetail, UserCard, Room };
