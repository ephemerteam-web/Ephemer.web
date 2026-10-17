import { supportedCardSnapshot } from '@/lib/card-snapshot-v2'
import type { PublishedCardSnapshot } from '@/lib/published-card'
import CardRendererV1 from './CardRendererV1'
import CardRendererV2 from './CardRendererV2'
import CardRendererV3 from './CardRendererV3'

// Le snapshot choisi détermine le moteur ; aucun profil n’est relu pendant le rendu.
export default function CardRenderer({ snapshot }: { snapshot: PublishedCardSnapshot }) {
  if (snapshot.format === 3) return <CardRendererV3 snapshot={snapshot} />
  const card = supportedCardSnapshot(snapshot)
  return card.format === 1 ? <CardRendererV1 snapshot={card} /> : <CardRendererV2 snapshot={card} />
}
