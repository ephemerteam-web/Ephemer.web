// 🎨 Contrat de la nouvelle collection : version et identifiants fermés, aucune donnée d'identité.
import { AVATAR_CATALOG_V1 } from './avatars'

export const AVATAR_CATALOG_V3 = {
  baseId: [{ id: 'homme', label: 'Homme' }, { id: 'femme', label: 'Femme' }],
  faceId: AVATAR_CATALOG_V1.faceId,
  skinId: AVATAR_CATALOG_V1.skinId,
  mouthId: [{ id: 'doux', label: 'Sourire doux' }, { id: 'dents', label: 'Avec dents' }, { id: 'ouvert', label: 'Sourire ouvert' }, { id: 'coin', label: 'Sourire en coin' }],
  hairId: [
    { id: 'sans', label: 'Sans cheveux' }, { id: 'rase', label: 'Très courts' }, { id: 'meche', label: 'Mèche courte' },
    { id: 'carre', label: 'Carré' }, { id: 'mi_longs', label: 'Mi-longs' }, { id: 'long_ondules', label: 'Longs ondulés' },
    { id: 'boucles', label: 'Bouclés' }, { id: 'tresses', label: 'Tresses' }, { id: 'chignon', label: 'Chignon' },
  ],
  hairColorId: AVATAR_CATALOG_V1.hairColorId,
  eyeId: [
    { id: 'amande', label: 'Amande' }, { id: 'ronds', label: 'Ronds' }, { id: 'grands', label: 'Grands' },
    { id: 'allonges', label: 'Allongés' }, { id: 'fins', label: 'Fins' }, { id: 'tombants', label: 'Tombants' },
    { id: 'releves', label: 'Relevés' }, { id: 'souriants', label: 'Souriants' },
  ],
  eyeColorId: [
    { id: 'marron', label: 'Marron', color: '#78462a' }, { id: 'noisette', label: 'Noisette', color: '#947342' },
    { id: 'ambre', label: 'Ambre', color: '#bd8536' }, { id: 'vert', label: 'Vert', color: '#54846d' },
    { id: 'bleu', label: 'Bleu', color: '#4f88b0' }, { id: 'gris', label: 'Gris', color: '#788693' },
    { id: 'violet', label: 'Violet', color: '#8971a6' }, { id: 'noir', label: 'Noir', color: '#30353d' },
  ],
  clothingId: [
    { id: 'tshirt', label: 'T-shirt' }, { id: 'pull', label: 'Pull' }, { id: 'capuche', label: 'Sweat à capuche' },
    { id: 'chemise', label: 'Chemise' }, { id: 'veste', label: 'Veste' }, { id: 'tunique', label: 'Tunique' },
    { id: 'mariniere', label: 'Marinière' }, { id: 'salopette', label: 'Salopette' },
  ],
  clothingColorId: [...AVATAR_CATALOG_V1.clothingColorId,
    { id: 'creme', label: 'Crème', color: '#e9dfcb' }, { id: 'orange', label: 'Orange', color: '#f2a13d' }],
  backgroundId: [{ id: 'clair', label: 'Clair' }, { id: 'celeste', label: 'Céleste' }],
} as const

export const AVATAR_ACCESSORIES_V3 = {
  eyewearId: [{ id: 'aucun', label: 'Aucune' }, { id: 'rondes', label: 'Rondes' }, { id: 'dorees', label: 'Dorées' }],
  headwearId: [{ id: 'aucun', label: 'Aucun' }, { id: 'halo', label: 'Halo' }, { id: 'couronne', label: 'Couronne étoilée' }, { id: 'barrette', label: 'Barrette comète' }, { id: 'casque', label: 'Casque audio' }],
  jewelryId: [{ id: 'aucun', label: 'Aucun' }, { id: 'pendentif_lune', label: 'Pendentif lune' }, { id: 'broche_etoile', label: 'Broche étoile' }, { id: 'boucles_lune', label: 'Boucles de lune' }],
  scarfId: [{ id: 'aucun', label: 'Aucun' }, { id: 'celeste', label: 'Céleste' }],
  beardId: [{ id: 'aucun', label: 'Aucune' }, { id: 'courte', label: 'Courte' }],
} as const
type Catalog = typeof AVATAR_CATALOG_V3
type Accessories = typeof AVATAR_ACCESSORIES_V3
export type AvatarChoiceV3 = keyof Catalog
export type AvatarAccessoryV3 = keyof Accessories
export type AvatarConfigV3 = { format: 2; catalogVersion: 3; renderVersion: 3 } & {
  [K in AvatarChoiceV3]: Catalog[K][number]['id']
} & { accessories: { [K in AvatarAccessoryV3]: Accessories[K][number]['id'] } }

