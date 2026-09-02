'use client'
import { MessagesSquare, Radio, CalendarDays } from 'lucide-react';
import { Badge3D } from '@/components/ig-primitives';
import { GlassCard } from './glass-card';
import { gameBadge } from '@/lib/data';
import type { Game } from '@/lib/types';

export function GameCard({
  game,
  onPress,
  trailing,
}: {
  game: Game;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <GlassCard onPress={onPress} className="mb-2.5 flex items-center gap-3">
      <Badge3D badge={gameBadge(game.slug)} size={50} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-[#f5f5fa]">{game.name}</p>
        {game.description ? (
          <p className="truncate text-[11px] text-muted-foreground">{game.description}</p>
        ) : null}
        {game._count ? (
          <div className="mt-1.5 flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MessagesSquare className="h-3.5 w-3.5" /> {game._count.forums}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Radio className="h-3.5 w-3.5" /> {game._count.voiceRooms}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" /> {game._count.events}
            </span>
          </div>
        ) : null}
      </div>
      {trailing}
    </GlassCard>
  );
}
