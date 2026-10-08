// 🌙 Catalogue V1 figé : changer une illustration publiée exige un nouveau moteur.
export const AVATAR_CATALOG_V1 = {
  faceId: [{ id: 'ovale', label: 'Ovale' }, { id: 'rond', label: 'Rond' }, { id: 'anguleux', label: 'Anguleux' }],
  skinId: [
    { id: 'porcelaine', label: 'Porcelaine', color: '#f8dfcd' }, { id: 'peche', label: 'Pêche', color: '#ecc3a6' },
    { id: 'sable', label: 'Sable', color: '#dab18b' }, { id: 'miel', label: 'Miel', color: '#c99565' },
    { id: 'ambre', label: 'Ambre', color: '#ad774e' }, { id: 'cuivre', label: 'Cuivre', color: '#8e593e' },
    { id: 'brun', label: 'Brun', color: '#69432f' }, { id: 'ebene', label: 'Ébène', color: '#422b24' },
  ],
  hairId: [
    { id: 'sans', label: 'Sans cheveux' }, { id: 'rase', label: 'Très courts' }, { id: 'court', label: 'Courts' },
    { id: 'carre', label: 'Carré' }, { id: 'long', label: 'Longs' }, { id: 'boucles', label: 'Bouclés' },
  ],
  hairColorId: [
    { id: 'nuit', label: 'Noir nuit', color: '#252838' }, { id: 'chataigne', label: 'Châtaigne', color: '#614334' },
    { id: 'cuivre', label: 'Roux cuivré', color: '#a95636' }, { id: 'soleil', label: 'Blond doré', color: '#d1a558' },
    { id: 'argent', label: 'Argent', color: '#c8cedb' }, { id: 'prune', label: 'Prune', color: '#765275' },
  ],
  clothingId: [{ id: 'pull', label: 'Pull' }, { id: 'tunique', label: 'Tunique' }, { id: 'veste', label: 'Veste' }],
  clothingColorId: [
    { id: 'indigo', label: 'Indigo', color: '#44568e' }, { id: 'sauge', label: 'Sauge', color: '#5e8c80' },
    { id: 'rose', label: 'Rose', color: '#af6684' }, { id: 'ocre', label: 'Ocre', color: '#bc8d3f' },
    { id: 'brume', label: 'Brume', color: '#8994ad' }, { id: 'prune', label: 'Prune', color: '#725779' },
  ],
  accessoryId: [{ id: 'aucun', label: 'Aucun' }, { id: 'lune', label: 'Lune' }, { id: 'etoile', label: 'Étoile' }, { id: 'halo', label: 'Halo' }],
} as const
type Catalog = typeof AVATAR_CATALOG_V1
export type AvatarChoice = keyof Catalog
export type AvatarConfigV1 = { format: 1; catalogVersion: 1; renderVersion: 1 } & {
  [K in AvatarChoice]: Catalog[K][number]['id']
}
export const DEFAULT_AVATAR_V1: Readonly<AvatarConfigV1> = Object.freeze({
  format: 1, catalogVersion: 1, renderVersion: 1, faceId: 'ovale', skinId: 'miel',
  hairId: 'court', hairColorId: 'nuit', clothingId: 'pull', clothingColorId: 'indigo', accessoryId: 'aucun',
})
export const AVATAR_GROUPS: ReadonlyArray<{ key: AvatarChoice; label: string }> = [
  { key: 'faceId', label: 'Visage' }, { key: 'skinId', label: 'Teint' }, { key: 'hairId', label: 'Coiffure' },
  { key: 'hairColorId', label: 'Couleur des cheveux' }, { key: 'clothingId', label: 'Vêtement' },
  { key: 'clothingColorId', label: 'Couleur du vêtement' }, { key: 'accessoryId', label: 'Accessoire céleste' },
]
/** Projection fermée et copie indépendante : aucun profil, markup ou couleur arbitraire. */
export function avatarConfig(input: unknown): AvatarConfigV1 {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Avatar invalide.')
  const value = input as Record<string, unknown>
  const keys = ['format', 'catalogVersion', 'renderVersion', ...AVATAR_GROUPS.map(group => group.key)]
  if (Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key)) ||
    value.format !== 1 || value.catalogVersion !== 1 || value.renderVersion !== 1 ||
    AVATAR_GROUPS.some(({ key }) => !AVATAR_CATALOG_V1[key].some(option => option.id === value[key]))) {
    throw new Error('Avatar invalide ou version non prise en charge.')
  }
  return {
    format: 1, catalogVersion: 1, renderVersion: 1,
    faceId: value.faceId as AvatarConfigV1['faceId'], skinId: value.skinId as AvatarConfigV1['skinId'],
    hairId: value.hairId as AvatarConfigV1['hairId'], hairColorId: value.hairColorId as AvatarConfigV1['hairColorId'],
    clothingId: value.clothingId as AvatarConfigV1['clothingId'], clothingColorId: value.clothingColorId as AvatarConfigV1['clothingColorId'],
    accessoryId: value.accessoryId as AvatarConfigV1['accessoryId'],
  }
}
/** Seulement pour l'éditeur/profil. Une publication doit utiliser le validateur strict. */
export function recoverProfileAvatar(input: unknown): { config: AvatarConfigV1; notice: string | null } {
  if (input == null) return { config: avatarConfig(DEFAULT_AVATAR_V1), notice: null }
  try { return { config: avatarConfig(input), notice: null } }
  catch { return { config: avatarConfig(DEFAULT_AVATAR_V1), notice: 'Cette configuration ne peut pas être reprise. Un avatar par défaut est affiché ; aucune donnée enregistrée n’a été remplacée.' } }
}
