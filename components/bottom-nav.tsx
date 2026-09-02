'use client'

import { Home, Gamepad2, MessageCircle, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabKey = 'home' | 'games' | 'messages' | 'community' | 'profile'

const tabs: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Accueil', icon: Home },
  { key: 'games', label: 'Jeux', icon: Gamepad2 },
  { key: 'messages', label: 'Messages', icon: MessageCircle },
  { key: 'community', label: 'Communauté', icon: Users },
  { key: 'profile', label: 'Profil', icon: User },
]

export function BottomNav({
  active,
  onChange,
}: {
  active: TabKey
  onChange: (t: TabKey) => void
}) {
  return (
    <nav className="glass glass-border absolute inset-x-3 bottom-3 z-20 rounded-3xl px-2 py-2">
      <ul className="flex items-center justify-between">
        {tabs.map(({ key, label, icon: Icon }) => {
          const isActive = active === key
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(key)}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex w-full flex-col items-center gap-1 rounded-2xl py-1.5"
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                    isActive ? 'bg-[#7c5cfc]/20 text-[#b7a6ff] glow-violet' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span
                  className={cn(
                    'text-[10px] font-medium',
                    isActive ? 'text-[#b7a6ff]' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-0.5 h-1 w-6 rounded-full bg-[#7c5cfc] glow-violet" />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
