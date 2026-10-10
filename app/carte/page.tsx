import type { Metadata } from 'next'
import PublicCardScreen from '@/components/cards/PublicCardScreen'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Une carte pour toi · Ephemer', description: 'Une carte personnelle à consulter avec son lien privé.',
  robots: { index: false, follow: false, noarchive: true }, referrer: 'no-referrer',
  openGraph: { title: 'Une carte pour toi · Ephemer', description: 'Une carte personnelle.', url: '/carte', images: [] },
  twitter: { card: 'summary', title: 'Une carte pour toi · Ephemer', description: 'Une carte personnelle.', images: [] },
}
export default function CardPage() { return <PublicCardScreen /> }
