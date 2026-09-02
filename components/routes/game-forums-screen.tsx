'use client'
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from '@/lib/router';
import { api, getErrorMessage } from '@/lib/services';
import { Screen, Loading } from '@/components/shared/screen';
import { EmptyState } from '@/components/shared/empty-state';
import { ForumCard } from '@/components/shared/forum-card';
import { Button } from '@/components/shared/button';
import { SearchBar } from '@/components/shared/search-bar';
import type { ForumItem } from '@/lib/types';

export function GameForumsScreen({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const [forums, setForums] = useState<ForumItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/forums/game/${slug}?sort=recent&limit=50`);
      setForums(res.data.data.items ?? []);
    } catch (e) {
      console.warn(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen title={`Discussions ${name}`} back>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Chercher dans les discussions…" />
      <div className="mb-3">
        <Button
          title="➕ Créer une discussion"
          onPress={() => router.navigate('CreateForum', { slug, name })}
        />
      </div>
      {loading ? <Loading label="Chargement…" /> : null}
      {!loading && forums.length === 0 ? (
        <EmptyState emoji="💬" title="Aucune discussion" subtitle="Lance la conversation dans cette communauté !" />
      ) : (
        forums
          .filter((f) => f.title.toLowerCase().includes(query.trim().toLowerCase()))
          .map((f) => (
            <ForumCard
              key={f.id}
              forum={f}
              onPress={() => router.navigate('ForumDetail', { id: f.id })}
            />
          ))
      )}
    </Screen>
  );
}
