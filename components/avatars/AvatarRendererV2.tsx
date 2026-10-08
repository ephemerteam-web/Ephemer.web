// 🎨 Portrait cartoon céleste : courbes rondes, grands yeux et sourire, sans ressource externe.
import { AVATAR_CATALOG_V2, avatarCollectionConfig, type AvatarConfigV2 } from '@/lib/avatar-collection-v2'

const ink = '#14283d', gold = '#eac07a', light = '#fff0c8'
const faces = {
  ovale: 'M100 144 Q93 80 180 80 Q267 80 260 144 L255 215 Q247 277 180 289 Q113 277 105 215Z',
  rond: 'M92 150 Q88 83 180 83 Q272 83 268 150 L266 212 Q258 279 180 282 Q102 279 94 212Z',
  anguleux: 'M100 142 Q95 82 180 82 Q265 82 260 142 L253 219 Q245 244 226 260 L200 280 Q180 291 160 280 L134 260 Q115 244 107 219Z',
} as const
const fronts = {
  rase: 'M112 149 Q103 79 176 71 Q251 70 248 149 L237 121 Q180 89 123 121Z',
  court: 'M98 164 Q81 141 91 116 Q79 84 108 77 Q105 50 136 56 Q149 35 175 49 Q202 35 220 57 Q257 49 265 79 Q280 108 262 167 L248 136 L239 111 Q211 125 184 104 Q155 127 123 112 L112 145Z',
  carre: 'M105 190 Q89 93 131 71 Q179 42 229 75 Q266 97 254 191 L237 178 L236 117 Q194 137 132 105 L123 181Z',
  long: 'M104 187 Q85 83 138 64 Q182 44 226 69 Q268 88 253 185 L237 157 L230 107 Q199 105 181 85 Q162 112 126 124 L121 178Z',
  boucles: 'M109 168 Q82 153 93 126 Q75 105 100 88 Q98 64 127 61 Q143 40 163 55 Q184 37 202 53 Q229 44 238 64 Q272 67 263 97 Q284 116 262 135 Q271 158 251 177 L232 126 Q212 136 197 112 Q179 132 159 114 Q131 128 123 154Z',
  ondulations: 'M107 185 Q83 168 96 141 Q79 117 106 94 Q109 63 143 59 Q176 37 196 58 Q233 44 251 79 Q279 93 262 124 Q280 154 252 185 L234 156 Q244 133 222 118 Q201 99 187 86 Q174 108 149 113 Q120 121 123 148 Q129 175 107 185Z',
  meche: 'M98 164 Q79 125 100 94 Q85 80 118 73 Q115 51 144 60 Q174 37 196 54 Q206 40 220 59 Q252 51 270 74 Q265 87 258 102 Q276 118 259 165 L244 139 L235 112 Q197 140 156 112 Q144 128 126 119 L112 145Z',
  tresses: 'M110 154 Q98 91 139 70 Q180 50 221 70 Q262 91 250 154 L238 137 L232 113 Q205 104 180 80 Q155 104 128 113 L122 137Z',
} as const

function Star({ x, y, size = 9 }: { x: number; y: number; size?: number }) {
  return <path d={`M${x} ${y-size} Q${x+2} ${y-2} ${x+size} ${y} Q${x+2} ${y+2} ${x} ${y+size} Q${x-2} ${y+2} ${x-size} ${y} Q${x-2} ${y-2} ${x} ${y-size}Z`} fill={gold} />
}

