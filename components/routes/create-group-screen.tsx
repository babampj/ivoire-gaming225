'use client'
import React, { useEffect, useState } from 'react';
import { useRouter } from '@/lib/router';
import { Screen } from '@/components/shared/screen';
import { Button } from '@/components/shared/button';
import { Input } from '@/components/shared/input';
import { UserRow } from '@/components/shared/user-row';
import { SectionHeader } from '@/components/shared/section-header';
import { api, getErrorMessage } from '@/lib/services';
import { useApp } from '@/lib/stores/app';
import type { UserCard } from '@/lib/types';

export function CreateGroupScreen() {
  const router = useRouter();
  const showToast = useApp((s) => s.showToast);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isTeam, setIsTeam] = useState(false);
  const [friends, setFriends] = useState<UserCard[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/friends?limit=50')
      .then((res) => setFriends((res.data.data.items ?? []).map((x: { friend: UserCard }) => x.friend ?? x)))
      .catch(() => undefined);
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError('Donnez un nom au groupe (min. 2 caractères).');
      return;
    }
    setSending(true);
    try {
      const res = await api.post('/groups', {
        name: name.trim(),
        description: description.trim(),
        isTeam,
        friendIds: selected,
      });
      const created = await api.get(`/groups/${res.data.data.id}`);
      showToast(isTeam ? 'Team créée ✓' : 'Groupe créé ✓');
      router.goBack();
      router.navigate('GroupChat', { group: created.data.data });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen title="Nouveau groupe" back>
      <Input label="Nom" placeholder="Ex : Team Abidjan Esport" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      <Input label="Description (optionnel)" placeholder="Objectifs, disponibilités…" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />

      <button
        type="button"
        onClick={() => setIsTeam((v) => !v)}
        className="mb-4 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] p-4"
      >
        <div className="text-left">
          <p className="font-bold text-[#f5f5fa]">
            {isTeam ? '⚔️ Groupe de team (esport)' : "👥 Groupe d'amis"}
          </p>
          <p className="mt-0.5 text-xs text-[#8e8e9e]">Les teams sont utilisés pour la compétition.</p>
        </div>
        <div className={`relative h-[26px] w-[46px] rounded-full p-0.5 transition-colors ${isTeam ? 'bg-[#7c5cfc]' : 'bg-[rgba(42,38,66,0.75)]'}`}>
          <div
            className={`h-[22px] w-[22px] rounded-full bg-white transition-all ${isTeam ? 'ml-[22px]' : 'ml-0'}`}
          />
        </div>
      </button>

      {friends.length > 0 ? (
        <>
          <div className="mb-2" />
          <SectionHeader title={`Inviter des amis (${selected.length})`} />
          {friends.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              onPress={() => toggle(u.id)}
              actions={
                <button
                  type="button"
                  onClick={() => toggle(u.id)}
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-md border-2 border-[#7c5cfc]"
                >
                  <span className="font-black text-[#7c5cfc]">{selected.includes(u.id) ? '✓' : ''}</span>
                </button>
              }
            />
          ))}
        </>
      ) : null}

      {error ? <p className="mb-4 text-center text-sm text-[#ef4444]">{error}</p> : null}
      <Button title="Créer" onPress={submit} loading={sending} />
    </Screen>
  );
}
