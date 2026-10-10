'use client'
import { useId, useState } from 'react'
import Link from 'next/link'
import { useDashboardUser } from '@/components/DashboardUserContext'
import ProfileAvatar from './ProfileAvatar'
import SelfieAvatarGenerator from './SelfieAvatarGenerator'

export default function AvatarPage() {
  const user = useDashboardUser()
  return <div className="mx-auto max-w-2xl px-4 py-6 pb-16 text-ink">
    <Link href="/dashboard/profil" className="text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">← Mon profil</Link>
    <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Mon avatar</h1>
    <p className="mt-2 text-sm text-muted">Compose ton avatar ou crée un portrait céleste à partir d’un selfie.</p>
    <AvatarCreationTools key={user.id} ownerId={user.id} />
  </div>
}

// Le changement de compte réinitialise aussi le choix de l’outil et ses aperçus privés.
export function AvatarCreationTools({ ownerId }: { ownerId: string }) {
  const id = useId()
  const [mode, setMode] = useState<'personnalisable' | 'photo-ia'>('personnalisable')
  return <>
    <fieldset className="mt-6 min-w-0">
      <legend className="text-sm font-medium">Comment veux-tu créer ton avatar ?</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {[
          { value: 'personnalisable' as const, label: 'Avatar personnalisable', description: 'Choisis les traits, la coiffure et les accessoires de ton avatar.', icon: '✧' },
          { value: 'photo-ia' as const, label: 'Photo avec IA', description: 'Transforme un selfie en portrait cartoon avec lune et étoiles.', icon: '☾' },
        ].map(option => <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${mode === option.value ? 'border-accent bg-accent/5' : 'border-line bg-surface'}`}>
          <input type="radio" name={`${id}-creation`} value={option.value} checked={mode === option.value} onChange={() => setMode(option.value)} className="mt-1 h-4 w-4 shrink-0 accent-accent" />
          <span className="min-w-0"><span className="block text-sm font-semibold"><span aria-hidden="true" className="mr-2 text-accent">{option.icon}</span>{option.label}</span><span className="mt-1 block text-sm text-muted">{option.description}</span></span>
        </label>)}
      </div>
    </fieldset>
    {mode === 'personnalisable' ? <ProfileAvatar ownerId={ownerId} /> : <div className="mt-6">
      <p className="mb-3 text-sm text-muted">Valide ton portrait pour l’utiliser dans ton profil. Changer d’option efface seulement les aperçus non enregistrés.</p>
      <SelfieAvatarGenerator ownerId={ownerId} allowSave />
    </div>}
  </>
}
