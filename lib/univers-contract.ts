// 🌌 Contrats distincts pour les valeurs personnelles et la projection partagée.
import { uuidEtoile, emailEtoile } from './etoiles-contract'
import { avatarRenderConfig, type AvatarRenderConfig } from './avatar-render-config'

export const UNIVERS_TEXTES = ['presentation', 'passions', 'plaisirs', 'eviter'] as const
export const UNIVERS_PARTAGES = [...UNIVERS_TEXTES, 'anniversaire', 'annee', 'email', 'telephone', 'avatar'] as const
export type TexteUnivers = typeof UNIVERS_TEXTES[number]
export type PartageUnivers = typeof UNIVERS_PARTAGES[number]
export type AnniversaireUnivers = { jour: number; mois: number; annee: number | null }
export type ValeursUnivers = Record<TexteUnivers, string> & { anniversaire: AnniversaireUnivers | null; email: string; telephone: string }
export type MonUnivers = { revision: number; modeIdentite: 'prenom' | 'pseudonyme'; identite: string; valeurs: ValeursUnivers; partage: Record<PartageUnivers, boolean> }
export type UniversPartage = { identite: string; champs: Partial<Record<TexteUnivers | 'email' | 'telephone', string>> & { anniversaire?: { jour: number; mois: number; annee?: number }; avatar?: AvatarRenderConfig } }
export type CommandeUnivers = { action: 'enregistrer'; revision: number; operation: string; donnees: Omit<MonUnivers, 'revision'> } | { action: 'masquer'; revision: number; operation: string; donnees: Record<string, never> }
export const UNIVERS_LIMITES = { texte: 1000, identite: 80, email: 320, telephone: 32, corps: 32768, valeurs: 24576 } as const
export const PARTAGE_UNIVERS_VIDE: Readonly<Record<PartageUnivers, boolean>> = Object.freeze(Object.fromEntries(UNIVERS_PARTAGES.map(k => [k, false])) as Record<PartageUnivers, boolean>)

