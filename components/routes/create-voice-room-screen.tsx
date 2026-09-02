'use client'
import React, { useEffect, useState } from 'react';
import { useRouter } from '@/lib/router';
import { Screen } from '@/components/shared/screen';
import { Button } from '@/components/shared/button';
import { Input } from '@/components/shared/input';
import { GameChip } from '@/components/shared/game-chip';
import { api, getErrorMessage } from '@/lib/services';
import { useApp } from '@/lib/stores/app';
import type { Game, Room } from '@/lib/types';

export function CreateVoiceRoomScreen({ slug, name }: { slug?: string; name?: string }) {
  const router = useRouter();
  const initialSlug = slug ?? null;
  const showToast = useApp((s) => s.showToast);
  const [roomName, setRoomName] = useState(name ?? '');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [gameSlug, setGameSlug] = useState<string | null>(initialSlug);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/games?limit=30')
      .then((res) => setGames(res.data.data.items ?? res.data.data))
      .catch(() => undefined);
  }, []);

  const submit = async () => {
    setError(null);
    if (roomName.trim().length < 2) {
      setError('Donnez un nom au salon (min. 2 caractères).');
      return;
    }
    setSending(true);
    try {
      const res = await api.post('/voice', {
        name: roomName.trim(),
        description: description.trim(),
        gameSlug: gameSlug ?? undefined,
        isPrivate,
      });
      const data: { room: Room; livekit: { room: string; token: string } | null } = res.data.data;
      router.goBack();
      router.navigate('VoiceRoom', { room: data.room, livekit: data.livekit });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen title="Nouveau salon vocal" back>
      <Input label="Nom du salon" placeholder="Ex : Ranked Abidjan – soir" value={roomName} onChange={(e) => setRoomName(e.target.value)} maxLength={60} />
      <Input label="Description (optionnel)" placeholder="Sujet, niveau…" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />

      <p className="mb-2 text-sm font-medium text-[#8e8e9e]">Jeu associé (optionnel)</p>
      <div className="mb-4 flex flex-wrap">
        {games.slice(0, 12).map((g) => (
          <GameChip
            key={g.id}
            icon={g.icon}
            name={g.name}
            selected={gameSlug === g.slug}
            onPress={() => setGameSlug(gameSlug === g.slug ? null : g.slug)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setIsPrivate((v) => !v)}
        className="mb-4 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] p-4"
      >
        <div className="flex-1 pr-4 text-left">
          <p className="font-bold text-[#f5f5fa]">{isPrivate ? '🔒 Salon privé' : '🌍 Salon public'}</p>
          <p className="mt-0.5 text-xs text-[#8e8e9e]">Privé = seuls les invités entrent.</p>
        </div>
        <div className={`h-[24px] w-[24px] rounded-full border-2 border-[#7c5cfc] ${isPrivate ? 'bg-[#7c5cfc]' : ''}`} />
      </button>

      {error ? <p className="mb-4 text-center text-sm text-[#ef4444]">{error}</p> : null}
      <Button title="Créer le salon" onPress={submit} loading={sending} />
    </Screen>
  );
}
