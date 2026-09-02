'use client'

import { useEffect } from 'react'
import { BottomNav, type TabKey } from '@/components/bottom-nav'
import { useAuth } from '@/lib/stores/auth'
import { useApp } from '@/lib/stores/app'
import { RouterProvider, useRouter } from '@/lib/router'
import { getSocket } from '@/lib/socket'
import { api } from '@/lib/services'
import { AuthScreen } from '@/components/screens/auth-screen'
import { OnboardingScreen } from '@/components/screens/onboarding-screen'
import { HomeScreen } from '@/components/screens/home-screen'
import { GamesScreen } from '@/components/screens/games-screen'
import { MessagesScreen } from '@/components/screens/messages-screen'
import { CommunityScreen } from '@/components/screens/community-screen'
import { ProfileScreen } from '@/components/screens/profile-screen'
import { Toast } from '@/components/shared/toast'
import { CallOverlay } from '@/components/shared/call-overlay'
import { RouteRenderer } from '@/components/route-renderer'

function Splash() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#7c5cfc]/30 border-t-[#7c5cfc]" />
      <p className="text-lg font-black text-[#f5f5fa]">Ivoire Gaming</p>
    </div>
  )
}

function AppContent() {
  const status = useAuth((s) => s.status)
  const user = useAuth((s) => s.user)
  const setActiveCall = useApp((s) => s.setActiveCall)
  const setUnread = useApp((s) => s.setUnreadNotifications)
  const router = useRouter()

  const needsOnboarding = status === 'auth' && (user?.favorites?.length ?? 0) === 0

  useEffect(() => {
    if (status !== 'auth') return
    const socket = getSocket()
    const onIncoming = (payload: { callId: string; from: string; fromName?: string }) => {
      setActiveCall({
        mode: 'incoming',
        callId: payload.callId,
        peerId: payload.from,
        peerName: payload.fromName ?? 'Appel vocal',
      })
    }
    const onNotification = () => {
      api
        .get('/notifications/unread-count')
        .then((res) => setUnread(res.data.data?.count ?? 0))
        .catch(() => undefined)
    }
    socket?.on('call:incoming', onIncoming)
    socket?.on('notification:new', onNotification)
    return () => {
      socket?.off('call:incoming', onIncoming)
      socket?.off('notification:new', onNotification)
    }
  }, [status, setActiveCall, setUnread])

  if (status === 'loading') return <Splash />
  if (status === 'guest') return <AuthScreen />
  if (needsOnboarding) return <OnboardingScreen />

  const tab = (router.activeTab || 'home') as TabKey

  return (
    <>
      <div className="flex-1 overflow-y-auto no-scrollbar pb-28 pt-2">
        {router.current ? (
          <RouteRenderer route={router.current} />
        ) : (
          <>
            {tab === 'home' && <HomeScreen />}
            {tab === 'games' && <GamesScreen />}
            {tab === 'messages' && <MessagesScreen />}
            {tab === 'community' && <CommunityScreen />}
            {tab === 'profile' && <ProfileScreen />}
          </>
        )}
      </div>
      <BottomNav active={tab} onChange={router.onTab} />
    </>
  )
}

export function AppShell() {
  const status = useAuth((s) => s.status)

  useEffect(() => {
    useAuth.getState().bootstrap()
  }, [])

  return (
    <main className="flex h-dvh items-center justify-center p-0 sm:p-6">
      {/* Mobile device frame */}
      <div className="relative flex h-full w-full max-w-[420px] flex-col overflow-hidden bg-transparent sm:h-[860px] sm:rounded-[2.75rem] sm:border sm:border-white/10 sm:shadow-2xl">
        {/* top ambient halo */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-52"
          style={{
            background:
              'radial-gradient(80% 100% at 50% 0%, rgba(124,92,252,0.35), rgba(124,92,252,0) 70%)',
          }}
        />
        <RouterProvider initialTab={status === 'guest' ? '' : 'home'}>
          <div className="relative z-10 flex h-full flex-col overflow-hidden">
            <AppContent />
          </div>
          <Toast />
          <CallOverlay />
        </RouterProvider>
      </div>
    </main>
  )
}
