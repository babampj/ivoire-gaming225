'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Star } from 'lucide-react'
import { Loading } from '@/components/shared/screen'
import { EmptyState } from '@/components/shared/empty-state'
import { api, getErrorMessage } from '@/lib/services'
import { useAuth } from '@/lib/stores/auth'
import { useApp } from '@/lib/stores/app'
import { useRouter } from '@/lib/router'
import { GameCard } from '@/components/shared/game-card'
import type { Game } from '@/lib/types'

export function GamesScreen() {
  const router = useRouter()
  const { user, updateFavorites } = useAuth()
  const showToast = useApp((s) => s.showToast)
  const [games, setGames] = useState<Game[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/games?limit=100')
      const items = res.data.data.items ?? res.data.data
      setGames(items)
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

  const favSlugs = useMemo(() => new Set((user?.favorites ?? []).map((f) => f.slug)), [user])

  const toggle = async (slug: string) => {
    const isFav = favSlugs.has(slug)
    const current = [...(user?.favorites ?? [])]
    let next: string[]
    if (isFav) {
      next = current.filter((f) => f.slug !== slug).map((f) => f.slug)
    } else {
      if (current.length >= 3) {
        showToast("Maximum 3 jeux favoris — retire-en un d'abord.")
        return
      }
      next = [...current.map((f) => f.slug), slug]
    }
    try {
      await updateFavorites(next)
    } catch (e) {
      showToast(getErrorMessage(e))
    }
  }

  const filtered = useMemo(
    () => games.filter((g) => g.name.toLowerCase().includes(query.trim().toLowerCase())),
    [games, query],
  )

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Jeux</h1>
        <p className="text-sm text-muted-foreground">Toute la communauté gaming ivoirienne</p>
      </header>

      <div className="glass glass-border flex items-center gap-2.5 rounded-2xl px-3.5 py-3">
        <Search className="h-4.5 w-4.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          placeholder="Rechercher un jeu…"
          aria-label="Rechercher un jeu"
        />
      </div>

      {loading ? <Loading label="Chargement des jeux…" /> : null}
      {error && !loading ? <p className="py-4 text-center text-sm text-[#ef4444]">{error}</p> : null}
      {!loading && filtered.length === 0 ? (
        <EmptyState emoji="🎮" title="Aucun jeu trouvé" subtitle="Essayez un autre mot-clé." />
      ) : (
        filtered.map((g) => (
          <GameCard
            key={g.id}
            game={{ ...g, isFavorite: favSlugs.has(g.slug) }}
            onPress={() => router.navigate('GameDetail', { slug: g.slug, game: g })}
            trailing={
              <button
                type="button"
                onClick={() => void toggle(g.slug)}
                aria-label={favSlugs.has(g.slug) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5"
                style={
                  favSlugs.has(g.slug)
                    ? { boxShadow: '0 0 8px rgba(232,195,107,0.6)' }
                    : undefined
                }
              >
                <Star
                  className={
                    favSlugs.has(g.slug)
                      ? 'h-5 w-5 fill-[#e8c36b] text-[#e8c36b]'
                      : 'h-5 w-5 text-muted-foreground'
                  }
                />
              </button>
            }
          />
        ))
      )}
    </div>
  )
}