function objet(value: unknown, keys: readonly string[], facultatives = false): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Objet univers invalide.')
  const row = value as Record<string, unknown>, actual = Object.keys(row)
  if ((!facultatives && actual.length !== keys.length) || actual.some(k => !keys.includes(k))) throw new Error('Champs univers invalides.')
  return row
}
function texte(value: unknown, maximum: number, nonVide = false) {
  if (typeof value !== 'string' || Array.from(value).length > maximum || Array.from(value).some(char => { const code = char.codePointAt(0)!; return code >= 0xd800 && code <= 0xdfff }) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value) || (nonVide && !value.trim())) throw new Error('Texte univers invalide ou trop long.')
  return value
}
function revisionUnivers(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Révision univers invalide.')
  return value
}
export function anniversaireUnivers(value: unknown): AnniversaireUnivers | null {
  if (value === null) return null
  const data = objet(value, ['jour', 'mois', 'annee'])
  const { jour, mois, annee } = data
  if (typeof jour !== 'number' || !Number.isInteger(jour) || jour < 1 || typeof mois !== 'number' || !Number.isInteger(mois) || mois < 1 || mois > 12 ||
    (annee !== null && (typeof annee !== 'number' || !Number.isInteger(annee) || annee < 1 || annee > 9999))) throw new Error('Anniversaire invalide.')
  // Sans année, le 29 février est légitime. Aucun millésime inventé n'est enregistré.
  const year = annee ?? 2000, leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (jour > days[mois - 1]) throw new Error('Ce jour n’existe pas dans le mois choisi.')
  return { jour, mois, annee }
}
export function donneesUnivers(value: unknown): Omit<MonUnivers, 'revision'> {
  const row = objet(value, ['modeIdentite', 'identite', 'valeurs', 'partage'])
  if (row.modeIdentite !== 'prenom' && row.modeIdentite !== 'pseudonyme') throw new Error('Choix d’identité invalide.')
  const identite = texte(row.identite, UNIVERS_LIMITES.identite, true)
  if (identite !== identite.trim()) throw new Error('Retire les espaces autour de ton identité.')
  const input = objet(row.valeurs, [...UNIVERS_TEXTES, 'anniversaire', 'email', 'telephone'])
  const valeurs = { presentation: texte(input.presentation, 1000), passions: texte(input.passions, 1000), plaisirs: texte(input.plaisirs, 1000), eviter: texte(input.eviter, 1000),
    anniversaire: anniversaireUnivers(input.anniversaire), email: texte(input.email, 320), telephone: texte(input.telephone, 32) }
  if (valeurs.email && emailEtoile(valeurs.email) !== valeurs.email) throw new Error('Adresse univers invalide : utilise sa forme normalisée.')
  if (valeurs.telephone && !/^\+?[0-9][0-9 ().-]*$/u.test(valeurs.telephone)) throw new Error('Numéro de téléphone invalide.')
  if (new TextEncoder().encode(JSON.stringify(valeurs)).byteLength > UNIVERS_LIMITES.valeurs) throw new Error('Univers trop volumineux.')
  const flags = objet(row.partage, UNIVERS_PARTAGES), partage = { ...PARTAGE_UNIVERS_VIDE }
  for (const key of UNIVERS_PARTAGES) { if (typeof flags[key] !== 'boolean') throw new Error('Permission univers invalide.'); partage[key] = flags[key] }
  if (partage.annee && (!partage.anniversaire || valeurs.anniversaire?.annee == null)) throw new Error('Partager l’année exige un anniversaire et une année renseignés.')
  if (partage.anniversaire && !valeurs.anniversaire) throw new Error('Renseigne l’anniversaire avant de le partager.')
  return { modeIdentite: row.modeIdentite, identite, valeurs, partage }
}
export function monUnivers(value: unknown): MonUnivers {
  const row = objet(value, ['revision', 'modeIdentite', 'identite', 'valeurs', 'partage'])
  return { revision: revisionUnivers(row.revision), ...donneesUnivers({ modeIdentite: row.modeIdentite, identite: row.identite, valeurs: row.valeurs, partage: row.partage }) }
}
export function universInitial(identite: string): MonUnivers {
  return monUnivers({ revision: 0, modeIdentite: 'prenom', identite: identite.trim() || 'Une étoile', valeurs: { presentation: '', passions: '', plaisirs: '', eviter: '', anniversaire: null, email: '', telephone: '' }, partage: { ...PARTAGE_UNIVERS_VIDE } })
}
export function commandeUnivers(value: unknown): CommandeUnivers {
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > UNIVERS_LIMITES.corps) throw new Error('Commande univers trop volumineuse.')
  const row = objet(value, ['action', 'revision', 'operation', 'donnees']), revision = revisionUnivers(row.revision), operation = uuidEtoile(row.operation)
  if (revision === Number.MAX_SAFE_INTEGER) throw new Error('La limite de révision est atteinte.')
  if (row.action === 'enregistrer') return { action: row.action, revision, operation, donnees: donneesUnivers(row.donnees) }
  if (row.action === 'masquer') { objet(row.donnees, []); return { action: row.action, revision, operation, donnees: {} } }
  throw new Error('Action univers inconnue.')
}
export function resultatUnivers(value: unknown): { ok: true; revision: number } {
  const row = objet(value, ['ok', 'revision'])
  if (row.ok !== true) throw new Error('Enregistrement univers non confirmé.')
  return { ok: true, revision: revisionUnivers(row.revision) }
}
export function apercuUnivers(value: MonUnivers, avatarEnregistre: unknown = null): UniversPartage {
  const owner = monUnivers(value), champs: UniversPartage['champs'] = {}
  for (const key of [...UNIVERS_TEXTES, 'email', 'telephone'] as const) if (owner.partage[key] && owner.valeurs[key]) champs[key] = owner.valeurs[key]
  const birthday = owner.valeurs.anniversaire
  if (owner.partage.anniversaire && birthday) champs.anniversaire = { jour: birthday.jour, mois: birthday.mois, ...(owner.partage.annee && birthday.annee !== null ? { annee: birthday.annee } : {}) }
  // Pas de publication du défaut/repli de l'éditeur personnel.
  if (owner.partage.avatar && avatarEnregistre !== null) { try { champs.avatar = avatarRenderConfig(avatarEnregistre) } catch { /* Initiale, aucune configuration invalide transmise. */ } }
  return { identite: owner.identite, champs }
}
export function universPartage(value: unknown): UniversPartage {
  const row = objet(value, ['identite', 'champs']), input = objet(row.champs, [...UNIVERS_TEXTES, 'anniversaire', 'email', 'telephone', 'avatar'], true)
  const champs: UniversPartage['champs'] = {}
  for (const key of [...UNIVERS_TEXTES, 'email', 'telephone'] as const) if (key in input) {
    champs[key] = texte(input[key], key === 'email' ? 320 : key === 'telephone' ? 32 : 1000, true)
    if (key === 'email' && emailEtoile(champs[key]) !== champs[key]) throw new Error('Adresse partagée invalide.')
    if (key === 'telephone' && !/^\+?[0-9][0-9 ().-]*$/u.test(champs[key]!)) throw new Error('Téléphone partagé invalide.')
  }
  if ('anniversaire' in input) {
    const birthday = objet(input.anniversaire, ['jour', 'mois', 'annee'], true)
    if (!('jour' in birthday) || !('mois' in birthday) || ('annee' in birthday && birthday.annee === null)) throw new Error('Anniversaire partagé invalide.')
    const validated = anniversaireUnivers({ jour: birthday.jour, mois: birthday.mois, annee: birthday.annee ?? null })!
    champs.anniversaire = { jour: validated.jour, mois: validated.mois, ...('annee' in birthday ? { annee: validated.annee! } : {}) }
  }
  if ('avatar' in input) champs.avatar = avatarRenderConfig(input.avatar)
  return { identite: texte(row.identite, 80, true), champs }
}
