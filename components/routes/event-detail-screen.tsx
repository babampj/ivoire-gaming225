'use client'
import { useCallback, useEffect, useState } from 'react'
import { api, getErrorMessage } from '@/lib/services'
import { useApp } from '@/lib/stores/app'
import { useRouter } from '@/lib/router'
import { Avatar } from '@/components/shared/avatar'
import { Button } from '@/components/shared/button'
import { Loading, Screen } from '@/components/shared/screen'
import { eventStatusLabel, formatDateTime } from '@/lib/format'

interface EventDetail {
  id: string
  title: string
  description?: string | null
  location: string
  address?: string | null
  startDate: string
  endDate?: string | null
  link?: string | null
  status: string
  game?: { id: string; name: string; slug: string; icon: string | null } | null
  organizer: { id: string; username: string; avatar: string | null; status: string }
  participants: { userId: string; user: { id: string; username: string; avatar: string | null; status: string } }[]
}

export function EventDetailScreen({ eventId }: { eventId: string }) {
  const showToast = useApp((s) => s.showToast)
  const router = useRouter()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [participating, setParticipating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/events/${eventId}`)
      setEvent(res.data.data)
      setParticipating(res.data.data?.isParticipating ?? false)
    } catch (e) {
      showToast(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [eventId, showToast])

  useEffect(() => {
    void load()
  }, [load])

  const toggle = async () => {
    setBusy(true)
    try {
      if (participating) await api.delete(`/events/${eventId}/participate`)
      else await api.post(`/events/${eventId}/participate`)
      setParticipating((v) => !v)
      void load()
    } catch (e) {
      showToast(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading label="Chargement de l'événement…" />
  if (!event) return null

  const statusColor = event.status === 'ONGOING' ? '#1fa35b' : event.status === 'CANCELLED' ? '#ef4444' : '#7c5cfc'

  return (
    <Screen back>
      <div className="flex items-start justify-between gap-3">
        <h1 className="flex-1 font-display text-2xl font-black leading-tight text-[#f5f5fa]">{event.title}</h1>
        <span className="mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: `${statusColor}22`, color: statusColor }}>
          {eventStatusLabel(event.status)}
        </span>
      </div>

      {event.game ? <p className="mt-2 text-sm font-bold text-[#7c5cfc]">🎮 {event.game.name}</p> : null}

      <div className="mt-5 rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] p-4">
        <p className="mb-1 text-sm leading-5 text-muted-foreground">📅 {formatDateTime(event.startDate)}</p>
        <p className="mb-1 text-sm leading-5 text-muted-foreground">📍 {event.location}{event.address ? ` — ${event.address}` : ''}</p>
        {event.link ? (
          <button type="button" onClick={() => window.open(event.link as string, '_blank')}>
            <p className="text-sm leading-5 text-[#7c5cfc]">🔗 {event.link}</p>
          </button>
        ) : null}
      </div>

      {event.description ? <p className="mt-5 text-sm leading-[21px] text-muted-foreground">{event.description}</p> : null}

      <div className="mt-5 flex items-center gap-3">
        <Avatar uri={event.organizer.avatar} name={event.organizer.username} size={36} />
        <p className="text-sm font-medium text-[#f5f5fa]">Organisé par {event.organizer.username}</p>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold text-[#f5f5fa]">
          Participants ({event.participants?.length ?? 0})
        </h2>
        {event.participants?.length ? (
          <div className="flex flex-wrap gap-4">
            {event.participants.map((p) => (
              <button
                key={p.userId}
                type="button"
                onClick={() => router.navigate('UserDetail', { id: p.user.id })}
                className="flex w-16 flex-col items-center"
              >
                <Avatar uri={p.user.avatar} name={p.user.username} size={40} showPresence online={p.user.status === 'ONLINE'} />
                <p className="mt-1 max-w-16 truncate text-xs text-muted-foreground">{p.user.username}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun participant pour l'instant.</p>
        )}
      </div>

      <div className="mt-6">
        <Button title={participating ? '✓ Je participe (annuler)' : 'Participer'} variant={participating ? 'outline' : 'primary'} onPress={() => void toggle()} loading={busy} />
      </div>
    </Screen>
  )
}
