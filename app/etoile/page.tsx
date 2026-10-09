import type { Metadata } from 'next'
import PublicEtoileScreen from '@/components/etoiles/PublicEtoileScreen'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Devenir une étoile · Ephemer', description: 'Proposer une relation privée avec un accord réciproque.',
  robots: { index: false, follow: false, noarchive: true }, referrer: 'no-referrer',
  openGraph: { title: 'Devenir une étoile · Ephemer', description: 'Une relation privée.', url: '/etoile', images: [] },
  twitter: { card: 'summary', title: 'Devenir une étoile · Ephemer', description: 'Une relation privée.', images: [] },
}
export default function EtoilePage() { return <PublicEtoileScreen /> }
