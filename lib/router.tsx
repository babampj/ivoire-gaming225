'use client'
import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import type { Game, GroupDetail, ForumDetail, UserCard, Room, RouteName } from './router-types';

export interface RouteParamsMap {
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
}

type RouteParamsOf<N extends RouteName> = RouteParamsMap[N];

export interface RouteEntry<N extends RouteName = RouteName> {
  name: N;
  params: RouteParamsOf<N>;
}

interface RouterState {
  stack: RouteEntry[];
  onTab: (tab: string) => void;
  activeTab: string;
  navigate: <N extends RouteName>(name: N, params: RouteParamsOf<N>) => void;
  goBack: () => void;
  reset: () => void;
  current: RouteEntry | undefined;
}

const RouterContext = createContext<RouterState | null>(null);

export function RouterProvider({
  children,
  initialTab,
}: {
  children: ReactNode;
  initialTab: string;
}) {
  const [stack, setStack] = useState<RouteEntry[]>([]);
  const [activeTab, setActiveTab] = useState(initialTab);

  const navigate = useCallback(<N extends RouteName>(name: N, params: RouteParamsOf<N>) => {
    setStack((s) => [...s, { name, params }]);
  }, []);

  const goBack = useCallback(() => {
    setStack((s) => (s.length ? s.slice(0, -1) : s));
  }, []);

  const reset = useCallback(() => setStack([]), []);

  const onTab = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      setStack((s) => (s.length ? [] : s));
    },
    [],
  );

  const current = stack.length ? stack[stack.length - 1] : undefined;

  const value = useMemo<RouterState>(
    () => ({ stack, onTab, activeTab, navigate, goBack, reset, current }),
    [stack, onTab, activeTab, navigate, goBack, reset, current],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterState {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
