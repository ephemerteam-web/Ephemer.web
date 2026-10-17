// Moteur collectif V3 : uniquement les copies confirmées, jamais les profils courants.
import { collectiveCardSnapshot, type CollectiveCardSnapshot } from '@/lib/collective-card'
import AvatarRenderer from '@/components/avatars/AvatarRenderer'
import CardArtworkV1 from './CardArtworkV1'

const palettes = {
  clair_de_lune: { background: '#14233e', color: '#faf0d8', borderColor: '#66738c' },
  constellation: { background: '#fbf7ef', color: '#303b5a', borderColor: '#d3cbbd' },
  aurore: { background: '#f0f7f5', color: '#234b51', borderColor: '#b8ceca' },
} as const
export default function CardRendererV3({ snapshot }: { snapshot: CollectiveCardSnapshot }) {
  const card = collectiveCardSnapshot(snapshot)
  return <article aria-label="Carte collective publiée" data-card-render-version="3" style={{ ...palettes[card.templateId], padding: 24, border: '1px solid', borderRadius: 20, boxSizing: 'border-box', width: '100%', maxWidth: 640, margin: '0 auto', overflowWrap: 'anywhere', textAlign: 'left', fontFamily: 'Georgia, serif' }}>
    <CardArtworkV1 template={card.templateId} />
    <h2 style={{ fontSize: 28, lineHeight: 1.3, margin: '24px 0' }}>{card.title}</h2>
    {card.contributions.map((entry, index) => <section aria-label={'Message ' + (index + 1)} key={index} style={{ borderTop: '1px solid', borderColor: palettes[card.templateId].borderColor, paddingTop: 24, marginTop: 24 }}>
      <p style={{ whiteSpace: 'pre-wrap', fontSize: 20, lineHeight: 1.65, margin: '0 0 16px' }}>{entry.message}</p>
      {(entry.signature || entry.avatar) && <footer aria-label="Signature choisie" style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        {entry.avatar && <div style={{ width: 64, flexShrink: 0 }}><AvatarRenderer config={entry.avatar} decorative={!!entry.signature} /></div>}
        {entry.signature && <p style={{ whiteSpace: 'pre-wrap', fontSize: 17, lineHeight: 1.65, minWidth: 0, margin: 0 }}>{entry.signature}</p>}
      </footer>}
    </section>)}
  </article>
}
