'use client'
import { useCallback, useEffect, useState } from 'react'
import { api, getErrorMessage } from '@/lib/services'
import { useRouter } from '@/lib/router'
import { Loading, Screen } from '@/components/shared/screen'
import { EmptyState } from '@/components/shared/empty-state'
import { SectionHeader } from '@/components/shared/section-header'
import { VoiceRoomCard } from '@/components/shared/voice-room-card'
import { Button } from '@/components/shared/button'
import { Avatar } from '@/components/shared/avatar'
import type { GameCommunityDetail, Room } from '@/lib/types'

export function CommunityGameScreen({ slug, name }: { slug: string; name: string }) {
  const router = useRouter()
  const [community, setCommunity] = useState<GameCommunityDetail | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [c, v] = await Promise.all([api.get(`/communities/game/${slug}`), api.get('/voice')])
      setCommunity(c.data.data)
      const all: Room[] = v.data.data?.items ?? v.data.data ?? []
      setRooms(all.filter((r) => r.game?.slug === slug && !r.isPrivate))
      setError(null)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <Loading label="Chargement de la communauté…" />

  return (
    <Screen back>
      {error && !community ? <p className="mt-8 text-center text-sm text-[#ef4444]">{error}</p> : null}

      {community ? (
        <>
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] p-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(42,38,66,0.75)]">
              <span className="text-[26px]">{community.game?.icon ?? '🎮'}</span>
            </div>
            <div className="flex-1">
              <p className="font-display text-lg font-black text-[#f5f5fa]">{community.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {community.membersCount} membre{community.membersCount > 1 ? 's' : ''} · communauté du jeu
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              title="💬 Discuter avec la communauté"
              variant="primary"
              small
              onPress={() => router.navigate('GameChat', { slug, name: community.name })}
            />
            <Button
              title="🔊 Créer un salon vocal"
              variant="outline"
              small
              onPress={() => router.navigate('CreateVoiceRoom', { slug, name: community.name })}
            />
          </div>

          <div className="mt-4" />

          <SectionHeader title={`Membres (${community.membersCount})`} />
          {community.members.length === 0 ? (
            <EmptyState emoji="👤" title="Aucun membre" subtitle="Ajoutez ce jeu en favori pour rejoindre." />
          ) : (
            <div className="flex flex-wrap gap-4 rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] p-3">
              {community.members.slice(0, 24).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => router.navigate('UserDetail', { id: m.id })}
                  className="flex w-16 flex-col items-center gap-1"
                >
                  <Avatar uri={m.avatar} name={m.username} size={44} showPresence online={m.status === 'ONLINE'} />
                  <p className="max-w-16 truncate text-xs text-muted-foreground">{m.username}</p>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4" />

          <SectionHeader title="Salons vocaux du jeu" action="Créer" onAction={() => router.navigate('CreateVoiceRoom', { slug, name: community.name })} />
          {rooms.length === 0 ? (
            <EmptyState emoji="🔊" title="Aucun salon pour ce jeu" subtitle="Créez-en un, les fans de ce jeu pourront le rejoindre (10 max)." />
          ) : (
            rooms.map((r) => (
              <VoiceRoomCard key={r.id} room={r} onPress={() => router.navigate('VoiceRoom', { room: r })} />
            ))
          )}
        </>
      ) : null}

      {!loading && !error && !community ? (
        <EmptyState emoji="🎮" title="Communauté indisponible" subtitle="Ce jeu n'a pas encore de communauté." />
      ) : null}
    </Screen>
  )
}
