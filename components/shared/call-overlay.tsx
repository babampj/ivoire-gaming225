'use client'
import { useEffect } from 'react';
import { useApp } from '@/lib/stores/app';
import { Avatar } from './avatar';
import { getSocket, sendCallAccept, sendCallDecline, sendCallEnd } from '@/lib/socket';

/** Gère les appels vocaux entrants et sortants (signalling Socket.IO). */
export function CallOverlay() {
  const activeCall = useApp((s) => s.activeCall);
  const setActiveCall = useApp((s) => s.setActiveCall);

  useEffect(() => {
    if (!activeCall) return;
    const socket = getSocket();

    const onEnded = (p: { callId: string }) => {
      if (p.callId === activeCall.callId) setActiveCall(null);
    };
    const onDeclined = (p: { callId: string }) => {
      if (p.callId === activeCall.callId) setActiveCall(null);
    };

    socket?.on('call:ended', onEnded);
    socket?.on('call:declined', onDeclined);
    return () => {
      socket?.off('call:ended', onEnded);
      socket?.off('call:declined', onDeclined);
    };
  }, [activeCall, setActiveCall]);

  if (!activeCall) return null;

  const incoming = activeCall.mode === 'incoming';

  const accept = () => {
    sendCallAccept(activeCall.peerId, activeCall.callId);
    setActiveCall(null);
  };
  const decline = () => {
    if (incoming) sendCallDecline(activeCall.peerId, activeCall.callId);
    else sendCallEnd(activeCall.peerId, activeCall.callId);
    setActiveCall(null);
  };

  return (
    <div className="absolute inset-0 z-[900] flex items-center justify-center bg-[rgba(5,5,12,0.95)]">
      <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
        <Avatar uri={null} name={activeCall.peerName} size={84} />
        <p className="text-2xl font-bold text-[#f5f5fa]">{activeCall.peerName}</p>
        <p className="text-sm text-muted-foreground">
          {incoming ? 'Appel vocal entrant…' : 'Appel vocal en cours…'}
        </p>
        <p className="max-w-[280px] text-xs leading-4 text-[#62627a]">
          {incoming
            ? '🔊 Les médias (LiveKit) s\'activeront si le serveur vocal est configuré.'
            : ''}
        </p>
        <div className="mt-4 flex items-center gap-7">
          {incoming ? (
            <button
              type="button"
              onClick={accept}
              className="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-[#1fa35b] text-[22px] font-extrabold text-white"
              aria-label="Accepter"
            >
              📞
            </button>
          ) : null}
          <button
            type="button"
            onClick={decline}
            className="flex h-[66px] min-w-[66px] items-center justify-center rounded-full bg-[#ef4444] px-4 text-[22px] font-extrabold text-white"
            aria-label="Raccrocher"
          >
            {incoming ? '✕' : 'End'}
          </button>
        </div>
      </div>
    </div>
  );
}
