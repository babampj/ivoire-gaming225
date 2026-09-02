'use client'

import { MapPin, Search, Bell, Pencil, Settings, ChevronRight } from 'lucide-react'
import { GlassCard, SectionTitle } from '@/components/ig-primitives'
import { Avatar } from '@/components/shared/avatar'
import { useAuth } from '@/lib/stores/auth'
import { useApp } from '@/lib/stores/app'
import { useRouter } from '@/lib/router'
import { timeAgo } from '@/lib/format'

function MenuRow({
  icon: Icon,
  label,
  onPress,
  badge,
}: {
  icon: typeof Search
  label: string
  onPress: () => void
  badge?: number
}) {
  return (
    <button type="button" onClick={onPress} className="block w-full text-left">
      <GlassCard className="flex items-center gap-3 p-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-[#b7a6ff]">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
        {badge ? (
          <span className="flex min-w-[20px] items-center justify-center rounded-full bg-[#7c5cfc] px-1.5 py-0.5 text-xs font-bold text-white">
            {badge}
          </span>
        ) : null}
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </GlassCard>
    </button>
  )
}

export function ProfileScreen() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const unreadNotifications = useApp((s) => s.unreadNotifications)

  if (!user) return null

  const isStaff = user.role === 'ADMIN' || user.role === 'MODERATOR'

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">
      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Profil</h1>
      </header>

      <GlassCard className="flex flex-col items-center gap-3 px-4 py-6 text-center">
        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-full bg-[#7c5cfc]/40 blur-2xl" />
          <Avatar
            uri={user.avatar}
            name={user.username}
            size={110}
            showPresence
            online={user.status === 'ONLINE'}
          />
        </div>

        <div>
          <h2 className="font-display text-xl font-bold text-foreground">{user.username}</h2>
          <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {user.city ?? 'Ville non définie'} · {user.friendsCount} ami(s) · {user.groupsCount} groupe(s)
          </p>
          <p className="mt-0.5 text-[11px] text-[#8e8e9e]">
            Membre depuis {timeAgo(user.createdAt)}
          </p>
        </div>

        {user.bio ? (
          <p className="max-w-[18rem] text-sm text-muted-foreground text-pretty">{user.bio}</p>
        ) : null}

        {isStaff ? (
          <span className="rounded-full bg-[rgba(255,184,0,0.12)] px-4 py-1.5 text-xs font-black tracking-wider text-[#ffb800]">
            {user.role === 'ADMIN' ? '🛡️ ADMIN' : '🔎 MODÉRATEUR'}
          </span>
        ) : null}
      </GlassCard>

      <section className="flex flex-col gap-3">
        <SectionTitle>🎯 Jeux favoris</SectionTitle>
        {user.favorites.length === 0 ? (
          <button
            type="button"
            onClick={() => router.onTab('games')}
            className="rounded-[20px] border border-dashed border-white/10 bg-white/5 p-4 text-center text-sm text-muted-foreground"
          >
            Ajoute un jeu favori pour le badger ici
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            {user.favorites.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => router.navigate('GameDetail', { slug: f.slug })}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[rgba(30,28,52,0.55)] px-3.5 py-2 text-sm font-medium text-muted-foreground"
              >
                <span>{f.icon ?? '🎮'}</span>
                {f.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <MenuRow
          icon={Search}
          label="Recherche"
          onPress={() => router.navigate('Search', undefined)}
        />
        <MenuRow
          icon={Bell}
          label="Notifications"
          badge={unreadNotifications}
          onPress={() => router.navigate('Notifications', undefined)}
        />
        <MenuRow
          icon={Pencil}
          label="Modifier le profil"
          onPress={() => router.navigate('EditProfile', undefined)}
        />
        <MenuRow
          icon={Settings}
          label="Paramètres"
          onPress={() => router.navigate('Settings', undefined)}
        />
        <button type="button" onClick={() => void logout()} className="block w-full text-left">
          <GlassCard className="flex items-center gap-3 p-3.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-[#ef4444]">
              <span className="text-base">🚪</span>
            </span>
            <span className="flex-1 text-sm font-medium text-[#ef4444]">Se déconnecter</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </GlassCard>
        </button>
      </section>

      <p className="pt-2 text-center text-[11px] text-[#8e8e9e]">
        Ivoire Gaming v1.0.0 · Côte d&apos;Ivoire 🇨🇮
      </p>
    </div>
  )
}
