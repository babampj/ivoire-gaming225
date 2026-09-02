'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, getErrorMessage } from '@/lib/services';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/lib/stores/auth';
import { Avatar } from '@/components/shared/avatar';
import { Button } from '@/components/shared/button';
import { Loading, Screen } from '@/components/shared/screen';
import { timeAgo } from '@/lib/format';
import type { ForumDetail } from '@/lib/types';

interface Post {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; username: string; avatar: string | null; status?: string };
  likesCount: number;
  likedByMe: boolean;
}

export function ForumDetailScreen({ id }: { id: string }) {
  const me = useAuth((s) => s.user);
  const [forum, setForum] = useState<ForumDetail | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/forums/${id}`);
      setForum(res.data.data);
      setPosts(res.data.data.posts ?? []);
    } catch (e) {
      console.warn(getErrorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    void load();
    const socket = getSocket();
    const onReply = (post: Post) => {
      setPosts((prev) => (prev.some((p) => p.id === post.id) ? prev : [...prev, post]));
    };
    socket?.on('forum:reply', onReply);
    socket?.emit('forum:join', { forumId: id });
    return () => {
      socket?.off('forum:reply', onReply);
      socket?.emit('forum:leave', { forumId: id });
    };
  }, [id, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [posts]);

  const submit = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    try {
      const res = await api.post(`/forums/${id}/posts`, { content });
      setPosts((prev) => [...prev, res.data.data]);
    } catch (e) {
      setText(content);
      console.warn(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const like = async (postId: string) => {
    try {
      const res = await api.post(`/forums/posts/${postId}/like`);
      const liked = res.data.data.liked;
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likedByMe: liked, likesCount: p.likesCount + (liked ? 1 : -1) } : p)),
      );
    } catch {
      // silencieux
    }
  };

  if (!forum) return <Loading label="Chargement de la discussion…" />;

  const footer = (
    <div className="flex items-end gap-2 border-t border-white/10 bg-[rgba(30,28,52,0.62)] p-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder={me ? 'Écrire une réponse…' : 'Répondre'}
        className="max-h-[100px] flex-1 rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] px-4 py-2.5 text-sm text-[#f5f5fa] outline-none placeholder:text-[#62627a]"
      />
      <div className="w-14">
        <Button title="➤" small onPress={() => void submit()} disabled={!text.trim()} />
      </div>
    </div>
  );

  return (
    <Screen back title={forum.title} footer={footer} scroll={false}>
      <div className="flex flex-col px-4 pb-4">
        <div className="flex items-center gap-2">
          <Avatar uri={forum.author.avatar} name={forum.author.username} size={40} />
          <div>
            <p className="text-sm font-bold text-[#f5f5fa]">{forum.author.username}</p>
            <p className="text-xs text-[#8e8e9e]">{timeAgo(forum.createdAt)}</p>
          </div>
        </div>
        <h2 className="mt-3 font-display text-xl font-black text-[#f5f5fa]">{forum.title}</h2>
        <p className="mt-2 text-sm leading-[22px] text-muted-foreground">{forum.content}</p>

        <p className="my-4 text-xs uppercase tracking-wide text-[#8e8e9e]">
          {posts.length} réponse{posts.length > 1 ? 's' : ''}
        </p>

        <div className="flex-1 overflow-y-auto">
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Soyez la première réponse !</p>
          ) : (
            posts.map((p) => (
              <div
                key={p.id}
                className="mb-2 flex gap-2 rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] p-3"
              >
                <Avatar uri={p.author.avatar} name={p.author.username} size={30} />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-bold text-[#f5f5fa]">{p.author.username}</p>
                    <p className="text-xs text-[#8e8e9e]">{timeAgo(p.createdAt)}</p>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{p.content}</p>
                  <button
                    type="button"
                    onClick={() => void like(p.id)}
                    className={`mt-2 self-start text-xs ${p.likedByMe ? 'text-[#ef4444]' : 'text-[#8e8e9e]'}`}
                  >
                    {p.likedByMe ? '❤️' : '🤍'} {p.likesCount}
                  </button>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </Screen>
  );
}
