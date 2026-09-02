import Image from 'next/image'
import { cn } from '@/lib/utils'
import { badgeSrc, type BadgeKey } from '@/lib/data'

export function GlassCard({
  className,
  children,
  bordered = true,
}: {
  className?: string
  children: React.ReactNode
  bordered?: boolean
}) {
  return (
    <div className={cn('glass', bordered && 'glass-border', 'rounded-2xl', className)}>{children}</div>
  )
}

export function Badge3D({
  badge,
  size = 52,
  className,
  tile = true,
}: {
  badge: BadgeKey
  size?: number
  className?: string
  tile?: boolean
}) {
  return (
    <div
      className={cn(
        'float-badge shrink-0 select-none overflow-hidden',
        tile && 'rounded-2xl ring-1 ring-white/10',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: tile
          ? 'radial-gradient(70% 70% at 50% 40%, #15122a 0%, #0b0b14 100%)'
          : undefined,
      }}
    >
      <Image
        src={badgeSrc[badge] || '/placeholder.svg'}
        alt=""
        width={size}
        height={size}
        className="h-full w-full scale-[1.04] object-cover"
        priority={false}
      />
    </div>
  )
}

export function MemberPill() {
  return (
    <span className="glow-green inline-flex items-center gap-1 rounded-full bg-[#1fa35b]/15 px-2.5 py-1 text-[11px] font-semibold text-[#3fe08a]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#3fe08a]" />
      Membre
    </span>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[15px] font-bold tracking-tight text-foreground">{children}</h2>
  )
}
