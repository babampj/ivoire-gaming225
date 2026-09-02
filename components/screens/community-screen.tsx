'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, X, ChevronRight, Plus } from 'lucide-react'
import { Badge3D, GlassCard, SectionTitle } from '@/components/ig-primitives'
import { Avatar } from '@/components/shared/avatar'
import { Loading } from '@/components/shared/screen'
import { EmptyState } from '@/components/shared/empty-state'
import { VoiceRoomCard } from '@/components/shared/voice-room-card'
import { UserRow } from '@/components/shared/user-row'
import { api } from '@/lib/services'
import { useRouter } from '@/lib/router'
import { gameBadge } from '@/lib/data'
import type { UserCard, Room, GameCommunity } from '@/lib/types'

interface GroupRow {
  id: string
  name: string
  description?: string | null
  avatar?: string | null
  isTeam: boolean
  membersCount?: number
  _count?: { members: number }
}

interface FriendRequestItem {
  id: string
  createdAt: string
  user: UserCard
}

export function CommunityScreen() {
  const router = useRouter()
  const [friends, setFriends] = useState<UserCard[]>([])
  const [pending, setPending] = useState<FriendRequestItem[]>([])
  const [suggestions, setSuggestions] = useState<UserCard[]>([])
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [communities, setCommunities] = useState<GameCommunity[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [f, p, s, g, r, c] = await Promise.all([
        api.get('/friends?limit=6'),
        api.get('/friends/requests'),
        api.get('/friends/suggestions?limit=4'),
        api.get('/groups'),
        api.get('/voice'),
        api.get('/communities/mine'),
      ])
      setFriends(f.data.data ?? [])
      setPending(p.data.data?.received ?? [])
      setSuggestions(s.data.data ?? [])
      setGroups(g.data.data ?? [])
      setRooms(r.data.data?.items ?? r.data.data ?? [])
      setCommunities(c.data.data ?? [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const accept = async (requestId: string) => {
    await api.post(`/friends/requests/${requestId}/accept`)
    void load()
  }
  const decline = async (requestId: string) => {
    await api.post(`/friends/requests/${requestId}/decline`)
    void load()
  }
  const send = async (userId: string) => {
    await api.post('/friends/requests', { userId })
    void load()
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-4">
      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Communauté
        </h1>
        <p className="text-sm text-muted-foreground">Amis, salons et clubs</p>
      </header>

      {loading ? <Loading label="Chargement de la communauté…" /> : null}
      {!loading ? (
        <>
          {pending.length > 0 ? (
            <section className="flex flex-col gap-3">
              <SectionTitle>Demandes d&apos;amitié</SectionTitle>
              <div className="flex flex-col gap-2.5">
                {pending.map((item) => (
                  <GlassCard key={item.id} className="flex items-center gap-3 p-3">
                    <Avatar uri={item.user.avatar} name={item.user.username} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{item.user.username}</p>
                      <p className="truncate text-xs text-muted-foreground">@{item.user.username}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Accepter"
                      onClick={() => void accept(item.id)}
                      className="glow-green flex h-9 w-9 items-center justify-center rounded-xl bg-[#1fa35b]/20 text-[#3fe08a]"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Refuser"
                      onClick={() => void decline(item.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-muted-foreground"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </GlassCard>
                ))}
              </div>
            </section>
          ) : null}

          {communities.length > 0 ? (
            <section className="flex flex-col gap-3">
              <SectionTitle>Mes communautés</SectionTitle>
              <div className="flex flex-col gap-2.5">
                {communities.map((cc) => (
                  <GlassCard key={cc.id} className="flex items-center gap-3 p-3">
                    <button
                      type="button"
                      onClick={() => cc.game?.slug && router.navigate('Community', { slug: cc.game.slug, name: cc.name })}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <Badge3D badge={gameBadge(cc.game?.slug)} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">{cc.name}</p>
                        <p className="text-xs text-muted-foreground">{cc.membersCount} membres</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </GlassCard>
                ))}
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <SectionTitle>Salons vocaux</SectionTitle>
              <button
                type="button"
                onClick={() => router.navigate('CreateVoiceRoom', undefined)}
                className="flex items-center gap-1 rounded-full bg-[rgba(124,92,252,0.2)] px-3 py-1.5 text-xs font-semibold text-foreground"
              >
                <Plus className="h-4 w-4" />
                Créer
              </button>
            </div>
            {rooms.length === 0 ? (
              <EmptyState emoji="🔊" title="Aucun salon vocal" subtitle="Créez-en un pour parler à votre team !" />
            ) : (
              rooms.map((r) => (
                <VoiceRoomCard key={r.id} room={r} onPress={() => router.navigate('VoiceRoom', { room: r })} />
              ))
            )}
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle>Mes groupes</SectionTitle>
            {groups.length === 0 ? (
              <EmptyState emoji="👥" title="Aucun groupe" subtitle="Formez un team ou un groupe d'amis." />
            ) : (
              groups.map((gr) => (
                <GlassCard key={gr.id} className="flex items-center gap-3 p-3">
                  <button
                    type="button"
                    onClick={() => {
                      router.navigate('GroupChat', {
                        group: {
                          id: gr.id,
                          name: gr.name,
                          description: gr.description,
                          avatar: gr.avatar,
                          isTeam: gr.isTeam,
                          createdAt: '',
                          owner: { id: '', username: '…', avatar: null, bio: null, city: null, status: 'OFFLINE', lastSeen: null, createdAt: '' },
                          members: [],
                          messagesCount: 0,
                          myRole: '',
                        },
                      })
                    }}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <Avatar uri={gr.avatar} name={gr.name} size={42} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{gr.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {gr.isTeam ? '⚔️ Team' : '👥 Groupe'} · {gr._count?.members ?? gr.membersCount ?? 0} membre(s)
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                </GlassCard>
              ))
            )}
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle>Mes amis</SectionTitle>
            {friends.length === 0 ? (
              <EmptyState emoji="🤝" title="Aucun ami" subtitle="Explorez les suggestions ci-dessous." />
            ) : (
              friends.map((u) => (
                <UserRow key={u.id} user={u} onPress={() => router.navigate('UserDetail', { id: u.id })} />
              ))
            )}
          </section>

          {suggestions.length > 0 ? (
            <section className="flex flex-col gap-3">
              <SectionTitle>Suggestions</SectionTitle>
              {suggestions.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  subtitle={`${u.city ?? 'CI'} · ${(u as unknown as { friendsCount?: number }).friendsCount ?? 0} ami(s)`}
                  onPress={() => router.navigate('UserDetail', { id: u.id })}
                  actions={
                    <button
                      type="button"
                      onClick={() => void send(u.id)}
                      className="rounded-full border border-[#7c5cfc] bg-[rgba(124,92,252,0.2)] px-3 py-1.5 text-[13px] font-semibold text-[#c9bcff]"
                    >
                      ＋ Ami
                    </button>
                  }
                />
              ))}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
