'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, getErrorMessage } from '@/lib/services';
import { getSocket, joinGroupChat, leaveGroupChat } from '@/lib/socket';
import { useApp } from '@/lib/stores/app';
import { useAuth } from '@/lib/stores/auth';
import { MessageBubble } from '@/components/shared/message-bubble';
import { Avatar } from '@/components/shared/avatar';
import { Button } from '@/components/shared/button';
import { Loading, Screen } from '@/components/shared/screen';
import { formatTime } from '@/lib/format';
import type { GroupDetail } from '@/lib/types';

interface GroupMsg {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: { id: string; username: string; avatar: string | null; status?: string } | null;
}

export function GroupChatScreen({ group: initialGroup }: { group: GroupDetail }) {
  const me = useAuth((s) => s.user);
  const showToast = useApp((s) => s.showToast);
  const [group, setGroup] = useState<GroupDetail | null>(initialGroup);
  const [messages, setMessages] = useState<GroupMsg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [g, m] = await Promise.all([
        api.get(`/groups/${initialGroup.id}`),
        api.get(`/groups/${initialGroup.id}/messages?limit=100`),
      ]);
      setGroup(g.data.data);
      setMessages(m.data.data.items ?? []);
    } catch (e) {
      showToast(getErrorMessage(e));
    }
  }, [initialGroup.id, showToast]);

  useEffect(() => {
    void load();
    joinGroupChat(initialGroup.id);
    const socket = getSocket();
    const onNew = (msg: GroupMsg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };
    socket?.on('group-chat:new', onNew);
    return () => {
      leaveGroupChat(initialGroup.id);
      socket?.off('group-chat:new', onNew);
    };
  }, [initialGroup.id, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    try {
      await api.post(`/groups/${initialGroup.id}/messages`, { content });
    } catch (e) {
      setText(content);
      showToast(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const groupMembers = group?.members ?? [];

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
        placeholder="Message du groupe…"
        className="max-h-[100px] flex-1 rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] px-4 py-2.5 text-sm text-[#f5f5fa] outline-none placeholder:text-[#62627a]"
      />
      <div className="w-14">
        <Button title="➤" small onPress={() => void send()} disabled={!text.trim()} />
      </div>
    </div>
  );

  return (
    <Screen back title={group?.name ?? 'Groupe'} footer={footer} scroll={false}>
      {!group ? (
        <Loading label="Chargement du groupe…" />
      ) : (
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => setShowMembers((v) => !v)}
            className="flex items-center justify-between border-b border-white/10 bg-[rgba(30,28,52,0.62)] px-4 py-3 text-sm font-bold text-[#f5f5fa]"
          >
            <span>
              👥 {group.name} · {groupMembers.length} membre{groupMembers.length > 1 ? 's' : ''} {group.isTeam ? '⚔️' : ''}
            </span>
            <span className="text-[#8e8e9e]">{showMembers ? '▾' : '▸'}</span>
          </button>
          {showMembers ? (
            <div className="overflow-x-auto border-b border-white/10 bg-[rgba(30,28,52,0.62)] py-3">
              <div className="flex">
                {groupMembers.map((m) => (
                  <div key={m.id} className="mx-2 flex w-16 shrink-0 flex-col items-center">
                    <Avatar uri={m.avatar} name={m.username} size={40} showPresence online={m.status === 'ONLINE'} />
                    <p className="mt-0.5 max-w-[64px] truncate text-xs text-[#8e8e9e]">{m.username}</p>
                    {m.roleInGroup === 'OWNER' ? <span className="text-[10px]">🛡️</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-1 flex-col px-4 pb-4">
            <p className="mb-4 mt-3 text-center text-xs text-[#8e8e9e]">
              {group.description ?? 'Groupe privé'} · réservé aux membres
            </p>
            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="mt-16 text-center text-sm text-[#8e8e9e]">
                  Le groupe est calme… lancez la discussion !
                </p>
              ) : (
                messages.map((m) => (
                  <div key={m.id}>
                    {m.sender && m.sender.id !== me?.id ? (
                      <p className="mb-0.5 text-xs font-bold text-[#7c5cfc]">{m.sender.username}</p>
                    ) : null}
                    <MessageBubble
                      content={m.content}
                      fromMe={m.senderId === me?.id}
                      time={formatTime(m.createdAt)}
                    />
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
