'use client'
import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/services'
import { useApp } from '@/lib/stores/app'
import { Screen, Loading } from '@/components/shared/screen'
import { EmptyState } from '@/components/shared/empty-state'
import { timeAgo } from '@/lib/format'
import type { NotificationItem } from '@/lib/types'

export function NotificationsScreen() {
  const setUnread = useApp((s) => s.setUnreadNotifications)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications')
      setItems(res.data.data?.items ?? res.data.data ?? [])
      const un = await api.get('/notifications/unread-count')
      setUnread(un.data.data?.count ?? 0)
    } catch {
      // silencieux
    } finally {
      setLoading(false)
    }
  }, [setUnread])

  useEffect(() => {
    void load()
  }, [load])

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all')
      setUnread(0)
      setItems((prev) => prev.map((n) => ({ ...n, read: true } as NotificationItem)))
    } catch {
      // silencieux
    }
  }

  const iconFor = (t: string) => {
    if (t.startsWith('FRIEND') || t.startsWith('NEW_FRIEND')) return '🤝'
    if (t.startsWith('MESSAGE')) return '💬'
    if (t.startsWith('VOICE') || t.startsWith('CALL')) return '📞'
    if (t.startsWith('EVENT')) return '🗓️'
    if (t.startsWith('GROUP') || t.startsWith('TEAM')) return '👥'
    if (t.startsWith('REPORT') || t.startsWith('MODERATION') || t.startsWith('BAN')) return '🛡️'
    if (t.startsWith('ANNOUNCEMENT')) return '📢'
    return '🔔'
  }

  return (
    <Screen
      back
      title="Notifications"
      headerRight={
        <button type="button" onClick={() => void markAllRead()} className="text-sm font-bold text-[#7c5cfc]">
          Tout lire
        </button>
      }
    >
      {loading ? <Loading label="Chargement…" /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState emoji="🔕" title="Aucune notification" subtitle="Les réponses, amitiés et messages arriveront ici." />
      ) : (
        items.map((n) => (
          <div
            key={n.id}
            className={`mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] p-3 ${!n.read ? 'border-l-[3px] border-l-[#7c5cfc]' : ''}`}
          >
            <span className="text-xl leading-none">{iconFor(n.type)}</span>
            <div className="flex-1">
              <p className="text-sm leading-[19px] text-[#f5f5fa]">{n.content}</p>
              <p className="mt-0.5 text-xs text-[#62627a]">{timeAgo(n.createdAt)}</p>
            </div>
            {!n.read ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#7c5cfc]" /> : null}
          </div>
        ))
      )}
    </Screen>
  )
}
