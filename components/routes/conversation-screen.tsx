'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, getErrorMessage } from '@/lib/services';
import { getSocket, joinDm, leaveDm, sendTyping } from '@/lib/socket';
import { useApp } from '@/lib/stores/app';
import { useAuth } from '@/lib/stores/auth';
import { MessageBubble } from '@/components/shared/message-bubble';
import { Button } from '@/components/shared/button';
import { Avatar } from '@/components/shared/avatar';
import { Loading, Screen } from '@/components/shared/screen';
import { formatTime } from '@/lib/format';
import type { Message, UserCard } from '@/lib/types';

export function ConversationScreen({ user }: { user: UserCard }) {
  const me = useAuth((s) => s.user);
  const showToast = useApp((s) => s.showToast);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/messages/${user.id}?limit=100`);
      setMessages(res.data.data.items ?? []);
    } catch (e) {
      showToast(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user.id, showToast]);

  useEffect(() => {
    void load();
    void api.post(`/messages/${user.id}/read`).catch(() => undefined);
    joinDm(user.id);
    const socket = getSocket();
    const onDm = (msg: Message) => {
      if (msg.senderId === user.id || msg.receiverId === user.id) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        void api.post(`/messages/${user.id}/read`).catch(() => undefined);
      }
    };
    const onTyping = (payload: { from: string }) => {
      if (payload.from === user.id) {
        setTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 1800);
      }
    };
    socket?.on('dm:message', onDm);
    socket?.on('dm:typing', onTyping);
    return () => {
      leaveDm(user.id);
      socket?.off('dm:message', onDm);
      socket?.off('dm:typing', onTyping);
    };
  }, [load, user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    try {
      await api.post(`/messages/${user.id}`, { content });
    } catch (e) {
      setText(content);
      showToast(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const footer = (
    <div className="flex items-end gap-2 border-t border-white/10 bg-[rgba(30,28,52,0.62)] p-2">
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          sendTyping(user.id);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void send();
          }
        }}
        placeholder={`Message à ${user.username}…`}
        className="max-h-[100px] flex-1 rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] px-4 py-2.5 text-sm text-[#f5f5fa] outline-none placeholder:text-[#62627a]"
      />
      <div className="w-14">
        <Button title="➤" small onPress={() => void send()} disabled={!text.trim()} />
      </div>
    </div>
  );

  return (
    <Screen back title={user.username} footer={footer} scroll={false}>
      {loading ? (
        <Loading label="Chargement…" />
      ) : (
        <div className="flex flex-col px-4 pb-4">
          <div className="flex-1 overflow-y-auto py-2">
            {messages.length === 0 ? (
              <p className="mt-16 text-center text-sm text-[#8e8e9e]">
                C'est le début de votre conversation. 👋
              </p>
            ) : (
              messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  content={m.content}
                  type={m.type}
                  imageUrl={m.imageUrl}
                  fromMe={m.senderId === me?.id}
                  time={formatTime(m.createdAt)}
                  read={Boolean(m.readAt)}
                />
              ))
            )}
            {typing ? (
              <div className="mt-2 flex items-center gap-1.5">
                <Avatar uri={user.avatar} name={user.username} size={20} />
                <p className="text-xs italic text-[#7c5cfc]">{user.username} écrit…</p>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </Screen>
  );
}
