// 🎨 Portrait original V3 : chaque pièce est une forme locale, les anciennes versions restent intactes.
import { AVATAR_CATALOG_V3, avatarConfigV3, type AvatarConfigV3 } from '@/lib/avatar-collection-v3'

const outline = '#593d32', gold = '#e8bc69', cream = '#fff2d0'
const lips = { porcelaine: '#c98674', peche: '#c77965', sable: '#b77059', miel: '#a66248', ambre: '#925438', cuivre: '#713e31', brun: '#50302b', ebene: '#322326' } as const
const facePaths = {
  ovale: 'M109 143 Q105 92 180 92 Q255 92 251 143 L244 219 Q241 255 215 272 Q180 298 145 272 Q119 255 116 219Z',
  rond: 'M103 148 Q99 94 180 94 Q261 94 257 148 L254 220 Q250 278 180 286 Q110 278 106 220Z',
  anguleux: 'M110 141 Q106 94 180 94 Q254 94 250 141 L246 221 Q241 246 225 261 L203 280 Q180 293 157 280 L135 261 Q119 246 114 221Z',
} as const
const frontHair = {
  rase: 'M108 161 Q99 95 151 82 Q180 70 212 85 Q263 97 252 161 L239 134 Q180 96 121 134Z',
  meche: 'M107 171 Q88 150 100 125 Q80 106 100 86 L89 82 Q112 80 127 65 Q147 44 169 55 Q185 64 206 58 Q250 48 260 83 Q278 92 265 129 L250 172 L238 137 Q247 102 221 99 Q206 143 150 132 Q119 123 119 151 L116 178Z',
  carre: 'M105 241 Q80 133 112 96 Q146 68 180 76 Q234 70 256 116 L257 240 L242 223 L239 147 Q210 124 181 114 Q154 135 122 145 L121 223Z',
  mi_longs: 'M101 216 Q79 133 112 90 Q140 68 180 73 Q225 65 253 109 Q275 158 254 218 L241 204 L238 145 Q204 136 185 109 Q160 135 121 147 L118 204Z',
  long_ondules: 'M106 217 Q78 195 94 161 Q73 118 104 89 Q145 55 180 73 Q217 53 254 93 Q279 122 264 162 Q282 195 254 217 L239 196 Q252 170 239 144 Q218 128 185 100 Q164 127 121 147 Q106 172 119 195Z',
  boucles: 'M107 167 Q84 140 104 111 Q91 77 130 75 Q151 51 175 73 Q203 52 226 78 Q268 79 255 119 Q274 144 252 175 L239 140 Q218 150 203 125 Q183 143 163 124 Q138 149 122 137Z',
  tresses: 'M107 165 Q96 96 145 82 Q180 64 215 82 Q264 96 253 165 L240 148 Q238 116 180 98 Q122 116 120 148Z',
  chignon: 'M108 169 Q86 111 120 88 Q180 57 240 88 Q274 111 252 169 L241 139 Q217 123 180 102 Q143 123 119 139Z',
} as const
const rearHair = {
  carre: 'M102 137 Q90 70 180 69 Q270 70 258 137 L268 262 Q224 285 180 273 Q136 285 92 262Z',
  mi_longs: 'M102 125 Q80 75 180 62 Q280 75 258 125 L269 229 Q261 270 285 295 Q260 324 224 303 L136 303 Q100 324 75 295 Q99 270 91 229Z',
  long_ondules: 'M97 137 Q74 80 132 65 Q180 46 228 65 Q286 80 263 137 Q285 174 270 205 Q291 241 273 275 Q293 313 266 347 Q244 363 216 336 L144 336 Q116 363 94 347 Q67 313 87 275 Q69 241 90 205 Q75 174 97 137Z',
  boucles: 'M100 130 Q75 99 112 76 Q119 48 154 60 Q180 41 206 60 Q241 48 248 76 Q285 99 260 130 Q285 155 265 180 Q284 206 260 230 Q279 259 250 280 Q264 307 231 315 L129 315 Q96 307 110 280 Q81 259 100 230 Q76 206 95 180 Q75 155 100 130Z',
  tresses: 'M103 138 Q88 75 180 67 Q272 75 257 138 L265 232 L242 283 L118 283 L95 232Z',
} as const
const eyes = {
  amande: { path: 'M130 184 Q148 166 168 183 Q151 199 130 184Z', ry: 8, cy: 183 },
  ronds: { path: 'M134 183 C134 164 165 164 165 183 C165 202 134 202 134 183Z', ry: 10, cy: 183 },
  grands: { path: 'M127 184 Q146 157 171 181 Q154 207 127 184Z', ry: 11, cy: 182 },
  allonges: { path: 'M125 185 Q147 174 173 179 Q150 195 125 185Z', ry: 5, cy: 184 },
  fins: { path: 'M129 184 Q147 176 167 182 Q149 192 129 184Z', ry: 4, cy: 183 },
  tombants: { path: 'M128 180 Q149 167 167 190 Q146 199 128 180Z', ry: 7, cy: 183 },
  releves: { path: 'M130 190 Q145 168 170 176 Q158 196 130 190Z', ry: 7, cy: 183 },
} as const

