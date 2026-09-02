'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, getErrorMessage } from '@/lib/services'
import { useApp } from '@/lib/stores/app'
import { useRouter } from '@/lib/router'
import { Screen } from '@/components/shared/screen'
import { SearchBar } from '@/components/shared/search-bar'
import { Avatar } from '@/components/shared/avatar'
import { GameCard } from '@/components/shared/game-card'
import { EmptyState } from '@/components/shared/empty-state'
import { timeAgo } from '@/lib/format'
import type { UserCard, Game } from '@/lib/types'

interface SearchForum {
  id: string
  title: string
  game?: { id: string; name: string; slug: string; icon: string | null } | null
  author?: { id: string; username: string; avatar: string | null } | null
  _count?: { posts: number }
}

interface SearchEvent {
  id: string
  title: string
  location: string
  _count?: { participants: number }
}

interface SearchGroup {
  id: string
  name: string
  isTeam: boolean
  owner?: { id: string; username: string; avatar: string | null } | null
}

interface SearchResult {
  users: UserCard[]
  games: Game[]
  forums: SearchForum[]
  events: SearchEvent[]
  groups: SearchGroup[]
}

const empty: SearchResult = { users: [], games: [], forums: [], events: [], groups: [] }

export function SearchScreen() {
  const showToast = useApp((s) => s.showToast)
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult>(empty)
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const hasSearched = useRef(false)

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearched(false)
      return
    }
    const t = setTimeout(() => {
      setSearching(true)
      api
        .get('/search', { params: { q: query.trim() } })
        .then((res) => setResult(res.data.data))
        .catch((e) => showToast(getErrorMessage(e)))
        .finally(() => {
          setSearching(false)
          setSearched(true)
          hasSearched.current = true
        })
    }, 400)
    return () => clearTimeout(t)
  }, [query, showToast])

  const total = result.users.length + result.games.length + result.forums.length + result.events.length + result.groups.length

  return (
    <Screen back title="Recherche">
      <SearchBar value={query} onChangeText={setQuery} placeholder="Jeux, joueurs, forums, événements, groupes…" />
      {searching ? <p className="mt-2 text-xs text-[#62627a]">Recherche en cours…</p> : null}
      {searched && !searching && query.trim().length >= 2 ? <p className="mt-2 text-xs text-[#62627a]">{total} résultat(s)</p> : null}

      {!searched && !searching ? (
        <EmptyState emoji="🔎" title="Rechercher" subtitle="Tape au moins 2 lettres pour lancer la recherche." />
      ) : null}

      {result.users.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Joueurs ({result.users.length})</p>
          {result.users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => router.navigate('UserDetail', { id: u.id })}
              className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] p-3 text-left"
            >
              <Avatar uri={u.avatar} name={u.username} size={40} showPresence online={u.status === 'ONLINE'} />
              <div className="flex-1">
                <p className="text-sm font-bold text-[#f5f5fa]">{u.username}</p>
                <p className="mt-0.5 text-xs text-[#62627a]">
                  {[u.city, u.bio?.slice(0, 40)].filter(Boolean).join(' · ') || (u.lastSeen ? `Vu ${timeAgo(u.lastSeen)}` : '')}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {result.games.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Jeux ({result.games.length})</p>
          {result.games.map((g) => (
            <GameCard key={g.id} game={g} onPress={() => router.navigate('GameDetail', { slug: g.slug })} />
          ))}
        </div>
      ) : null}

      {result.forums.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Forums ({result.forums.length})</p>
          {result.forums.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => router.navigate('ForumDetail', { id: f.id })}
              className="mb-2 w-full rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] p-3 text-left"
            >
              <p className="text-sm font-bold text-[#f5f5fa]">{f.title}</p>
              <p className="mt-0.5 text-xs text-[#62627a]">
                {f.game?.name ?? 'Discussion générale'} · {f.author?.username} · {f._count?.posts ?? 0} réponses
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {result.events.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Événements ({result.events.length})</p>
          {result.events.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => router.navigate('EventDetail', { eventId: e.id })}
              className="mb-2 w-full rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] p-3 text-left"
            >
              <p className="text-sm font-bold text-[#f5f5fa]">{e.title}</p>
              <p className="mt-0.5 text-xs text-[#62627a]">
                {e.location} · {e._count?.participants ?? 0} participant(s)
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {result.groups.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Groupes ({result.groups.length})</p>
          {result.groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() =>
                router.navigate('GroupChat', { group: { id: g.id, name: g.name, isTeam: g.isTeam, owner: g.owner ?? null } as never })
              }
              className="mb-2 w-full rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] p-3 text-left"
            >
              <p className="text-sm font-bold text-[#f5f5fa]">{g.name}</p>
              <p className="mt-0.5 text-xs text-[#62627a]">
                {g.owner?.username} · {g.isTeam ? 'Équipe' : 'Groupe'}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {searched && !searching && total === 0 ? (
        <EmptyState emoji="😕" title="Aucun résultat" subtitle={`Rien trouvé pour « ${query} ».`} />
      ) : null}
    </Screen>
  )
}
