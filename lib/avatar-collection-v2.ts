// 🌙 Collection céleste autonome : la V1 enregistrée/publiée reste figée.
import { AVATAR_CATALOG_V1, AVATAR_GROUPS } from './avatars'

export const AVATAR_CATALOG_V2 = {
  ...AVATAR_CATALOG_V1,
  hairId: [...AVATAR_CATALOG_V1.hairId, { id: 'ondulations', label: 'Ondulations' }, { id: 'meche', label: 'Mèche souple' }, { id: 'tresses', label: 'Tresses' }],
  clothingId: [...AVATAR_CATALOG_V1.clothingId, { id: 'capuche', label: 'À capuche' }],
  clothingColorId: [...AVATAR_CATALOG_V1.clothingColorId, { id: 'creme', label: 'Crème', color: '#e9dfcb' }],
  accessoryId: [
    { id: 'aucun', label: 'Aucun' }, { id: 'lune', label: 'Pendentif lune' },
    { id: 'etoile', label: 'Broche étoile' }, { id: 'halo', label: 'Halo doré' },
    { id: 'lunettes', label: 'Lunettes rondes' }, { id: 'lunettes_dorees', label: 'Lunettes dorées' },
    { id: 'boucles_lune', label: 'Boucles de lune' }, { id: 'couronne', label: 'Couronne étoilée' },
    { id: 'barrette', label: 'Barrette comète' }, { id: 'foulard', label: 'Foulard céleste' },
    { id: 'casque', label: 'Casque audio' }, { id: 'barbe', label: 'Barbe courte' },
  ],
} as const
type Catalog = typeof AVATAR_CATALOG_V2
export type AvatarConfigV2 = { format: 1; catalogVersion: 2; renderVersion: 2 } & {
  [K in keyof Catalog]: Catalog[K][number]['id']
}
export const DEFAULT_AVATAR_V2: Readonly<AvatarConfigV2> = Object.freeze({
  format: 1, catalogVersion: 2, renderVersion: 2, faceId: 'ovale', skinId: 'peche',
  hairId: 'ondulations', hairColorId: 'cuivre', clothingId: 'capuche', clothingColorId: 'creme', accessoryId: 'aucun',
})
export const AVATAR_PRESETS_V2: ReadonlyArray<{ label: string; config: Readonly<AvatarConfigV2> }> = [
  { label: 'Reflets de lune', config: DEFAULT_AVATAR_V2 },
  { label: 'Éclat solaire', config: Object.freeze({ ...DEFAULT_AVATAR_V2, faceId: 'anguleux', skinId: 'sable', hairId: 'meche', hairColorId: 'chataigne', clothingId: 'pull', clothingColorId: 'indigo', accessoryId: 'barbe' }) },
]
/** Catalogue fermé, sans couleur libre, markup ou donnée de profil. Pas de persistance V2 avant validation du schéma. */
export function avatarCollectionConfig(input: unknown): AvatarConfigV2 {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Avatar de collection invalide.')
  const value = input as Record<string, unknown>
  const keys = ['format', 'catalogVersion', 'renderVersion', ...AVATAR_GROUPS.map(group => group.key)]
  if (Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key)) ||
    value.format !== 1 || value.catalogVersion !== 2 || value.renderVersion !== 2 ||
    AVATAR_GROUPS.some(({ key }) => !AVATAR_CATALOG_V2[key].some(option => option.id === value[key]))) {
    throw new Error('Avatar de collection invalide ou version non prise en charge.')
  }
  return {
    format: 1, catalogVersion: 2, renderVersion: 2,
    faceId: value.faceId as AvatarConfigV2['faceId'], skinId: value.skinId as AvatarConfigV2['skinId'],
    hairId: value.hairId as AvatarConfigV2['hairId'], hairColorId: value.hairColorId as AvatarConfigV2['hairColorId'],
    clothingId: value.clothingId as AvatarConfigV2['clothingId'], clothingColorId: value.clothingColorId as AvatarConfigV2['clothingColorId'],
    accessoryId: value.accessoryId as AvatarConfigV2['accessoryId'],
  }
}
