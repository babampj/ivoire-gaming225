'use client'
import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '@/lib/services';
import { useAuth } from '@/lib/stores/auth';
import { useRouter } from '@/lib/router';
import { Button } from '@/components/shared/button';
import { GameChip } from '@/components/shared/game-chip';
import { Loading } from '@/components/shared/screen';
import type { Game } from '@/lib/types';

const MAX = 3;

export function OnboardingScreen() {
  const router = useRouter();
  const { updateFavorites } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/games?limit=30')
      .then((res) => setGames(res.data.data.items ?? res.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= MAX ? prev : [...prev, slug],
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateFavorites(selected);
      router.reset();
      router.onTab('home');
    } catch (e) {
      setError(getErrorMessage(e));
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="onboard-scroll flex-1 overflow-y-auto no-scrollbar px-6 pb-8">
        <div className="my-6 flex flex-col items-center">
          <div className="text-5xl">🎯</div>
          <h1 className="mt-3 text-2xl font-black text-[#f5f5fa]">Tes jeux favoris</h1>
          <p className="mt-1 max-w-[320px] text-center text-sm leading-5 text-muted-foreground">
            Choisis jusqu'à {MAX} jeux. Ils apparaîtront sur ton profil et tu retrouveras leur communauté
            ici.
          </p>
        </div>

        {loading ? <Loading label="Chargement des jeux…" /> : null}
        {error ? <p className="mb-3 text-center text-sm text-[#ef4444]">{error}</p> : null}

        <div className="flex flex-wrap justify-center">
          {games.map((g) => (
            <GameChip
              key={g.id}
              icon={g.icon}
              name={g.name}
              selected={selected.includes(g.slug)}
              onPress={() => toggle(g.slug)}
              disabled={!selected.includes(g.slug) && selected.length >= MAX}
            />
          ))}
        </div>
      </div>
      <div className="gap-2 border-t border-white/10 bg-[rgba(30,28,52,0.62)] p-4">
        <p className="mb-2 text-center text-sm font-medium text-muted-foreground">
          {selected.length}/{MAX} sélectionné{selected.length > 1 ? 's' : ''}
        </p>
        <Button
          title={
            selected.length > 0
              ? `Commencer avec ${selected.length} jeu${selected.length > 1 ? 'x' : ''}`
              : "Passer pour l'instant"
          }
          onPress={save}
          loading={saving}
        />
      </div>
    </div>
  );
}