function Star({ x, y, size = 8 }: { x: number; y: number; size?: number }) {
  return <path d={`M${x} ${y-size} Q${x+2} ${y-2} ${x+size} ${y} Q${x+2} ${y+2} ${x} ${y+size} Q${x-2} ${y+2} ${x-size} ${y} Q${x-2} ${y-2} ${x} ${y-size}Z`} fill={gold} />
}

function Eyes({ config, color }: { config: AvatarConfigV3; color: string }) {
  const smiling = config.eyeId === 'souriants'
  const eye = smiling ? null : eyes[config.eyeId as keyof typeof eyes]
  return <g data-avatar-piece="eyes">
    {[false, true].map(right => <g key={String(right)} transform={right ? 'translate(360 0) scale(-1 1)' : undefined}>
      {eye ? <>
        <path d={eye.path} fill="#fff9ee" stroke={outline} strokeWidth="1.8" strokeLinejoin="round" />
        <ellipse cx="150" cy={eye.cy} rx="7.5" ry={eye.ry} fill={color} />
        <ellipse cx="150" cy={eye.cy} rx="3.5" ry={eye.ry * .65} fill="#302a2a" />
        <circle cx="148" cy={eye.cy-2.5} r={eye.ry < 6 ? 1.3 : 2.2} fill="#fff9ee" />
      </> : <path d="M130 186 Q148 164 168 186" fill="none" stroke={outline} strokeWidth="3.5" strokeLinecap="round" />}
      {config.baseId === 'femme' && <path d={smiling ? 'M130 185 L126 181' : 'M131 181 L126 177'} fill="none" stroke={outline} strokeWidth="2.5" strokeLinecap="round" />}
    </g>)}
  </g>
}

