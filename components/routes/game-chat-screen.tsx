'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, getErrorMessage } from '@/lib/services';
import { getSocket, joinGameChat, leaveGameChat } from '@/lib/socket';
import { useAuth } from '@/lib/stores/auth';
import { MessageBubble } from '@/components/shared/message-bubble';
import { Button } from '@/components/shared/button';
import { Avatar } from '@/components/shared/avatar';
import { Loading, Screen } from '@/components/shared/screen';
import { formatTime } from '@/lib/format';

interface ChatMsg {
  id: string;
  senderId: string;
  content: string;
  type: string;
  createdAt: string;
  sender?: { id: string; username: string; avatar: string | null; status?: string } | null;
}

export function GameChatScreen({ slug, name }: { slug: string; name: string }) {
  const me = useAuth((s) => s.user);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get(`/games/${slug}/chat?limit=50`);
      setMessages((res.data.data as ChatMsg[]).reverse());
    } catch (e) {
      console.warn(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadHistory();
    joinGameChat(slug);
    const socket = getSocket();
    const onMsg = (msg: ChatMsg) => {
      setMessages((prev) => [...prev, msg]);
    };
    socket?.on('chat:message', onMsg);
    return () => {
      leaveGameChat(slug);
      socket?.off('chat:message', onMsg);
    };
  }, [slug, loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    try {
      await api.post(`/games/${slug}/chat`, { content });
    } catch (e) {
      setText(content);
      console.warn(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const footer = (
    <div className="flex items-end gap-2 border-t border-white/10 bg-[rgba(30,28,52,0.62)] p-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void send();
          }
        }}
        placeholder={`Message dans ${name}…`}
        className="max-h-[100px] flex-1 rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] px-4 py-2.5 text-sm text-[#f5f5fa] outline-none placeholder:text-[#62627a]"
      />
      <div className="w-14">
        <Button title="➤" small onPress={() => void send()} disabled={!text.trim()} />
      </div>
    </div>
  );

  return (
    <Screen back title="Chat du jeu" subtitle={name} footer={footer} scroll={false}>
      {loading ? (
        <Loading label="Chargement du chat…" />
      ) : (
        <div className="flex flex-col px-4 pb-4">
          <p className="mb-4 text-center text-xs text-[#8e8e9e]">
            Chat public · {name} · les messages sont visibles par tous 🔊
          </p>
          <div className="flex-1 overflow-y-auto">
            {messages.map((m) => (
              <div key={m.id}>
                {!m.sender && (
                  <p className="mb-0.5 text-xs font-bold text-[#7c5cfc]">moi</p>
                )}
                {m.sender && m.sender.id !== me?.id ? (
                  <div className="mb-0.5 flex items-center gap-1">
                    <Avatar uri={m.sender.avatar} name={m.sender.username} size={20} />
                    <p className="text-xs font-bold text-[#7c5cfc]">{m.sender.username}</p>
                  </div>
                ) : null}
                <MessageBubble
                  content={m.content}
                  type={m.type}
                  imageUrl={undefined}
                  fromMe={m.senderId === me?.id}
                  time={formatTime(m.createdAt)}
                />
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </Screen>
  );
}
