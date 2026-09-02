'use client'
import { useCallback, useEffect, useState } from 'react'
import { api, getErrorMessage } from '@/lib/services'
import { useApp } from '@/lib/stores/app'
import { useAuth } from '@/lib/stores/auth'
import { Button } from '@/components/shared/button'
import { Input } from '@/components/shared/input'
import { Avatar } from '@/components/shared/avatar'
import { Screen } from '@/components/shared/screen'

interface Privacy {
  showOnline: boolean
  allowFriendRequests: boolean
  allowDirectMessages: boolean
  notificationsEnabled: boolean
}

export function SettingsScreen() {
  const { user, updateUser } = useAuth()
  const showToast = useApp((s) => s.showToast)
  const [privacy, setPrivacy] = useState<Privacy>({
    showOnline: user?.privacy?.showOnline ?? true,
    allowFriendRequests: user?.privacy?.allowFriendRequests ?? true,
    allowDirectMessages: user?.privacy?.allowDirectMessages ?? true,
    notificationsEnabled: user?.privacy?.notificationsEnabled ?? true,
  })
  const [blocked, setBlocked] = useState<{ id: string; username: string; avatar: string | null }[]>([])
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwdBusy, setPwdBusy] = useState(false)

  const loadBlocked = useCallback(async () => {
    try {
      const res = await api.get('/users/me/blocked')
      setBlocked(res.data.data ?? [])
    } catch {
      // silencieux
    }
  }, [])

  useEffect(() => {
    void loadBlocked()
  }, [loadBlocked])

  const setItem = async (key: keyof Privacy, value: boolean) => {
    setPrivacy((p) => ({ ...p, [key]: value }))
    try {
      const res = await api.patch('/users/me/privacy', { [key]: value })
      if (user) updateUser({ privacy: res.data.data } as never)
    } catch (e) {
      setPrivacy((p) => ({ ...p, [key]: !value }))
      showToast(getErrorMessage(e))
    }
  }

  const changePassword = async () => {
    if (newPassword.length < 8) {
      showToast('Le nouveau mot de passe doit faire au moins 8 caractères.')
      return
    }
    setPwdBusy(true)
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword })
      showToast('Mot de passe mis à jour ✓')
      setOldPassword('')
      setNewPassword('')
    } catch (e) {
      showToast(getErrorMessage(e))
    } finally {
      setPwdBusy(false)
    }
  }

  const unblock = async (id: string) => {
    try {
      await api.delete(`/users/me/blocked/${id}`)
      void loadBlocked()
    } catch (e) {
      showToast(getErrorMessage(e))
    }
  }

  const Row = ({ label, desc, value, onValueChange }: { label: string; desc: string; value: boolean; onValueChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between border-b border-white/10 py-3.5 last:border-b-0">
      <div className="mr-5">
        <p className="text-sm font-medium text-[#f5f5fa]">{label}</p>
        <p className="mt-0.5 text-xs text-[#62627a]">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onValueChange(!value)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${value ? 'bg-[#7c5cfc]' : 'bg-[rgba(42,38,66,0.75)]'}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${value ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  )

  return (
    <Screen back title="Paramètres">
      <h2 className="mb-3 font-display text-lg font-bold text-[#f5f5fa]">Confidentialité</h2>
      <div className="rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] px-4">
        <Row label="Afficher ma présence en ligne" desc="Les autres voient si je suis connecté" value={privacy.showOnline} onValueChange={(v) => void setItem('showOnline', v)} />
        <Row label="Autoriser les demandes d'amitié" desc="Qui peut m'envoyer une demande" value={privacy.allowFriendRequests} onValueChange={(v) => void setItem('allowFriendRequests', v)} />
        <Row label="Autoriser les messages privés" desc="Uniquement si vous êtes amis" value={privacy.allowDirectMessages} onValueChange={(v) => void setItem('allowDirectMessages', v)} />
        <Row label="Notifications" desc="Alertes dans l'application" value={privacy.notificationsEnabled} onValueChange={(v) => void setItem('notificationsEnabled', v)} />
      </div>

      <div className="mt-8" />
      <h2 className="mb-3 font-display text-lg font-bold text-[#f5f5fa]">Mot de passe</h2>
      <div className="rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] p-4">
        <Input label="Mot de passe actuel" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
        <Input label="Nouveau mot de passe (min. 8, lettre + chiffre)" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <Button title="Changer le mot de passe" variant="outline" onPress={() => void changePassword()} loading={pwdBusy} />
      </div>

      <div className="mt-8" />
      <h2 className="mb-3 font-display text-lg font-bold text-[#f5f5fa]">Comptes bloqués ({blocked.length})</h2>
      {blocked.length === 0 ? (
        <p className="py-5 text-center text-sm text-muted-foreground">Aucun compte bloqué.</p>
      ) : (
        blocked.map((b) => (
          <div key={b.id} className="mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(30,28,52,0.62)] p-3">
            <Avatar uri={b.avatar} name={b.username} size={36} />
            <p className="flex-1 text-sm font-medium text-[#f5f5fa]">{b.username}</p>
            <button
              type="button"
              onClick={() => void unblock(b.id)}
              className="rounded-full bg-[rgba(42,38,66,0.75)] px-4 py-1.5 text-xs font-bold text-[#f5f5fa]"
            >
              Débloquer
            </button>
          </div>
        ))
      )}
    </Screen>
  )
}
