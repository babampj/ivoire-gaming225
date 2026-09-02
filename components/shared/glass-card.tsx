'use client'
import { cn } from '@/lib/utils';

export function GlassCard({
  children,
  className,
  padded = true,
  bordered = true,
  onPress,
}: {
  children?: React.ReactNode;
  className?: string;
  padded?: boolean;
  bordered?: boolean;
  onPress?: () => void;
}) {
  const inner = (
    <div
      className={cn(
        'rounded-[19px] bg-[rgba(30,28,52,0.55)]',
        padded && 'p-3.5',
        className,
      )}
    >
      {children}
    </div>
  );

  if (onPress) {
    return (
      <button type="button" onClick={onPress} className="block w-full text-left">
        {bordered ? (
          <div className="rounded-[20px] bg-gradient-to-br from-[rgba(255,122,26,0.65)] via-[rgba(124,92,252,0.55)] to-[rgba(255,255,255,0.06)] p-px shadow-[0_10px_18px_-10px_rgba(0,0,0,0.45)]">
            {inner}
          </div>
        ) : (
          inner
        )}
      </button>
    );
  }

  return bordered ? (
    <div className="rounded-[20px] bg-gradient-to-br from-[rgba(255,122,26,0.65)] via-[rgba(124,92,252,0.55)] to-[rgba(255,255,255,0.06)] p-px shadow-[0_10px_18px_-10px_rgba(0,0,0,0.45)]">
      {inner}
    </div>
  ) : (
    inner
  );
}
