'use client'
import type { CollectiveCardSnapshot } from '@/lib/collective-card'
import { collectiveCardSnapshot } from '@/lib/collective-card'
import CardRenderer from './CardRenderer'
import ShareImageButton from '../ShareImageButton'

export default function CollectivePublishedCard({ snapshot, expiresAt, accessKey, verify }: { snapshot: CollectiveCardSnapshot; expiresAt: string; accessKey: string; verify: () => Promise<CollectiveCardSnapshot> }) {
  const published = collectiveCardSnapshot(snapshot)
  async function validate() {
    const current = collectiveCardSnapshot(await verify())
    if (JSON.stringify(current) !== JSON.stringify(published) || Date.parse(expiresAt) <= Date.now()) throw new Error('La publication ou ses droits ont changé. Rouvre la carte avant de partager.')
  }
  return <section className="min-w-0 space-y-4" aria-label="Version collective publiée">
    <CardRenderer snapshot={published} />
    <ShareImageButton title="Une carte collective" snapshot={published} label="Partager la carte en image" access={{ key: accessKey, expiresAt, validate }} />
    <p className="text-sm text-muted">L’image contient seulement cette version publiée. Une copie téléchargée ou partagée ne peut pas être révoquée.</p>
  </section>
}
