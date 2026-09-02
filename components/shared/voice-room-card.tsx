'use client'
import { Avatar } from './avatar';
import type { Room } from '@/lib/types';

export function VoiceRoomCard({ room, onPress }: { room: Room; onPress?: () => void }) {
  const locked = room.isPrivate;
  return (
    <button
      type="button"
      onClick={onPress}
      className="mb-2.5 flex w-full items-center gap-3 rounded-[20px] border border-white/10 bg-[rgba(30,28,52,0.62)] p-3 text-left"
    >
      <div
        className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-lg"
        style={{ backgroundColor: locked ? 'rgba(139,92,246,0.18)' : 'rgba(34,197,94,0.15)' }}
      >
        {locked ? '🔒' : '🔊'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-bold text-[#f5f5fa]">{room.name}</p>
          {room.memberCount > 0 ? (
            <span className="min-w-[20px] rounded-full bg-[rgba(42,38,66,0.75)] px-2 py-0.5 text-center text-xs font-bold text-muted-foreground">
              {room.memberCount}
            </span>
          ) : null}
        </div>
        {room.game?.name ? (
          <p className="mt-0.5 text-xs text-[#62627a]">{room.game.name}</p>
        ) : null}
        <div className="mt-1.5 flex items-center">
          {room.members.slice(0, 3).map((m) => (
            <div key={m.id} className="-mr-1.5">
              <Avatar uri={m.avatar} name={m.username} size={22} showPresence online={m.status === 'ONLINE'} />
            </div>
          ))}
          {room.members.length > 3 ? (
            <span className="ml-2 text-xs text-muted-foreground">+{room.members.length - 3}</span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
