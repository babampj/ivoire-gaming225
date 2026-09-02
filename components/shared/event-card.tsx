'use client'
import { eventStatusLabel, formatDateTime } from '@/lib/format';
import type { EventItem } from '@/lib/types';

const statusColor: Record<string, string> = {
  UPCOMING: '#7c5cfc',
  ONGOING: '#1fa35b',
  COMPLETED: '#7a7a8a',
  CANCELLED: '#ef4444',
};

export function EventCard({ event, onPress }: { event: EventItem; onPress?: () => void }) {
  const color = statusColor[event.status ?? 'UPCOMING'];
  return (
    <button
      type="button"
      onClick={onPress}
      className="mb-3 w-full rounded-[20px] border border-white/10 bg-[rgba(30,28,52,0.62)] p-4 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex-1 text-base font-bold leading-snug text-[#f5f5fa]">{event.title}</h3>
        <span
          className="shrink-0 self-start rounded-full px-2 py-0.5 text-xs font-bold"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {eventStatusLabel(event.status)}
        </span>
      </div>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">
        📅 {formatDateTime(event.startDate)}
        {event.location ? (
          <>
            <br />📍 {event.location}
          </>
        ) : (
          ''
        )}
      </p>
      {event.game?.name ? <p className="mt-0.5 text-sm text-[#7c5cfc]">🎮 {event.game.name}</p> : null}
      <p className="mt-0.5 text-xs text-[#62627a]">
        {event.participantsCount ?? 0} participant{(event.participantsCount ?? 0) > 1 ? 's' : ''}
        {event.isParticipating ? ' · Vous participez ✓' : ''}
      </p>
    </button>
  );
}
