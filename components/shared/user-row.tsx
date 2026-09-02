'use client'
import { Avatar, presenceColor } from './avatar';
import type { UserCard } from '@/lib/types';

export function UserRow({
  user,
  subtitle,
  onPress,
  actions,
}: {
  user: UserCard;
  subtitle?: string;
  onPress?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="mb-1.5 flex w-full items-center gap-3 rounded-[20px] border border-white/10 bg-[rgba(30,28,52,0.62)] p-3 text-left"
    >
      <Avatar
        uri={user.avatar}
        name={user.username}
        size={46}
        showPresence
        online={user.status === 'ONLINE'}
      />
      <div className="flex-1">
        <p className="text-base font-bold text-[#f5f5fa]">{user.username}</p>
        <p style={{ color: presenceColor(user.status) }} className="mt-0.5 text-xs">
          {subtitle ??
            (user.status === 'ONLINE'
              ? 'En ligne'
              : user.status === 'IN_GAME'
                ? 'En jeu'
                : 'Hors ligne')}
        </p>
      </div>
      {actions}
    </button>
  );
}
