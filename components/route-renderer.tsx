'use client'
import type { RouteEntry } from '@/lib/router';
import { GameDetailScreen } from '@/components/routes/game-detail-screen';
import { GameChatScreen } from '@/components/routes/game-chat-screen';
import { CommunityGameScreen } from '@/components/routes/community-game-screen';
import { GameForumsScreen } from '@/components/routes/game-forums-screen';
import { CreateForumScreen } from '@/components/routes/create-forum-screen';
import { ForumDetailScreen } from '@/components/routes/forum-detail-screen';
import { UserDetailScreen } from '@/components/routes/user-detail-screen';
import { ConversationScreen } from '@/components/routes/conversation-screen';
import { GroupChatScreen } from '@/components/routes/group-chat-screen';
import { CreateGroupScreen } from '@/components/routes/create-group-screen';
import { CreateVoiceRoomScreen } from '@/components/routes/create-voice-room-screen';
import { VoiceRoomScreen } from '@/components/routes/voice-room-screen';
import { EventDetailScreen } from '@/components/routes/event-detail-screen';
import { SearchScreen } from '@/components/routes/search-screen';
import { EditProfileScreen } from '@/components/routes/edit-profile-screen';
import { SettingsScreen } from '@/components/routes/settings-screen';
import { NotificationsScreen } from '@/components/routes/notifications-screen';

export function RouteRenderer({ route }: { route: RouteEntry }) {
  switch (route.name) {
    case 'GameDetail':
      return <GameDetailScreen {...(route.params as any)} />;
    case 'GameChat':
      return <GameChatScreen {...(route.params as any)} />;
    case 'Community':
      return <CommunityGameScreen {...(route.params as any)} />;
    case 'GameForums':
      return <GameForumsScreen {...(route.params as any)} />;
    case 'CreateForum':
      return <CreateForumScreen {...(route.params as any)} />;
    case 'ForumDetail':
      return <ForumDetailScreen {...(route.params as any)} />;
    case 'UserDetail':
      return <UserDetailScreen {...(route.params as any)} />;
    case 'Conversation':
      return <ConversationScreen {...(route.params as any)} />;
    case 'GroupChat':
      return <GroupChatScreen {...(route.params as any)} />;
    case 'CreateGroup':
      return <CreateGroupScreen />;
    case 'CreateVoiceRoom':
      return <CreateVoiceRoomScreen {...(route.params as any)} />;
    case 'VoiceRoom':
      return <VoiceRoomScreen {...(route.params as any)} />;
    case 'EventDetail':
      return <EventDetailScreen {...(route.params as any)} />;
    case 'Search':
      return <SearchScreen />;
    case 'EditProfile':
      return <EditProfileScreen />;
    case 'Settings':
      return <SettingsScreen />;
    case 'Notifications':
      return <NotificationsScreen />;
    default:
      return null;
  }
}

export function getRouteTitle(name: RouteEntry['name']): string {
  const map: Record<string, string> = {
    GameDetail: '',
    GameChat: 'Chat du jeu',
    Community: 'Communauté',
    GameForums: 'Discussions',
    CreateForum: 'Nouvelle discussion',
    ForumDetail: 'Discussion',
    UserDetail: 'Profil',
    Conversation: 'Message',
    GroupChat: 'Groupe',
    CreateGroup: 'Nouveau groupe',
    CreateVoiceRoom: 'Nouveau salon vocal',
    VoiceRoom: 'Salon vocal',
    EventDetail: 'Événement',
    Search: 'Recherche',
    EditProfile: 'Modifier le profil',
    Settings: 'Paramètres',
    Notifications: 'Notifications',
  };
  return map[name] ?? '';
}
