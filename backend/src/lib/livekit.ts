import { AccessToken } from 'livekit-server-sdk';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';

/**
 * LiveKit (SFU WebRTC) — la voix et les appels passent par LiveKit.
 * Le backend ne fait que produire des tokens d'accès à une room.
 * Sans LIVEKIT_URL configurée, on est en "mode simulation" : les salons
 * vocaux fonctionnent (membres, public/privé, temps réel) sans flux audio réel.
 */
export function livekitEnabled(): boolean {
  return Boolean(env.livekit.url && env.livekit.apiKey && env.livekit.apiSecret);
}

export function livekitRoomName(): string {
  return `ig_${nanoid(8)}`;
}

export async function createVoiceToken(identity: string, roomName: string, canAdmin: boolean): Promise<string | null> {
  if (!livekitEnabled()) return null;
  const at = new AccessToken(env.livekit.apiKey, env.livekit.apiSecret, {
    identity,
    ttl: '2h',
  });
  at.addGrant({ room: roomName, roomJoin: true, canPublish: true, canSubscribe: true, roomAdmin: canAdmin });
  return at.toJwt();
}

export async function createCallToken(identity: string, roomName: string): Promise<string | null> {
  if (!livekitEnabled()) return null;
  const at = new AccessToken(env.livekit.apiKey, env.livekit.apiSecret, {
    identity,
    ttl: '2h',
  });
  at.addGrant({ room: roomName, roomJoin: true, canPublish: true, canSubscribe: true });
  return at.toJwt();
}