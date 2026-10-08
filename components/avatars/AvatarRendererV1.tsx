// 🎨 Illustration SVG originale V1, sans ressource distante ni identifiant SVG partagé.
import { AVATAR_CATALOG_V1, avatarConfig, type AvatarConfigV1 } from '@/lib/avatars'

export default function AvatarRendererV1({ config, decorative = false, className = '' }: {
  config: AvatarConfigV1; decorative?: boolean; className?: string
}) {
  const avatar = avatarConfig(config)
  const skin = AVATAR_CATALOG_V1.skinId.find(option => option.id === avatar.skinId)!.color
  const hair = AVATAR_CATALOG_V1.hairColorId.find(option => option.id === avatar.hairColorId)!.color
  const clothing = AVATAR_CATALOG_V1.clothingColorId.find(option => option.id === avatar.clothingColorId)!.color
  const outline = '#302e46', gold = '#e5bd68'
  return <svg viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg" focusable="false"
    role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : 'Avatar illustré personnel'}
    data-avatar-render-version="1" className={'block h-auto w-full ' + className}>
    <rect x="2" y="2" width="156" height="176" rx="44" fill="#eef0f8" />
    <path d="M16 54l3-7 3 7 7 3-7 3-3 7-3-7-7-3zM132 120l2-5 2 5 5 2-5 2-2 5-2-5-5-2z" fill={gold} />
    {avatar.hairId === 'long' && <path d="M44 49Q80 13 116 49L123 140H37z" fill={hair} />}
    {avatar.hairId === 'carre' && <path d="M44 50Q80 17 116 50L119 111Q80 124 41 111z" fill={hair} />}
    <path d="M24 176v-19q0-34 41-38h30q41 4 41 38v19z" fill={clothing} />
    <path d="M68 99h24v26q-12 14-24 0z" fill={skin} />
    {avatar.clothingId === 'pull' && <path d="M60 121q20 27 40 0" fill="none" stroke="#eef0f8" strokeWidth="4" />}
    {avatar.clothingId === 'tunique' && <path d="M60 120l20 26 20-26M80 147v29" fill="none" stroke={gold} strokeWidth="3" />}
    {avatar.clothingId === 'veste' && <><path d="M65 124l15 17 15-17-15 52z" fill="#fbf7ef" /><path d="M56 126l10 23-8 11 15 16M104 126l-10 23 8 11-15 16" fill="none" stroke={outline} strokeWidth="2" /></>}
    <ellipse cx="46" cy="79" rx="6" ry="10" fill={skin} /><ellipse cx="114" cy="79" rx="6" ry="10" fill={skin} />
    {avatar.faceId === 'ovale' && <ellipse cx="80" cy="76" rx="34" ry="40" fill={skin} />}
    {avatar.faceId === 'rond' && <ellipse cx="80" cy="77" rx="37" ry="36" fill={skin} />}
    {avatar.faceId === 'anguleux' && <path d="M48 49Q80 27 112 49v39l-14 21-18 8-18-8-14-21z" fill={skin} />}
    {avatar.hairId === 'rase' && <path d="M47 62Q46 32 80 32t33 30q-33-18-66 0" fill={hair} />}
    {avatar.hairId === 'court' && <path d="M46 68V49q8-25 38-20l26 12 6 28-14-17q-17 7-40-3z" fill={hair} />}
    {avatar.hairId === 'carre' && <path d="M44 65q-3-35 36-35t36 35l-18-13-6 11-29-9-19 16z" fill={hair} />}
    {avatar.hairId === 'long' && <path d="M44 73q-4-42 36-43t36 43l-16-18-14-10-20 9-22 25z" fill={hair} />}
    {avatar.hairId === 'boucles' && <g fill={hair}><circle cx="49" cy="52" r="14" /><circle cx="64" cy="39" r="15" /><circle cx="84" cy="36" r="16" /><circle cx="103" cy="44" r="15" /><circle cx="115" cy="60" r="12" /></g>}
    <g fill={outline}><circle cx="66" cy="78" r="3" /><circle cx="94" cy="78" r="3" /></g>
    <path d="M78 82l-3 10h7M69 99q11 8 22 0" fill="none" stroke={outline} strokeWidth="2" strokeLinecap="round" />
    {avatar.accessoryId === 'lune' && <path d="M121 88a9 9 0 1 0 7 14 8 8 0 0 1-7-14" fill={gold} stroke={outline} strokeWidth="1" />}
    {avatar.accessoryId === 'etoile' && <path d="M112 46l3-8 3 8 8 3-8 3-3 8-3-8-8-3z" fill={gold} stroke={outline} strokeWidth="1" />}
    {avatar.accessoryId === 'halo' && <ellipse cx="80" cy="17" rx="29" ry="8" fill="none" stroke={gold} strokeWidth="4" />}
  </svg>
}
