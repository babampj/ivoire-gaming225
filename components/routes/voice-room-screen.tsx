'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, getErrorMessage } from '@/lib/services';
import { getSocket, joinVoiceSocket, leaveVoiceSocket } from '@/lib/socket';
import { useApp } from '@/lib/stores/app';
import { useAuth } from '@/lib/stores/auth';
import { useRouter } from '@/lib/router';
import { Avatar } from '@/components/shared/avatar';
import { Button } from '@/components/shared/button';
import { Loading, Screen } from '@/components/shared/screen';
import type { Room, UserCard } from '@/lib/types';

export function VoiceRoomScreen({
  room: initialRoom,
  livekit: initialLivekit,
}: {
  room: Room;
  livekit?: { room: string; token: string } | null;
}) {
  const router = useRouter();
  const me = useAuth((s) => s.user);
  const showToast = useApp((s) => s.showToast);
  const setActiveVoice = useApp((s) => s.setActiveVoice);

  const [room, setRoom] = useState<Room>(initialRoom);
  const [livekit, setLivekit] = useState<{ room: string; token: string } | null>(initialLivekit ?? null);
  const [micOn, setMicOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<UserCard[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const lk = useRef<{ disconnect: () => void } | null>(null);

  const roomId = initialRoom.id;

  const loadRoom = useCallback(async () => {
    try {
      const res = await api.get(`/voice/${roomId}`);
      setRoom(res.data.data);
    } catch (e) {
      showToast(getErrorMessage(e));
    }
  }, [roomId, showToast]);

  const join = useCallback(async () => {
    try {
      const res = await api.post(`/voice/${roomId}/join`);
      const data = res.data.data as { id: string; name: string; isPrivate: boolean; ownerId: string; isOwner: boolean; livekit: { room: string; token: string } | null };
      if (data.livekit) setLivekit(data.livekit);
      joinVoiceSocket(roomId);
    } catch (e) {
      showToast(getErrorMessage(e));
      router.goBack();
    } finally {
      setLoading(false);
    }
  }, [roomId, showToast, router]);

  useEffect(() => {
    void join();
    void loadRoom();

    const socket = getSocket();
    const onState = () => void loadRoom();
    const onKicked = (p: { roomId: string }) => {
      if (p.roomId === roomId) {
        showToast('Vous avez été retiré(e) du salon.');
        leaveVoiceSocket(roomId);
        router.goBack();
      }
    };
    const onClosed = (p: { roomId: string }) => {
      if (p.roomId === roomId) {
        showToast('Le salon a été fermé.');
        leaveVoiceSocket(roomId);
        router.goBack();
      }
    };
    socket?.on('voice:state', onState);
    socket?.on('voice:kicked', onKicked);
    socket?.on('voice:closed', onClosed);

    return () => {
      socket?.off('voice:state', onState);
      socket?.off('voice:kicked', onKicked);
      socket?.off('voice:closed', onClosed);
      lk.current?.disconnect();
      leaveVoiceSocket(roomId);
      setActiveVoice(null);
      void api.post(`/voice/${roomId}/leave`).catch(() => undefined);
    };
  }, [roomId, join, loadRoom, router, showToast, setActiveVoice]);

  useEffect(() => {
    if (!livekit?.token) return;
    let disposed = false;
    let handle: { disconnect: () => void } | null = null;
    (async () => {
      try {
        const mod = await import('livekit-client');
        const roomHandle = new mod.Room();
        handle = { disconnect: () => void roomHandle.disconnect() };
        if (disposed) {
          handle.disconnect();
          return;
        }
        lk.current = handle;
        await roomHandle.connect(livekit.room, livekit.token);
        if (disposed) {
          void roomHandle.disconnect();
          return;
        }
        setActiveVoice({ roomId, name: livekit.room, livekit });
        showToast('Connecté au salon vocal (LiveKit) 🔊');
      } catch {
        if (!disposed) showToast("Salon en mode simulation — configurez LiveKit pour l'audio.");
      }
    })();
    return () => {
      disposed = true;
      handle?.disconnect();
    };
  }, [livekit, roomId, setActiveVoice, showToast]);

  const leave = () => {
    router.goBack();
  };

  const togglePrivate = async () => {
    try {
      await api.patch(`/voice/${roomId}/access`, { isPrivate: !room.isPrivate });
      void loadRoom();
    } catch (e) {
      showToast(getErrorMessage(e));
    }
  };

  const kick = async (userId: string) => {
    try {
      await api.post(`/voice/${roomId}/kick`, { userId });
      void loadRoom();
    } catch (e) {
      showToast(getErrorMessage(e));
    }
  };

  const invite = async (userId: string) => {
    try {
      await api.post(`/voice/${roomId}/invite`, { userId });
      showToast('Invitation envoyée ✓');
    } catch (e) {
      showToast(getErrorMessage(e));
    }
  };

  const loadFriends = () => {
    api
      .get('/friends?limit=50')
      .then((res) => setFriends((res.data.data.items ?? []).map((x: { friend: UserCard }) => x.friend ?? x)))
      .catch(() => undefined);
  };

  if (loading) {
    return (
      <Screen back title={room.name}>
        <Loading label="Connexion au salon…" />
      </Screen>
    );
  }

  const members = room.members ?? [];
  const isOwner = room.isOwner ?? (room.owner?.id === me?.id);

  return (
    <Screen back title={room.name} scroll={false}>
      <div className="flex flex-1 flex-col px-4 pb-4">
        <div className="overflow-y-auto">
          <div className="mb-4 flex flex-col items-center">
            <p className="text-center text-2xl font-black text-[#f5f5fa]">{room.name}</p>
            <p className="mt-1 text-sm font-bold text-[#7c5cfc]">
              {room.isPrivate ? '🔒 Privé' : '🌍 Public'} · {members.length} membre{members.length > 1 ? 's' : ''}
            </p>
            {room.game?.name ? <p className="mt-1 text-xs text-[#8e8e9e]">🎮 {room.game.name}</p> : null}
            {room.description ? <p className="mt-2 text-center text-sm leading-5 text-[#8e8e9e]">{room.description}</p> : null}
          </div>

          <div className="mb-4 flex flex-col items-center rounded-3xl border border-white/10 bg-[rgba(30,28,52,0.62)] p-6">
            <div
              className={`flex h-[74px] w-[74px] items-center justify-center rounded-full ${micOn ? 'bg-[rgba(34,197,94,0.15)]' : 'bg-[rgba(239,68,68,0.15)]'}`}
            >
              <span className="text-[34px]">{micOn ? '🎙️' : '🔇'}</span>
            </div>
            <p className="mt-2 font-bold text-[#f5f5fa]">{micOn ? 'Micro actif' : 'Micro coupé'}</p>
            <p className="mt-1 text-xs text-[#8e8e9e]">
              {livekit?.token ? '🎧 Son réel (LiveKit)' : '🧪 Mode simulation — audio désactivé côté serveur'}
            </p>
            <button
              type="button"
              onClick={() => setMicOn((v) => !v)}
              className="mt-4 rounded-full bg-[rgba(42,38,66,0.75)] px-6 py-2.5 text-sm font-bold text-[#f5f5fa]"
            >
              {micOn ? 'Couper le micro' : 'Activer le micro'}
            </button>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <p className="text-lg font-bold text-[#f5f5fa]">Membres</p>
            {isOwner ? (
              <button type="button" onClick={() => void togglePrivate()} className="text-sm font-bold text-[#7c5cfc]">
                {room.isPrivate ? '🔓 Rendre public' : '🔒 Passer en privé'}
              </button>
            ) : null}
          </div>

          <div className="mb-4 flex flex-wrap gap-4">
            {members.map((m) => (
              <div key={m.id} className="flex w-[76px] flex-col items-center">
                <Avatar uri={m.avatar} name={m.username} size={52} showPresence online={m.status === 'ONLINE'} />
                <p className="mt-1 max-w-[76px] truncate text-center text-xs text-[#f5f5fa]">{m.username}</p>
                {m.id === room.owner?.id ? <p className="mt-0.5 text-xs font-bold text-[#ff7a1a]">Créeur</p> : null}
                {isOwner && m.id !== me?.id ? (
                  <button type="button" onClick={() => void kick(m.id)} className="mt-0.5 text-xs text-[#ef4444]">
                    Retirer
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {isOwner ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowInvite((v) => !v);
                  if (!showInvite) loadFriends();
                }}
                className="mb-3 w-full rounded-2xl border border-[#7c5cfc] bg-[rgba(139,92,246,0.12)] py-3 text-center text-sm font-bold text-[#7c5cfc]"
              >
                {showInvite ? 'Fermer' : '＋ Inviter des amis'}
              </button>
              {showInvite ? (
                <div className="mb-4">
                  {friends.length === 0 ? <p className="text-center text-sm text-[#8e8e9e]">Aucun ami à inviter.</p> : null}
                  {friends.map((f) => (
                    <div key={f.id} className="mb-2 flex items-center gap-2 rounded-xl bg-[rgba(30,28,52,0.62)] p-2">
                      <Avatar uri={f.avatar} name={f.username} size={34} />
                      <p className="flex-1 truncate text-sm font-medium text-[#f5f5fa]">{f.username}</p>
                      <button
                        type="button"
                        onClick={() => void invite(f.id)}
                        className="rounded-full bg-[#7c5cfc] px-4 py-1.5 text-xs font-bold text-white"
                      >
                        Inviter
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          <Button title="Quitter le salon" variant="danger" onPress={leave} />
        </div>
      </div>
    </Screen>
  );
}
