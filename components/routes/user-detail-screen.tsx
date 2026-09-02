'use client'
import { useCallback, useEffect, useState } from 'react'
import { api, getErrorMessage } from '@/lib/services'
import { useApp } from '@/lib/stores/app'
import { sendCallInvite } from '@/lib/socket'
import { useRouter } from '@/lib/router'
import { Avatar } from '@/components/shared/avatar'
import { Button } from '@/components/shared/button'
import { Loading, Screen } from '@/components/shared/screen'
import { timeAgo } from '@/lib/format'

interface Profile {
  id: string
  username: string
  avatar: string | null
  bio: string | null
  city: string | null
  status: string
  lastSeen: string | null
  createdAt: string
  favorites: { id: string; name: string; slug: string; icon: string | null; position: number }[]
  friendsCount: number
  relation?: {
    relation: 'self' | 'friend' | 'requestSent' | 'requestReceived' | 'none' | 'blocked'
    friendRequestId: string | null
  }
}

export function UserDetailScreen({ id }: { id: string }) {
  const showToast = useApp((s) => s.showToast)
  const setActiveCall = useApp((s) => s.setActiveCall)
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/users/${id}`)
      setProfile(res.data.data)
    } catch (e) {
      showToast(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [id, showToast])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      void load()
    } catch (e) {
      showToast(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading label="Chargement du profil…" />
  if (!profile) return null

  const rel = profile.relation?.relation ?? 'none'

  const call = () => {
    const callId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    sendCallInvite(profile.id, callId)
    setActiveCall({ mode: 'outgoing', callId, peerId: profile.id, peerName: profile.username })
  }

  return (
    <Screen back>
      <div className="mt-2 flex flex-col items-center">
        <Avatar uri={profile.avatar} name={profile.username} size={96} showPresence online={profile.status === 'ONLINE'} />
        <p className="mt-3 font-display text-xl font-black text-[#f5f5fa]">{profile.username}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile.status === 'ONLINE' ? '🟢 En ligne' : profile.status === 'IN_GAME' ? '🟡 En jeu' : `Offline · ${profile.lastSeen ? timeAgo(profile.lastSeen) : 'jamais'}`}
        </p>
        {profile.city ? <p className="mt-1 text-sm text-muted-foreground">📍 {profile.city}</p> : null}
        {profile.bio ? (
          <p className="mt-3 max-w-xs text-center text-base leading-[22px] text-muted-foreground">
            {profile.bio}
          </p>
        ) : null}
        <p className="mt-3 text-center text-xs text-[#62627a]">
          {profile.friendsCount} ami{profile.friendsCount > 1 ? 's' : ''} · {profile.favorites.length} jeu(x) favori(s) · Membre depuis {timeAgo(profile.createdAt)}
        </p>
      </div>

      {profile.favorites.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 font-display text-lg font-bold text-[#f5f5fa]">🎯 Jeux favoris</h2>
          <div className="flex flex-wrap gap-2">
            {profile.favorites.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[rgba(30,28,52,0.62)] px-4 py-2">
                <span className="text-base">{f.icon ?? '🎮'}</span>
                <span className="text-sm font-medium text-muted-foreground">{f.name}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-2.5">
        {rel === 'none' ? (
          <Button title="＋ Ajouter en ami" onPress={() => act(() => api.post('/friends/requests', { userId: profile.id }))} loading={busy} />
        ) : null}
        {rel === 'requestSent' ? <Button title="⏳ Demande envoyée" disabled /> : null}
        {rel === 'requestReceived' ? (
          <Button
            title="✓ Accepter la demande"
            onPress={() => act(() => api.post(`/friends/requests/${profile.relation?.friendRequestId}/accept`))}
            loading={busy}
          />
        ) : null}
        {rel === 'friend' ? (
          <>
            <Button title="💬 Envoyer un message" onPress={() => router.navigate('Conversation', { user: profile as never })} small />
            <Button title="📞 Appel vocal" variant="outline" onPress={call} small />
            <Button
              title="✂️ Retirer de mes amis"
              variant="ghost"
              onPress={() => act(() => api.delete(`/friends/${profile.id}`))}
              loading={busy}
            />
          </>
        ) : null}

        {rel !== 'blocked' ? (
          <Button
            title="🚫 Bloquer"
            variant="ghost"
            onPress={() => act(() => api.post(`/friends/block/${profile.id}`))}
            loading={busy}
          />
        ) : (
          <Button
            title="🔓 Débloquer"
            variant="ghost"
            onPress={() => act(() => api.delete(`/users/me/blocked/${profile.id}`))}
            loading={busy}
          />
        )}
      </div>
    </Screen>
  )
}
