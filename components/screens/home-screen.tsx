'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, Clock, ChevronRight, Users2 } from 'lucide-react'
import { Badge3D, GlassCard, MemberPill, SectionTitle } from '@/components/ig-primitives'
import { Loading } from '@/components/shared/screen'
import { api, getErrorMessage } from '@/lib/services'
import { useAuth } from '@/lib/stores/auth'
import { useRouter } from '@/lib/router'
import { gameBadge } from '@/lib/data'
import { timeAgo } from '@/lib/format'
import type { EventItem, GameCommunity, FavoriteGame } from '@/lib/types'

interface Announcement {
  id: string
  title: string
  content: string
  createdAt: string
}

interface HomeData {
  games: FavoriteGame[]
  events: EventItem[]
  announcements: Announcement[]
  communities: GameCommunity[]
  myCommunityGameIds: string[]
}

export function HomeScreen() {
  const router = useRouter()
  const user = useAuth((s) => s.user)
  const [data, setData] = useState<HomeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/home')
      setData(res.data.data)
      setError(null)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !data) return <Loading label="Chargement de ton feed…" />
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-24">
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            void load()
          }}
          className="mt-4 rounded-xl bg-[#7c5cfc] px-6 py-3 text-sm font-bold text-white"
        >
          Réessayer
        </button>
      </div>
    )
  }
  if (!data) return null

  const announcement = data.announcements[0]

  return (
    <div className="flex flex-col gap-6 px-4 pb-4">
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs text-muted-foreground">Bon retour,</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {user?.username ?? 'Gamer'}
          </h1>
        </div>
        <button
          type="button"
          aria-label="Rechercher"
          onClick={() => router.navigate('Search', undefined)}
          className="glass glass-border flex h-11 w-11 items-center justify-center rounded-2xl text-foreground"
        >
          <Search className="h-5 w-5" />
        </button>
      </header>

      {announcement ? (
        <GlassCard bordered={false} className="relative overflow-hidden p-4">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,122,26,0.35), rgba(232,195,107,0.18) 55%, rgba(124,92,252,0.15))',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.5) 0, transparent 6%), radial-gradient(circle at 70% 20%, rgba(232,195,107,0.6) 0, transparent 5%), radial-gradient(circle at 85% 65%, rgba(255,255,255,0.4) 0, transparent 5%), radial-gradient(circle at 40% 80%, rgba(255,122,26,0.5) 0, transparent 5%)',
            }}
          />
          <div className="flex items-start gap-3">
            <Badge3D badge="trophy" size={58} />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-[#0b0b14]/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ffd9b0]">
                  Annonce
                </span>
                <span className="flex items-center gap-1 text-[10px] text-[#f5f5fa]/70">
                  <Clock className="h-3 w-3" />
                  {timeAgo(announcement.createdAt)}
                </span>
              </div>
              <h3 className="font-display text-lg font-bold leading-tight text-foreground text-balance">
                {announcement.title}
              </h3>
              <p className="mt-0.5 text-xs text-[#f5f5fa]/80">{announcement.content}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 rounded-lg bg-[#0b0b14]/35 px-2.5 py-1 text-[11px] text-foreground">
              <Users2 className="h-3.5 w-3.5" /> {data.communities.length} communautés
            </span>
          </div>
        </GlassCard>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionTitle>Communautés populaires</SectionTitle>
          <button
            type="button"
            onClick={() => router.onTab('community')}
            className="text-xs font-medium text-[#b7a6ff]"
          >
            Tout voir
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {data.communities.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune communauté pour le moment.</p>
          ) : (
            data.communities.map((c) => {
              const slug = c.game?.slug
              const joined = c.game ? data.myCommunityGameIds.includes(c.game.id) : false
              return (
                <GlassCard key={c.id} className="flex items-center gap-3 p-3">
                  <button
                    type="button"
                    onClick={() => slug && router.navigate('Community', { slug, name: c.name })}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <Badge3D badge={gameBadge(slug)} size={46} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-foreground">{c.name}</p>
                        {joined ? <MemberPill /> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{c.membersCount} membres</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                </GlassCard>
              )
            })
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>Tes jeux</SectionTitle>
        {data.games.length === 0 ? (
          <button
            type="button"
            onClick={() => router.onTab('games')}
            className="rounded-[20px] border border-dashed border-white/10 bg-white/5 p-4 text-center text-[13px] text-muted-foreground"
          >
            🎯 Ajoute tes jeux favoris pour personnaliser ton accueil
          </button>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {data.games.map((g) => (
              <GlassCard key={g.id} className="flex w-44 shrink-0 flex-col gap-2 p-3">
                <button
                  type="button"
                  onClick={() => router.navigate('GameDetail', { slug: g.slug })}
                  className="flex flex-col gap-2 text-left"
                >
                  <Badge3D badge={gameBadge(g.slug)} size={44} />
                  <p className="font-semibold text-foreground">{g.name}</p>
                  <p className="text-[11px] text-muted-foreground">{g.slug}</p>
                </button>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      {data.events.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <SectionTitle>Événements à venir</SectionTitle>
            <button
              type="button"
              onClick={() => router.navigate('Search', undefined)}
              className="text-xs font-medium text-[#b7a6ff]"
            >
              Tout voir
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {data.events.slice(0, 3).map((e) => (
              <GlassCard key={e.id} className="flex items-center gap-3 p-3">
                <button
                  type="button"
                  onClick={() => router.navigate('EventDetail', { eventId: e.id })}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.game?.name ?? e.location}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </GlassCard>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
