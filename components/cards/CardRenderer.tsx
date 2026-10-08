import { supportedCardSnapshot, type SupportedCardSnapshot } from '@/lib/card-snapshot-v2'
import CardRendererV1 from './CardRendererV1'
import CardRendererV2 from './CardRendererV2'

// Le snapshot choisi détermine le moteur ; aucun profil n’est relu pendant le rendu.
export default function CardRenderer({ snapshot }: { snapshot: SupportedCardSnapshot }) {
  const card = supportedCardSnapshot(snapshot)
  return card.format === 1 ? <CardRendererV1 snapshot={card} /> : <CardRendererV2 snapshot={card} />
}
