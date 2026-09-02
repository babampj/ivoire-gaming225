'use client'
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from '@/lib/router';
import { api, getErrorMessage } from '@/lib/services';
import { useAuth } from '@/lib/stores/auth';
import { useApp } from '@/lib/stores/app';
import { Loading, Screen } from '@/components/shared/screen';
import { EmptyState } from '@/components/shared/empty-state';
import { EventCard } from '@/components/shared/event-card';
import { Avatar } from '@/components/shared/avatar';
import { Button } from '@/components/shared/button';
import { Badge3D } from '@/components/ig-primitives';
import { gameBadge } from '@/lib/data';
import type { Game, EventItem, ForumItem, UserCard } from '@/lib/types';

interface RawEvent {
  id: string;
  title: string;
  description?: string | null;
  location: string;
  startDate: string;
  endDate?: string | null;
  status: string;
  gameId?: string | null;
  organizer: UserCard;
  _count: { participants: number };
}

interface RawForum {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  author: UserCard;
  _count: { posts: number };
}

export function GameDetailScreen({ slug, game: initialGame }: { slug: string; game?: Game }) {
  const router = useRouter();
  const { user, updateFavorites } = useAuth();
  const showToast = useApp((s) => s.showToast);

  const [game, setGame] = useState<Game | null>(initialGame ?? null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [forums, setForums] = useState<ForumItem[]>([]);
  const [players, setPlayers] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(!initialGame);

  const load = useCallback(async () => {
    try {
      const [g, ev, fo, pl] = await Promise.all([
        game ? Promise.resolve(null) : api.get(`/games/${slug}`),
        api.get(`/games/${slug}/events`),
        api.get(`/games/${slug}/discussions`),
        api.get(`/games/${slug}/online-players`),
      ]);
      if (g) setGame(g.data.data);
      setEvents(
        (ev.data.data as RawEvent[]).map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          location: e.location,
          startDate: e.startDate,
          endDate: e.endDate,
          game: e.gameId ? undefined : null,
          organizer: e.organizer,
          participantsCount: e._count.participants,
          status: e.status,
        })),
      );
      setForums(
        (fo.data.data as RawForum[]).map((f) => ({
          id: f.id,
          title: f.title,
          content: f.content,
          pinned: f.pinned,
          createdAt: f.createdAt,
          author: f.author,
          repliesCount: f._count.posts,
          likesCount: 0,
        })),
      );
      setPlayers(pl.data.data ?? []);
    } catch (e) {
      showToast(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [slug, game, showToast]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const isFav = (user?.favorites ?? []).some((f) => f.slug === slug);

  const toggleFav = async () => {
    const current = user?.favorites ?? [];
    const next = isFav
      ? current.filter((f) => f.slug !== slug).map((f) => f.slug)
      : current.length >= 3
        ? (showToast('Maximum 3 jeux favoris.'), current.map((f) => f.slug))
        : [...current.map((f) => f.slug), slug];
    try {
      await updateFavorites(next);
    } catch (e) {
      showToast(getErrorMessage(e));
    }
  };

  if (loading && !game) return <Loading label="Chargement du jeu…" />;
  if (!game) return null;

  return (
    <Screen back>
      <div className="rounded-[20px] border border-white/10 bg-gradient-to-b from-[#241C45] to-[#0b0b14] p-4">
        <div className="flex items-center gap-3">
          <Badge3D badge={gameBadge(game.slug)} size={60} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-black text-[#f5f5fa]">{game.name}</h2>
            {game.icon ? <p className="text-4xl">{game.icon}</p> : null}
          </div>
        </div>
        {game.description ? (
          <p className="mt-3 text-sm leading-5 text-muted-foreground">{game.description}</p>
        ) : null}
        {game._count ? (
          <p className="mt-2 text-xs text-[#8e8e9e]">
            💬 {game._count.forums} discussions · 🔊 {game._count.voiceRooms} salons · 🗓️ {game._count.events} événements
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex items-stretch gap-3">
        <div className="flex-1">
          <Button
            title="💬 Chat du jeu"
            variant="primary"
            small
            onPress={() => router.navigate('GameChat', { slug, name: game.name })}
          />
        </div>
        <button
          type="button"
          onClick={() => void toggleFav()}
          className={`flex items-center justify-center rounded-2xl border px-4 ${
            isFav ? 'border-[#ff7a1a] bg-[rgba(255,184,0,0.12)]' : 'border-white/10 bg-[rgba(30,28,52,0.62)]'
          }`}
        >
          <span className="text-sm font-bold text-[#ff7a1a]">{isFav ? '★ Favori' : '☆ Favori'}</span>
        </button>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => router.navigate('GameForums', { slug, name: game.name })}
          className="mb-3 flex w-full items-center justify-between"
        >
          <h2 className="font-display text-lg font-bold text-[#f5f5fa]">💬 Discussions →</h2>
        </button>
        {forums.length === 0 ? (
          <EmptyState emoji="💬" title="Aucune discussion" subtitle="Sois la première voix de cette communauté !" />
        ) : (
          forums.slice(0, 3).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => router.navigate('ForumDetail', { id: f.id })}
              className="mb-2 w-full rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] p-3 text-left"
            >
              <p className="text-base font-bold text-[#f5f5fa]">{f.title}</p>
              <p className="mt-0.5 text-xs text-[#8e8e9e]">
                {f.author.username} · {f.repliesCount} réponses
              </p>
            </button>
          ))
        )}
        <div className="mt-2">
          <Button
            title="Créer une discussion"
            variant="outline"
            small
            onPress={() => router.navigate('CreateForum', { slug, name: game.name })}
          />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-lg font-bold text-[#f5f5fa]">🌍 Joueurs en ligne</h2>
        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground">Personne n'est en ligne sur ce jeu pour l'instant.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {players.map((p) => (
              <div key={p.id} className="flex w-16 flex-col items-center">
                <Avatar uri={p.avatar} name={p.username} size={40} showPresence online={p.status === 'ONLINE'} />
                <p className="mt-1 max-w-16 truncate text-xs text-muted-foreground">{p.username}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-lg font-bold text-[#f5f5fa]">🗓️ Événements</h2>
        {events.length === 0 ? (
          <EmptyState emoji="🗓️" title="Aucun événement à venir" />
        ) : (
          events.map((e) => (
            <EventCard key={e.id} event={e} onPress={() => router.navigate('EventDetail', { eventId: e.id })} />
          ))
        )}
      </div>
    </Screen>
  );
}
