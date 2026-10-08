'use client'
import Link from 'next/link'
import { useDashboardUser } from '@/components/DashboardUserContext'
import ProfileAvatar from './ProfileAvatar'

export default function AvatarPage() {
  const user = useDashboardUser()
  return <div className="mx-auto max-w-2xl px-4 py-6 pb-16 text-ink">
    <Link href="/dashboard/profil" className="text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">← Mon profil</Link>
    <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Mon avatar</h1>
    <p className="mt-2 text-sm text-muted">Compose ton portrait et valide tes modifications pour les retrouver dans ton compte.</p>
    <ProfileAvatar key={user.id} ownerId={user.id} />
  </div>
}