export default function AvatarRendererV2({ config: input, decorative = false, className = '' }: {
  config: AvatarConfigV2; decorative?: boolean; className?: string
}) {
  const config = avatarCollectionConfig(input)
  const skin = AVATAR_CATALOG_V2.skinId.find(item => item.id === config.skinId)!.color
  const hair = AVATAR_CATALOG_V2.hairColorId.find(item => item.id === config.hairColorId)!.color
  const clothing = AVATAR_CATALOG_V2.clothingColorId.find(item => item.id === config.clothingColorId)!.color
  const flowing = ['long', 'ondulations', 'boucles', 'carre', 'tresses'].includes(config.hairId)
  const curls = config.hairId === 'boucles' || config.hairId === 'ondulations'
  return <svg viewBox="0 0 360 400" xmlns="http://www.w3.org/2000/svg" role={decorative ? undefined : 'img'}
    aria-label={decorative ? undefined : 'Avatar illustré, collection céleste'} aria-hidden={decorative || undefined}
    focusable="false" data-avatar-render-version="2" className={`block h-auto w-full ${className}`}>
    <rect width="360" height="400" rx="44" fill="#10283f" />
    <path d="M287 30 Q359 94 319 216 Q267 310 111 303 Q35 282 24 190 Q50 251 115 256 Q249 284 300 172 Q326 87 287 30Z" fill={gold} />
    <path d="M294 44 Q335 120 303 187 Q252 299 124 282 Q257 317 319 216 Q353 132 294 44Z" fill={light} opacity=".55" />
    <Star x={43} y={78} size={14} /><Star x={319} y={66} size={10} /><Star x={29} y={286} size={11} /><Star x={328} y={279} size={13} />
    {[ [65,35], [30,147], [328,139], [318,326], [74,300], [46,245] ].map(([cx,cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.5" fill={light} />)}
    {flowing && <g fill={hair}>
      <path d={config.hairId === 'carre' ? 'M97 112 Q82 58 180 52 Q278 58 264 117 L271 253 Q232 277 180 267 Q128 277 89 253Z' : 'M96 122 Q75 69 128 51 Q175 30 211 49 Q280 58 269 126 Q287 159 267 185 Q291 220 272 245 Q292 278 258 308 L231 318 Q238 259 227 223 L131 223 Q120 265 130 318 L101 301 Q76 287 88 260 Q67 239 85 212 Q70 181 92 160Z'} />
      <path d="M101 145 Q83 207 103 235 Q89 275 113 298 M259 145 Q279 208 256 238 Q271 278 247 304" fill="none" stroke={ink} strokeOpacity=".25" strokeWidth="8" strokeLinecap="round" />
    </g>}
    <path d="M12 400 Q22 328 107 306 L146 288 L214 288 L253 306 Q338 328 348 400Z" fill={clothing} />
    <path d="M128 230 L130 298 Q139 331 180 337 Q221 331 230 298 L232 230Z" fill={skin} />
    <path d="M132 263 Q180 297 229 263 L227 286 Q194 309 136 291Z" fill={ink} opacity=".08" />
    <path d="M12 400 Q27 340 81 329 L98 400Z M262 400 L279 329 Q335 345 348 400Z" fill={ink} opacity=".13" />
    {config.clothingId === 'pull' && <g fill="none" stroke={ink} strokeOpacity=".4"><path d="M112 306 Q113 351 180 356 Q247 351 248 306" strokeWidth="9" /><path d="M110 316 Q113 362 180 366 Q247 362 250 316" strokeWidth="2" /></g>}
    {config.clothingId === 'tunique' && <g><path d="M121 299 L180 356 L239 299 L223 303 L180 336 L137 303Z" fill={light} opacity=".55" /><path d="M180 350 V400" stroke={gold} strokeWidth="3" /><circle cx="180" cy="377" r="3" fill={gold} /></g>}
    {config.clothingId === 'veste' && <g><path d="M118 295 L153 328 L180 400 L125 367 L106 329Z M242 295 L207 328 L180 400 L235 367 L254 329Z" fill={ink} opacity=".35" /><path d="M146 315 L180 400 L214 315" fill="none" stroke={light} strokeOpacity=".55" strokeWidth="3" /></g>}
    {config.clothingId === 'capuche' && <g><path d="M116 285 Q65 297 85 341 L120 371 L180 399 L238 371 L276 340 Q293 298 244 285 L232 306 Q258 316 239 337 L180 372 L121 337 Q102 316 128 306Z" fill={clothing} stroke={ink} strokeOpacity=".26" strokeWidth="3" /><path d="M92 319 Q112 350 180 375 Q248 350 268 319" fill="none" stroke={light} strokeOpacity=".3" strokeWidth="6" /><path d="M139 349 L136 386 M221 349 L224 386" stroke={light} strokeWidth="3" strokeLinecap="round" /></g>}
    <ellipse cx="100" cy="181" rx="18" ry="25" fill={skin} /><ellipse cx="260" cy="181" rx="18" ry="25" fill={skin} />
    <path d="M99 175 Q88 169 97 190 M261 175 Q272 169 263 190" fill="none" stroke={ink} strokeOpacity=".2" strokeWidth="3" strokeLinecap="round" />
    <path d={faces[config.faceId]} fill={skin} />
    <path d="M104 173 Q101 253 152 274 Q174 284 199 282 Q136 303 109 242Z" fill={ink} opacity=".06" />
    <ellipse cx="131" cy="210" rx="18" ry="10" fill="#df867d" opacity=".42" /><ellipse cx="229" cy="210" rx="18" ry="10" fill="#df867d" opacity=".42" />
    <ellipse cx="144" cy="177" rx="20" ry="24" fill="#fff7e9" /><ellipse cx="216" cy="177" rx="20" ry="24" fill="#fff7e9" />
    <g fill={ink}><ellipse cx="148" cy="179" rx="11" ry="16" /><ellipse cx="212" cy="179" rx="11" ry="16" /></g>
    <g fill="#fff8e7"><circle cx="144" cy="173" r="4.5" /><circle cx="208" cy="173" r="4.5" /><circle cx="152" cy="185" r="2" /><circle cx="216" cy="185" r="2" /></g>
    <path d="M126 168 Q130 153 143 153 M217 153 Q230 153 234 168" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    <path d="M125 144 Q139 133 156 140 M204 140 Q221 133 235 144" fill="none" stroke={hair} strokeWidth="7" strokeLinecap="round" />
    <path d="M176 196 Q168 209 180 211 L186 209" fill="none" stroke={ink} strokeOpacity=".3" strokeWidth="3" strokeLinecap="round" />
    <path d="M150 232 Q180 245 210 232 Q206 266 180 268 Q154 266 150 232Z" fill="#733e3d" />
    <path d="M154 234 Q180 245 206 234 L202 245 Q180 254 158 245Z" fill="#fff7e9" />
    <path d="M165 260 Q180 248 195 260 Q180 269 165 260Z" fill="#df867d" />
    <path d="M144 230 L147 226 M213 226 L216 230" stroke={ink} strokeOpacity=".2" strokeWidth="3" strokeLinecap="round" />
    {[[123,210],[131,214],[139,209],[221,209],[229,214],[237,210]].map(([cx,cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.4" fill={hair} opacity=".27" />)}
    {/* Chevelure et accessoires viennent au-dessus du visage ; chaque ID a sa forme originale. */}
    {config.hairId !== 'sans' && <g fill={hair}>
      <path d={fronts[config.hairId]} />
      {config.hairId !== 'rase' && <g fill="none" stroke={light} strokeOpacity=".23" strokeWidth="3" strokeLinecap="round"><path d="M120 105 Q159 69 181 74 M191 74 Q230 86 248 126" /><path d="M126 93 Q163 63 178 66 M204 71 Q235 81 246 109" /></g>}
    </g>}
    {curls && <g fill="none" stroke={light} strokeOpacity=".2" strokeWidth="2.5" strokeLinecap="round"><path d="M107 137 Q87 163 109 181 Q122 199 105 219 Q89 242 119 261 M253 127 Q275 149 254 175 Q240 197 262 216 Q279 246 244 272 M111 226 Q123 243 112 261 M252 241 Q235 259 251 281" /></g>}
    {config.hairId === 'tresses' && <g stroke={ink} strokeOpacity=".35" strokeWidth="3" fill={hair}>{[192,212,232,252,272].map(y => <g key={y}><ellipse cx="109" cy={y} rx="13" ry="15" transform={`rotate(-12 109 ${y})`} /><ellipse cx="251" cy={y} rx="13" ry="15" transform={`rotate(12 251 ${y})`} /></g>)}<path d="M96 284 H120 M239 284 H263" stroke={gold} strokeOpacity="1" strokeWidth="5" /></g>}
    {config.accessoryId === 'barbe' && <g fill={hair}><path d="M105 208 Q104 268 180 289 Q256 268 255 208 L243 227 Q232 268 204 277 Q180 285 156 277 Q128 268 117 227Z" opacity=".6" /><path d="M153 227 Q164 216 180 222 Q196 216 207 227 L203 232 Q180 227 157 232Z" opacity=".7" /></g>}
    {(config.accessoryId === 'lunettes' || config.accessoryId === 'lunettes_dorees') && <g fill="none" stroke={config.accessoryId === 'lunettes' ? ink : gold} strokeWidth="4"><circle cx="143" cy="179" r="27" /><circle cx="217" cy="179" r="27" /><path d="M170 177 Q180 171 190 177 M116 176 L100 168 M244 176 L260 168" /><path d="M127 168 L137 159 M201 168 L211 159" stroke={light} strokeOpacity=".6" strokeWidth="2" /></g>}
    {config.accessoryId === 'boucles_lune' && <g fill={gold} stroke={light} strokeWidth="1"><path d="M105 194 A14 14 0 1 0 119 211 A12 12 0 0 1 105 194Z M247 194 A14 14 0 1 0 261 211 A12 12 0 0 1 247 194Z" /><circle cx="110" cy="193" r="3" /><circle cx="252" cy="193" r="3" /></g>}
    {config.accessoryId === 'lune' && <g fill="none" stroke={gold} strokeWidth="2"><path d="M138 296 Q180 343 222 296" /><path d="M178 330 A11 11 0 1 0 190 344 A9 9 0 0 1 178 330Z" fill={gold} /></g>}
    {config.accessoryId === 'etoile' && <g><circle cx="267" cy="342" r="16" fill={ink} opacity=".4" /><Star x={267} y={342} size={12} /></g>}
    {config.accessoryId === 'halo' && <g fill="none" stroke={gold}><ellipse cx="180" cy="42" rx="62" ry="17" strokeWidth="4" /><ellipse cx="180" cy="42" rx="70" ry="22" strokeWidth="1" opacity=".4" /></g>}
    {config.accessoryId === 'couronne' && <g><path d="M117 101 Q180 62 243 101" fill="none" stroke={gold} strokeWidth="3" /><Star x={180} y={78} size={12} /><Star x={147} y={84} size={7} /><Star x={213} y={84} size={7} /><circle cx="126" cy="96" r="3" fill={light} /><circle cx="234" cy="96" r="3" fill={light} /></g>}
    {config.accessoryId === 'barrette' && <g><path d="M219 103 L244 123 M221 109 L239 127" stroke={gold} strokeWidth="3" strokeLinecap="round" /><Star x={218} y={101} size={9} /></g>}
    {config.accessoryId === 'foulard' && <g><path d="M127 294 Q180 319 233 294 L229 324 Q180 349 131 324Z M214 326 L241 383 L219 395 L192 339Z" fill="#395770" /><path d="M135 310 Q180 330 225 310 M210 344 L229 384" fill="none" stroke={gold} strokeWidth="2" /><Star x={171} y={319} size={5} /><Star x={223} y={366} size={5} /></g>}
    {config.accessoryId === 'casque' && <g fill={ink} stroke={gold} strokeWidth="2"><path d="M97 163 Q82 52 180 59 Q278 52 263 163" fill="none" stroke={ink} strokeWidth="12" /><rect x="91" y="154" width="23" height="49" rx="11" /><rect x="246" y="154" width="23" height="49" rx="11" /><path d="M101 164 V192 M257 164 V192" strokeWidth="3" /></g>}
  </svg>
}
