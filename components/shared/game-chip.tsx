'use client'
import { cn } from '@/lib/utils';

export function GameChip({
  icon,
  name,
  selected,
  onPress,
  disabled,
}: {
  icon?: string | null;
  name: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className={cn(
        'mb-1.5 mr-1.5 inline-flex items-center gap-2 rounded-xl border px-3 py-3',
        selected
          ? 'border-[#7c5cfc] bg-[rgba(139,92,246,0.12)]'
          : 'border-white/10 bg-[rgba(30,28,52,0.62)]',
        disabled && 'opacity-50',
      )}
    >
      <span className="text-base">{icon ?? '🎮'}</span>
      <span className={cn('text-sm font-medium', selected ? 'text-[#f5f5fa]' : 'text-muted-foreground')}>
        {name}
      </span>
      {selected ? <span className="ml-0.5 font-bold text-[#7c5cfc]">✓</span> : null}
    </button>
  );
}
