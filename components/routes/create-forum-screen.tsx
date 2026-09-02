'use client'
import React, { useState } from 'react';
import { useRouter } from '@/lib/router';
import { Screen } from '@/components/shared/screen';
import { Button } from '@/components/shared/button';
import { api, getErrorMessage } from '@/lib/services';
import { useApp } from '@/lib/stores/app';

export function CreateForumScreen({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const showToast = useApp((s) => s.showToast);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (title.trim().length < 4) {
      setError('Le titre doit contenir au moins 4 caractères.');
      return;
    }
    setSending(true);
    try {
      const res = await api.post(`/forums/game/${slug}`, { title: title.trim(), content: content.trim() });
      showToast('Discussion créée ✓');
      router.goBack();
      router.navigate('ForumDetail', { id: res.data.data.id });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen title="Nouvelle discussion" subtitle={name} back scroll={false}>
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-[#8e8e9e]">Titre</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Comment rejoindre un team pour FIFA ?"
          maxLength={120}
          className="w-full rounded-xl border border-white/10 bg-[rgba(30,28,52,0.62)] px-4 py-3 text-base text-[#f5f5fa] outline-none placeholder:text-[#62627a]"
        />
      </div>
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-[#8e8e9e]">Contenu</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Décris ta question, indique ton niveau, ta ville…"
          maxLength={5000}
          className="min-h-[140px] w-full resize-none rounded-xl border border-white/10 bg-[rgba(30,28,52,0.62)] px-4 py-3 text-base text-[#f5f5fa] outline-none placeholder:text-[#62627a]"
        />
      </div>
      {error ? <p className="mb-4 text-center text-sm text-[#ef4444]">{error}</p> : null}
      <Button title="Publier" onPress={submit} loading={sending} />
    </Screen>
  );
}
