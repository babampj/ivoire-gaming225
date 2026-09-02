'use client'
import { initials } from '@/lib/format';

export function presenceColor(status?: string): string {
  if (status === 'ONLINE') return '#1fa35b';
  if (status === 'IN_GAME') return '#ff7a1a';
  return '#7a7a8a';
}

export function Avatar({
  uri,
  name,
  size = 44,
  online,
  showPresence = false,
}: {
  uri?: string | null;
  name: string;
  size?: number;
  online?: boolean;
  showPresence?: boolean;
}) {
  const inner = (
    <div
      className="flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, rgba(124,92,252,0.3), rgba(30,28,52,0.8))',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {uri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={uri}
          alt=""
          style={{ width: size, height: size, objectFit: 'cover' }}
        />
      ) : (
        <span
          style={{ fontSize: Math.max(10, size * 0.38), fontWeight: 700 }}
          className="text-[#8e8e9e]"
        >
          {initials(name)}
        </span>
      )}
    </div>
  );

  if (!showPresence || online === undefined) return inner;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {inner}
      <span
        className="absolute rounded-full border-2 border-[#0b0b14]"
        style={{
          width: Math.max(10, size * 0.28),
          height: Math.max(10, size * 0.28),
          backgroundColor: online ? '#1fa35b' : '#7a7a8a',
          right: -size * 0.02,
          bottom: -size * 0.02,
        }}
      />
    </div>
  );
}
