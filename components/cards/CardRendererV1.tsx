// 💌 Ne pas modifier ce moteur après publication ; ajouter V2 pour faire évoluer les modèles.
import { cardSnapshot, type CardSnapshotV1 } from '@/lib/cards'
import CardArtworkV1 from './CardArtworkV1'

const palettes = {
  clair_de_lune: { card: 'bg-[#14233e] text-[#faf0d8] border-[#66738c]', prose: 'text-[#faf0d8]', signature: 'text-[#e5c57d] border-[#66738c]' },
  constellation: { card: 'bg-[#fbf7ef] text-[#303b5a] border-[#d3cbbd]', prose: 'text-[#303b5a]', signature: 'text-[#796137] border-[#d3cbbd]' },
  aurore: { card: 'bg-[#f0f7f5] text-[#234b51] border-[#b8ceca]', prose: 'text-[#234b51]', signature: 'text-[#31575e] border-[#b8ceca]' },
} as const
export default function CardRendererV1({ snapshot }: { snapshot: CardSnapshotV1 }) {
  const card = cardSnapshot(snapshot), palette = palettes[card.templateId]
  // Styles explicites : le thème de l'application ne doit pas recolorer une signature publiée.
  const prose = 'm-0 whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:normal] [font-family:Georgia,serif] font-normal not-italic normal-case tracking-normal leading-[1.65]'
  return <article aria-label="Carte personnelle" data-card-render-version="1" data-card-template={card.templateId}
    className={'isolate box-border mx-auto w-full max-w-[640px] min-w-0 rounded-[20px] border border-solid p-[24px_clamp(16px,4vw,40px)_32px] text-left ' + palette.card}>
    <CardArtworkV1 template={card.templateId} />
    <p className={prose + ' min-h-[100px] pt-[24px] text-[20px] ' + palette.prose}>{card.message || 'Ton message apparaîtra ici.'}</p>
    {card.signature && <p aria-label="Signature" className={prose + ' mt-[32px] border-t border-solid pt-[16px] text-[17px] ' + palette.signature}>{card.signature}</p>}
  </article>
}