export const AVATAR_GROUPS_V3: ReadonlyArray<{ key: AvatarChoiceV3; label: string }> = [
  { key: 'baseId', label: 'Base du portrait' }, { key: 'faceId', label: 'Visage' }, { key: 'skinId', label: 'Teint' },
  { key: 'hairId', label: 'Coiffure' }, { key: 'hairColorId', label: 'Couleur des cheveux' },
  { key: 'eyeId', label: 'Forme des yeux' }, { key: 'eyeColorId', label: 'Couleur des yeux' },
  { key: 'mouthId', label: 'Bouche' }, { key: 'clothingId', label: 'Vêtement' },
  { key: 'clothingColorId', label: 'Couleur du vêtement' }, { key: 'backgroundId', label: 'Fond' },
]
export const AVATAR_ACCESSORY_GROUPS_V3: ReadonlyArray<{ key: AvatarAccessoryV3; label: string }> = [
  { key: 'eyewearId', label: 'Lunettes' }, { key: 'headwearId', label: 'Accessoire de tête' },
  { key: 'jewelryId', label: 'Bijou' }, { key: 'scarfId', label: 'Foulard' }, { key: 'beardId', label: 'Barbe' },
]
export const DEFAULT_AVATAR_V3: Readonly<AvatarConfigV3> = Object.freeze({
  format: 2, catalogVersion: 3, renderVersion: 3, baseId: 'homme', faceId: 'ovale', skinId: 'peche',
  mouthId: 'doux', hairId: 'meche', hairColorId: 'chataigne', eyeId: 'amande', eyeColorId: 'marron',
  clothingId: 'capuche', clothingColorId: 'orange', backgroundId: 'clair',
  accessories: Object.freeze({ eyewearId: 'aucun', headwearId: 'aucun', jewelryId: 'aucun', scarfId: 'aucun', beardId: 'aucun' }),
})
export const AVATAR_PRESETS_V3: ReadonlyArray<{ label: string; config: Readonly<AvatarConfigV3> }> = [
  { label: 'Homme — exemple', config: DEFAULT_AVATAR_V3 },
  { label: 'Femme — exemple', config: Object.freeze({ ...DEFAULT_AVATAR_V3, baseId: 'femme', hairId: 'long_ondules', hairColorId: 'cuivre', clothingId: 'chemise', clothingColorId: 'creme' }) },
]
function closedObject(input: unknown, keys: readonly string[]): input is Record<string, unknown> {
  return !!input && typeof input === 'object' && !Array.isArray(input) &&
    Object.keys(input).length === keys.length && Object.keys(input).every(key => keys.includes(key))
}
/** Copie canonique profonde : jamais de SVG/HTML libre, valeur de profil ou propriété inconnue. */
export function avatarConfigV3(input: unknown): AvatarConfigV3 {
  const keys = ['format', 'catalogVersion', 'renderVersion', ...Object.keys(AVATAR_CATALOG_V3), 'accessories']
  if (!closedObject(input, keys) || input.format !== 2 || input.catalogVersion !== 3 || input.renderVersion !== 3 ||
    AVATAR_GROUPS_V3.some(({ key }) => !AVATAR_CATALOG_V3[key].some(option => option.id === input[key])) ||
    !closedObject(input.accessories, Object.keys(AVATAR_ACCESSORIES_V3))) throw new Error('Avatar V3 invalide ou version non prise en charge.')
  const accessories = input.accessories
  if (AVATAR_ACCESSORY_GROUPS_V3.some(({ key }) => !AVATAR_ACCESSORIES_V3[key].some(option => option.id === accessories[key]))) {
    throw new Error('Accessoire d’avatar invalide.')
  }
  return {
    format: 2, catalogVersion: 3, renderVersion: 3,
    baseId: input.baseId as AvatarConfigV3['baseId'], faceId: input.faceId as AvatarConfigV3['faceId'],
    skinId: input.skinId as AvatarConfigV3['skinId'], mouthId: input.mouthId as AvatarConfigV3['mouthId'],
    hairId: input.hairId as AvatarConfigV3['hairId'], hairColorId: input.hairColorId as AvatarConfigV3['hairColorId'],
    eyeId: input.eyeId as AvatarConfigV3['eyeId'], eyeColorId: input.eyeColorId as AvatarConfigV3['eyeColorId'],
    clothingId: input.clothingId as AvatarConfigV3['clothingId'], clothingColorId: input.clothingColorId as AvatarConfigV3['clothingColorId'],
    backgroundId: input.backgroundId as AvatarConfigV3['backgroundId'],
    accessories: {
      eyewearId: accessories.eyewearId as AvatarConfigV3['accessories']['eyewearId'],
      headwearId: accessories.headwearId as AvatarConfigV3['accessories']['headwearId'],
      jewelryId: accessories.jewelryId as AvatarConfigV3['accessories']['jewelryId'],
      scarfId: accessories.scarfId as AvatarConfigV3['accessories']['scarfId'],
      beardId: accessories.beardId as AvatarConfigV3['accessories']['beardId'],
    },
  }
}
