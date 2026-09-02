'use client'

import { useCallback, useEffect, useState } from 'react'
import { Avatar } from '@/components/shared/avatar'
import { Loading } from '@/components/shared/screen'
import { EmptyState } from '@/components/shared/empty-state'
import { api } from '@/lib/services'
import { getSocket } from '@/lib/socket'
import { useRouter } from '@/lib/router'
import { timeAgo } from '@/lib/format'
import type { Conversation } from '@/lib/types'

export function MessagesScreen() {
  const router = useRouter()
  const [convs, setConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations')
      setConvs(res.data.data ?? [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const socket = getSocket()
    const onDmNew = () => void load()
    socket?.on('dm:new', onDmNew)
    socket?.on('presence:change', onDmNew)
    return () => {
      socket?.off('dm:new', onDmNew)
      socket?.off('presence:change', onDmNew)
    }
  }, [load])

  return (
    <div className="flex min-h-full flex-col px-4 pb-4">
      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground">Tes conversations privées</p>
      </header>

      {loading ? <Loading label="Chargement des conversations…" /> : null}
      {!loading && convs.length === 0 ? (
        <EmptyState emoji="💬" title="Aucune conversation" subtitle="Envoie un premier message à un ami !" />
      ) : (
        convs.map((c) => (
          <button
            key={c.user.id}
            type="button"
            onClick={() => router.navigate('Conversation', { user: c.user })}
            className="mb-2 flex w-full items-center gap-3 rounded-[20px] border border-white/10 bg-[rgba(30,28,52,0.55)] p-3 text-left"
          >
            <Avatar
              uri={c.user.avatar}
              name={c.user.username}
              size={50}
              showPresence
              online={c.user.status === 'ONLINE'}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="truncate text-[15px] font-bold text-[#f5f5fa]">{c.user.username}</p>
                <span className="ml-2 shrink-0 text-xs text-[#8e8e9e]">
                  {timeAgo(c.lastMessage.createdAt)}
                </span>
              </div>
              <p
                className={`mt-0.5 truncate text-sm ${
                  c.unread > 0 ? 'font-bold text-[#f5f5fa]' : 'text-[#8e8e9e]'
                }`}
              >
                {c.lastMessage.fromMe ? 'Vous : ' : ''}
                {c.lastMessage.content}
              </p>
            </div>
            {c.unread > 0 ? (
              <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#7c5cfc] px-1.5 text-xs font-bold text-white">
                {c.unread}
              </span>
            ) : null}
          </button>
        ))
      )}
    </div>
  )
}
