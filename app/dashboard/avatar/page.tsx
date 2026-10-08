import type { Metadata } from 'next'
import AvatarPage from '@/components/avatars/AvatarPage'

export const metadata: Metadata = { title: 'Mon avatar · Ephemer', robots: { index: false, follow: false } }
export default function Page() { return <AvatarPage /> }
