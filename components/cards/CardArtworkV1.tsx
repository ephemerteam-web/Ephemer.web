// 🌙 Décors originaux et figés, sans ID SVG partagé, ressource distante ni animation.
import type { CardTemplateId } from '@/lib/cards'
export default function CardArtworkV1({ template }: { template: CardTemplateId }) {
  return <svg viewBox="0 0 480 160" width="480" height="160" aria-hidden="true" focusable="false" className="block h-auto w-full max-h-[160px] shrink-0">
    {template === 'clair_de_lune' ? <>
      <path d="M271 25a48 48 0 1 0 26 83 43 43 0 0 1-26-83Z" fill="#e5c57d" />
      <path d="m91 46 3 8 8 3-8 3-3 8-3-8-8-3 8-3Zm279 19 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="#f8e8be" />
      <g fill="#c4d8ef"><circle cx="153" cy="32" r="2" /><circle cx="332" cy="30" r="2" /><circle cx="406" cy="121" r="2" /><circle cx="125" cy="114" r="2" /></g>
      <path d="M80 140h320" stroke="#e5c57d" strokeOpacity=".35" />
    </> : template === 'constellation' ? <>
      <path d="m91 106 84-57 76 53 67-65 76 60" fill="none" stroke="#5c6995" strokeWidth="1.5" />
      <g fill="#394469">{[[91,106],[175,49],[251,102],[318,37],[394,97]].map(([x,y]) => <path key={x} d={`M${x} ${y-8}l2.5 5.5 5.5 2.5-5.5 2.5-2.5 5.5-2.5-5.5-5.5-2.5 5.5-2.5Z`} />)}</g>
      <g fill="#8e713f"><circle cx="126" cy="37" r="2" /><circle cx="287" cy="137" r="2" /><circle cx="362" cy="25" r="2" /></g>
      <path d="M80 146h320" stroke="#394469" strokeOpacity=".2" />
    </> : <>
      <path d="M25 104C119-11 182 153 278 55s151 12 177-21" fill="none" stroke="#b8d7d3" strokeWidth="28" strokeLinecap="round" />
      <path d="M27 119C123 8 181 167 280 73s147 12 174-23" fill="none" stroke="#e7c1b3" strokeWidth="12" strokeLinecap="round" />
      <path d="m240 38 3 8 8 3-8 3-3 8-3-8-8-3 8-3Zm140 72 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#31575e" />
      <path d="M80 146h320" stroke="#31575e" strokeOpacity=".2" />
    </>}
  </svg>
}
