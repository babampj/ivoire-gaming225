'use client'
import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '@/lib/services'
import { useAuth } from '@/lib/stores/auth'
import { useApp } from '@/lib/stores/app'
import { useRouter } from '@/lib/router'
import { Screen } from '@/components/shared/screen'
import { Button } from '@/components/shared/button'
import { Input } from '@/components/shared/input'
import { Avatar } from '@/components/shared/avatar'

export function EditProfileScreen() {
  const router = useRouter()
  const { user, updateUser } = useAuth()
  const showToast = useApp((s) => s.showToast)
  const [username, setUsername] = useState(user?.username ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [city, setCity] = useState(user?.city ?? '')
  const [birthDate, setBirthDate] = useState(user?.birthDate?.slice(0, 10) ?? '')
  const [cities, setCities] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get('/cities')
      .then((res) => setCities(res.data.data ?? []))
      .catch(() => undefined)
  }, [])

  const pickAvatar = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await api.post('/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      updateUser({ avatar: res.data.data.avatar } as never)
      showToast('Avatar mis à jour ✓')
    } catch (e) {
      showToast(getErrorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    setError(null)
    setSaving(true)
    try {
      await api.patch('/users/me', { username: username.trim() || undefined, bio: bio.trim() || null, city: city || null, birthDate: birthDate || null })
      updateUser({
        username: username.trim() || undefined,
        bio: bio.trim() || null,
        city: city || null,
        birthDate: birthDate || null,
      } as never)
      showToast('Profil mis à jour ✓')
      router.goBack()
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen back title="Modifier le profil">
      <div className="mb-5 flex flex-col items-center gap-2">
        <label className="flex cursor-pointer flex-col items-center gap-2">
          <Avatar uri={user?.avatar} name={user?.username ?? '?'} size={92} />
          <span className="text-sm font-medium text-[#7c5cfc]">{uploading ? 'Envoi…' : "Changer l'avatar"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => void pickAvatar(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      <Input label="Pseudo" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={24} />
      <Input label="Ville (Côte d'Ivoire)" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex : Abidjan" />
      {cities.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {cities.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCity(c)}
              className={`rounded-full border px-4 py-2 text-sm ${
                city === c ? 'border-[#7c5cfc] bg-[rgba(139,92,246,0.15)] text-[#f5f5fa] font-bold' : 'border-white/10 text-muted-foreground'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}
      <Input label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} placeholder="Ex : Carry / top lane, on parle le soir" />
      <Input label="Date de naissance (AAAA-MM-JJ)" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} placeholder="2000-01-31" />

      {error ? <p className="mb-4 text-center text-sm text-[#ef4444]">{error}</p> : null}
      <Button title="Enregistrer" onPress={save} loading={saving} />
    </Screen>
  )
}