function Clothing({ config, color }: { config: AvatarConfigV3; color: string }) {
  const shirt = '#4b8993', dark = '#2d4148'
  return <g data-avatar-piece="clothing">
    <path d={config.baseId === 'homme' ? 'M16 460 Q27 364 95 338 L141 319 L219 319 L265 338 Q333 364 344 460Z' : 'M26 460 Q38 367 104 340 L148 319 L212 319 L256 340 Q322 367 334 460Z'} fill={color} />
    <path d="M49 460 L60 398 M311 460 L300 398" stroke={outline} strokeOpacity=".2" strokeWidth="2" strokeLinecap="round" />
    {config.clothingId === 'tshirt' && <g fill="none" stroke={dark} strokeOpacity=".3"><path d="M135 325 Q139 365 180 365 Q221 365 225 325" strokeWidth="5" /><path d="M55 391 L86 386 M305 391 L274 386" strokeWidth="3" /></g>}
    {config.clothingId === 'pull' && <g fill="none" stroke={dark} strokeOpacity=".3"><path d="M135 325 Q139 365 180 365 Q221 365 225 325" strokeWidth="10" /><path d="M130 333 Q139 374 180 374 Q221 374 230 333" strokeWidth="2" /><path d="M22 446 H338" strokeWidth="5" /></g>}
    {config.clothingId === 'capuche' && <g>
      <path d="M127 322 Q180 349 233 322 L239 460 L121 460Z" fill={shirt} />
      <ellipse cx="116" cy="332" rx="30" ry="32" fill={color} /><ellipse cx="244" cy="332" rx="30" ry="32" fill={color} />
      <path d="M136 319 Q110 335 139 366 L153 460 H94 L98 360 Q97 327 136 319Z M224 319 Q250 335 221 366 L207 460 H266 L262 360 Q263 327 224 319Z" fill={color} />
      <path d="M117 312 Q84 337 134 367 L153 460 M243 312 Q276 337 226 367 L207 460" fill="none" stroke="#c06c24" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />
      <path d="M133 377 L135 428 M227 377 L225 428" stroke="#fff4dd" strokeWidth="3" strokeLinecap="round" />
      <path d="M147 342 Q180 361 213 342" fill="none" stroke={dark} strokeOpacity=".3" strokeWidth="4" />
    </g>}
    {config.clothingId === 'chemise' && <g>
      <path d="M137 316 L180 348 L157 370 L119 333Z M223 316 L180 348 L203 370 L241 333Z" fill="#fff4dd" opacity=".6" stroke={outline} strokeOpacity=".2" strokeWidth="1.5" />
      <path d="M180 349 V460 M247 377 H284 V402 H247Z" fill="none" stroke={outline} strokeOpacity=".2" strokeWidth="2" />
      {[379,407,435].map(y => <circle key={y} cx="185" cy={y} r="2.5" fill={outline} opacity=".5" />)}
    </g>}
    {config.clothingId === 'veste' && <g>
      <path d="M135 320 Q180 351 225 320 L204 460 H156Z" fill="#f5ead8" />
      <path d="M128 317 L160 346 L174 460 L118 390 L133 373 L110 351Z M232 317 L200 346 L186 460 L242 390 L227 373 L250 351Z" fill={dark} opacity=".25" />
      <path d="M65 415 H105 M255 415 H295" stroke={dark} strokeOpacity=".4" strokeWidth="3" />
    </g>}
    {config.clothingId === 'tunique' && <g fill="none" stroke={gold} strokeWidth="3"><path d="M133 323 L180 368 L227 323 M180 368 V460" /><path d="M61 434 H299" strokeOpacity=".5" /></g>}
    {config.clothingId === 'mariniere' && <g fill="none" stroke="#fff3de" strokeWidth="10" strokeOpacity=".85"><path d="M112 347 H248 M78 372 H282 M57 397 H303 M42 422 H318 M30 447 H330" /><path d="M135 325 Q139 359 180 359 Q221 359 225 325" stroke={dark} strokeOpacity=".4" strokeWidth="4" /></g>}
    {config.clothingId === 'salopette' && <g>
      <path d="M109 335 L136 323 Q180 350 224 323 L251 335 L274 460 H86Z" fill="#fff0d4" />
      <path d="M109 335 L135 330 L148 382 H212 L225 330 L251 335 L234 387 L246 460 H114 L126 387Z" fill={color} />
      <path d="M135 380 H225 V460 H135Z" fill={color} stroke={outline} strokeOpacity=".25" strokeWidth="2" />
      <circle cx="143" cy="386" r="4" fill={gold} /><circle cx="217" cy="386" r="4" fill={gold} />
      <path d="M156 406 H204 V430 Q180 440 156 430Z" fill="none" stroke={outline} strokeOpacity=".3" strokeWidth="2" />
    </g>}
  </g>
}

