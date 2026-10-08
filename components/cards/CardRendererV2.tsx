// 💌 Moteur V2 figé : la copie d'avatar est l'unique source de la signature illustrée.
import { cardSnapshotV2, type CardSnapshotV2 } from '@/lib/card-snapshot-v2'
import AvatarRenderer from '@/components/avatars/AvatarRenderer'
import CardArtworkV1 from './CardArtworkV1'

const palettes = {
  clair_de_lune: 'bg-[#14233e] text-[#faf0d8] border-[#66738c]',
  constellation: 'bg-[#fbf7ef] text-[#303b5a] border-[#d3cbbd]',
  aurore: 'bg-[#f0f7f5] text-[#234b51] border-[#b8ceca]',
} as const
const signatures = { clair_de_lune: 'text-[#e5c57d] border-[#66738c]', constellation: 'text-[#796137] border-[#d3cbbd]', aurore: 'text-[#31575e] border-[#b8ceca]' } as const
export default function CardRendererV2({ snapshot }: { snapshot: CardSnapshotV2 }) {
  const card = cardSnapshotV2(snapshot)
  const prose = 'm-0 whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:normal] [font-family:Georgia,serif] font-normal not-italic normal-case tracking-normal leading-[1.65]'
  return <article aria-label="Carte personnelle" data-card-render-version="2" data-card-template={card.templateId}
    className={'isolate box-border mx-auto w-full max-w-[640px] min-w-0 rounded-[20px] border border-solid p-[24px_clamp(16px,4vw,40px)_32px] text-left ' + palettes[card.templateId]}>
    <CardArtworkV1 template={card.templateId} />
    <p className={prose + ' min-h-[100px] pt-[24px] text-[20px]'}>{card.message || 'Ton message apparaîtra ici.'}</p>
    {(card.signature || card.avatar) && <footer aria-label="Signature" className={'mt-[32px] flex min-w-0 items-center gap-[16px] border-t border-solid pt-[16px] ' + signatures[card.templateId]}>
      {card.avatar && <div className="w-[64px] shrink-0"><AvatarRenderer config={card.avatar} decorative={!!card.signature} /></div>}
      {card.signature && <p className={prose + ' min-w-0 flex-1 text-[17px]'}>{card.signature}</p>}
    </footer>}
  </article>
}