export default function AvatarRendererV3({ config: input, decorative = false, className = '', detail }: {
  config: AvatarConfigV3; decorative?: boolean; className?: string; detail?: 'eyes' | 'mouth'
}) {
  const config = avatarConfigV3(input), accessory = config.accessories
  const skin = AVATAR_CATALOG_V3.skinId.find(item => item.id === config.skinId)!.color
  const hair = AVATAR_CATALOG_V3.hairColorId.find(item => item.id === config.hairColorId)!.color
  const clothing = AVATAR_CATALOG_V3.clothingColorId.find(item => item.id === config.clothingColorId)!.color
  const iris = AVATAR_CATALOG_V3.eyeColorId.find(item => item.id === config.eyeColorId)!.color
  const feminine = config.baseId === 'femme', lip = lips[config.skinId]
  const rear = config.hairId in rearHair ? rearHair[config.hairId as keyof typeof rearHair] : null
  return <svg viewBox={detail === 'eyes' ? '115 150 130 60' : detail === 'mouth' ? '130 224 100 54' : '0 0 360 460'} xmlns="http://www.w3.org/2000/svg" focusable="false"
    role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : 'Avatar cartoon personnel'} aria-hidden={decorative || undefined}
    data-avatar-render-version="3" className={`block h-auto w-full ${className}`}>
    <g data-avatar-piece="background">
      <rect width="360" height="460" rx="28" fill={config.backgroundId === 'clair' ? '#f5f6f7' : '#132a42'} />
      {config.backgroundId === 'celeste' && <g>
        <path d="M288 40 C366 134 359 269 283 333 C323 224 314 128 288 40Z" fill={gold} />
        <Star x={48} y={99} size={12} /><Star x={313} y={84} /><Star x={35} y={303} size={10} /><Star x={327} y={284} size={11} />
        {[[47,175],[301,159],[54,340],[290,329],[73,48]].map(([cx,cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.5" fill={cream} />)}
      </g>}
    </g>
    <g data-avatar-piece="hair-back" fill={hair}>
      {rear && <path d={rear} />}
      {config.hairId === 'chignon' && <g><ellipse cx="180" cy="63" rx="40" ry="30" /><path d="M153 49 Q171 30 201 48 M156 67 Q180 42 210 67" fill="none" stroke={cream} strokeOpacity=".15" strokeWidth="3" /></g>}
    </g>
    <g data-avatar-piece="body">
      <path d={feminine ? 'M151 251 L153 320 Q180 345 207 320 L209 251Z' : 'M141 251 L143 320 Q180 349 217 320 L219 251Z'} fill={skin} />
      <path d="M145 266 Q180 295 215 266 L213 293 Q180 319 147 293Z" fill={outline} opacity=".12" />
      <Clothing config={config} color={clothing} />
    </g>
    <g data-avatar-piece="face">
      <ellipse cx="108" cy="187" rx="16" ry="24" fill={skin} /><ellipse cx="252" cy="187" rx="16" ry="24" fill={skin} />
      <path d="M106 177 Q97 172 104 197 M254 177 Q263 172 256 197" fill="none" stroke={lip} strokeWidth="2.5" strokeLinecap="round" />
      <path d={facePaths[config.faceId]} fill={skin} />
      {feminine && <path d="M113 229 Q119 269 148 279 Q134 251 133 238Z M247 229 Q241 269 212 279 Q226 251 227 238Z" fill={lip} opacity=".09" />}
      <path d="M113 171 Q114 256 145 272 Q164 287 183 287 Q131 298 119 251Z" fill={outline} opacity=".05" />
      <ellipse cx="135" cy="217" rx="15" ry="7" fill={lip} opacity=".15" /><ellipse cx="225" cy="217" rx="15" ry="7" fill={lip} opacity=".15" />
      <path d="M132 160 Q146 155 163 160 M197 160 Q214 155 228 160" fill="none" stroke={hair} strokeWidth={feminine ? 4.5 : 7} strokeLinecap="round" />
      <Eyes config={config} color={iris} />
      <path d="M178 198 Q174 212 173 217 Q182 224 190 216" fill="none" stroke={lip} strokeOpacity=".65" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M176 211 Q183 214 188 210" fill="none" stroke="#fff5db" strokeOpacity=".4" strokeWidth="3" strokeLinecap="round" />
    </g>
    {accessory.beardId === 'courte' && <g data-avatar-piece="beard" fill={hair} opacity=".6"><path d="M116 218 Q118 261 145 276 Q180 298 215 276 Q242 261 244 218 L234 236 Q229 265 205 275 Q180 283 155 275 Q131 265 126 236Z" /><path d="M156 234 Q168 227 180 230 Q192 227 204 234 L201 239 Q180 234 159 239Z" /></g>}
    <g data-avatar-piece="mouth">
      {config.mouthId === 'doux' && <g><path d="M154 239 Q180 247 206 239 Q193 254 180 254 Q167 254 154 239Z" fill={lip} opacity=".55" /><path d="M154 239 Q180 249 206 239" fill="none" stroke={lip} strokeWidth="2.2" strokeLinecap="round" /></g>}
      {config.mouthId === 'dents' && <g><path d="M153 239 Q180 247 207 239 Q202 260 180 262 Q158 260 153 239Z" fill={lip} /><path d="M156 241 Q180 248 204 241 L200 250 Q180 257 160 250Z" fill="#fff9ed" /></g>}
      {config.mouthId === 'ouvert' && <g><path d="M157 241 Q180 248 203 241 Q201 267 180 268 Q159 267 157 241Z" fill="#713d39" /><path d="M160 243 Q180 249 200 243 L198 249 Q180 254 162 249Z" fill="#fff9ed" /><path d="M166 262 Q180 253 194 262 Q180 268 166 262Z" fill={lip} /></g>}
      {config.mouthId === 'coin' && <g><path d="M157 246 Q181 249 205 235 Q195 256 178 254Z" fill={lip} opacity=".5" /><path d="M156 246 Q183 250 205 235 M204 232 L209 234" fill="none" stroke={lip} strokeWidth="2.2" strokeLinecap="round" /></g>}
    </g>
    <g data-avatar-piece="hair-front" fill={hair}>
      {config.hairId !== 'sans' && <path d={frontHair[config.hairId]} />}
      {config.hairId === 'boucles' && [[109,92,22],[136,76,23],[166,72,24],[200,76,25],[232,95,24]].map(([cx,cy,r]) => <circle key={cx} cx={cx} cy={cy} r={r} />)}
      {config.hairId === 'meche' && <g fill="none" stroke={cream} strokeOpacity=".2" strokeWidth="2" strokeLinecap="round"><path d="M112 108 Q126 73 167 87 Q198 109 229 77 M124 88 Q151 71 178 89 M169 65 Q205 77 224 67" /></g>}
      {['carre','mi_longs','long_ondules','chignon','tresses'].includes(config.hairId) && <path d="M116 119 Q137 87 173 91 M189 88 Q222 95 242 125" fill="none" stroke={cream} strokeOpacity=".2" strokeWidth="2.5" strokeLinecap="round" />}
      {config.hairId === 'long_ondules' && <path d="M99 176 Q83 203 102 228 Q118 252 102 277 Q89 306 114 338 M261 175 Q279 203 258 228 Q242 253 258 279 Q272 306 247 339" fill="none" stroke={cream} strokeOpacity=".2" strokeWidth="3" strokeLinecap="round" />}
      {config.hairId === 'tresses' && <g stroke={outline} strokeOpacity=".25" strokeWidth="2">{[225,247,269,291,313,335].map(y => <g key={y}><ellipse cx="108" cy={y} rx="12" ry="15" transform={`rotate(-18 108 ${y})`} /><ellipse cx="252" cy={y} rx="12" ry="15" transform={`rotate(18 252 ${y})`} /></g>)}<path d="M98 347 H118 M242 347 H262" stroke={gold} strokeOpacity="1" strokeWidth="4" /></g>}
    </g>
    <g data-avatar-piece="accessories">
      {accessory.scarfId === 'celeste' && <g><path d="M141 309 Q180 332 219 309 L226 336 Q180 359 134 336Z M204 343 L235 405 L216 421 L185 351Z" fill="#395970" /><path d="M142 329 Q180 346 218 329 M204 362 L223 401" fill="none" stroke={gold} strokeWidth="2" /><Star x={169} y={335} size={5} /><Star x={217} y={384} size={6} /></g>}
      {accessory.jewelryId === 'pendentif_lune' && <g fill="none" stroke={gold} strokeWidth="2"><path d="M147 315 Q180 361 213 315" /><path d="M179 346 A10 10 0 1 0 190 359 A8 8 0 0 1 179 346Z" fill={gold} /></g>}
      {accessory.jewelryId === 'broche_etoile' && <g><circle cx="267" cy="373" r="14" fill={outline} opacity=".15" /><Star x={267} y={373} size={11} /></g>}
      {accessory.jewelryId === 'boucles_lune' && <g fill={gold} stroke={cream} strokeWidth="1"><circle cx="106" cy="202" r="3" /><circle cx="254" cy="202" r="3" /><path d="M103 207 A13 13 0 1 0 116 221 A11 11 0 0 1 103 207Z M251 207 A13 13 0 1 0 264 221 A11 11 0 0 1 251 207Z" /></g>}
      {accessory.eyewearId !== 'aucun' && <g fill="none" stroke={accessory.eyewearId === 'rondes' ? '#354354' : gold} strokeWidth="3"><circle cx="148" cy="185" r="23" /><circle cx="212" cy="185" r="23" /><path d="M171 183 Q180 177 189 183 M125 182 L109 175 M235 182 L251 175" /><path d="M132 176 L140 169 M196 176 L204 169" stroke="#fff9ed" strokeWidth="2" opacity=".65" /></g>}
      {accessory.headwearId === 'halo' && <g fill="none" stroke={gold}><ellipse cx="180" cy="36" rx="57" ry="14" strokeWidth="4" /><ellipse cx="180" cy="36" rx="65" ry="19" strokeWidth="1" opacity=".4" /></g>}
      {accessory.headwearId === 'couronne' && <g><path d="M120 111 Q180 75 240 111" fill="none" stroke={gold} strokeWidth="3" /><Star x={180} y={90} size={10} /><Star x={149} y={98} size={6} /><Star x={211} y={98} size={6} /></g>}
      {accessory.headwearId === 'barrette' && <g><path d="M226 120 L246 136 M229 125 L244 140" stroke={gold} strokeWidth="3" strokeLinecap="round" /><Star x={224} y={118} size={7} /></g>}
      {accessory.headwearId === 'casque' && <g fill="#354354" stroke={gold} strokeWidth="2"><path d="M98 181 Q91 78 180 74 Q269 78 262 181" fill="none" stroke="#354354" strokeWidth="10" /><rect x="91" y="166" width="21" height="40" rx="10" /><rect x="248" y="166" width="21" height="40" rx="10" /><path d="M101 175 V196 M259 175 V196" strokeWidth="3" /></g>}
    </g>
  </svg>
}
