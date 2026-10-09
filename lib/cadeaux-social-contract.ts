// 🎁 Contrats 10C distincts pour le propriétaire, la consultation éligible et la sélection.
import { monUnivers, donneesUnivers, commandeUnivers, apercuUnivers, type MonUnivers, type CommandeUnivers } from './univers-contract'
import { uuidEtoile, contactIdEtoile } from './etoiles-contract'

export const CHAMPS_IA_CADEAUX = ['identite', 'presentation', 'passions', 'plaisirs', 'eviter'] as const
export type ChampIACadeaux = typeof CHAMPS_IA_CADEAUX[number]
export type PermissionsIACadeaux = Record<ChampIACadeaux, boolean>
export type MonUniversCadeaux = MonUnivers & { iaCadeaux: PermissionsIACadeaux }
export type CommandeUniversCadeaux = Omit<Extract<CommandeUnivers, { action: 'enregistrer' }>, 'donnees'> & { donnees: Omit<MonUniversCadeaux, 'revision'> } | Extract<CommandeUnivers, { action: 'masquer' }>
export type UniversPourCadeaux = { revision: number; revisionRelation: number; champs: Partial<Record<ChampIACadeaux, string>> }
export type SelectionUniversCadeaux = { etoileId: string; revision: number; revisionRelation: number; champs: ChampIACadeaux[] }
export const IA_CADEAUX_VIDE: Readonly<PermissionsIACadeaux> = Object.freeze({ identite: false, presentation: false, passions: false, plaisirs: false, eviter: false })
export const IA_CADEAUX_NOTICE = 'Pour les cadeaux uniquement, les champs de l’univers que l’auteur a autorisés et que tu coches pour cette demande sont relus par le serveur puis transmis à Mammouth AI. Identité sociale, présentation, passions, plaisirs et préférences à éviter ont chacun leur accord. Les coordonnées, anniversaire et avatar structurés sont exclus. Les textes libres peuvent contenir des informations personnelles : vérifie leur contenu. Une révocation constatée au retour écarte le résultat, sans annuler les données déjà transmises.'

function objet(value: unknown, keys: readonly string[], partial = false): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Objet cadeaux invalide.')
  const row = value as Record<string, unknown>, actual = Object.keys(row)
  if ((!partial && actual.length !== keys.length) || actual.some(k => !keys.includes(k))) throw new Error('Champs cadeaux invalides.')
  return row
}
function revision(value: unknown, minimum = 0) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) throw new Error('Révision cadeaux invalide.')
  return value
}
export function permissionsIACadeaux(value: unknown, partage: MonUnivers['partage']): PermissionsIACadeaux {
  const row = objet(value, CHAMPS_IA_CADEAUX), result = { ...IA_CADEAUX_VIDE }
  for (const key of CHAMPS_IA_CADEAUX) {
    if (typeof row[key] !== 'boolean' || (row[key] && key !== 'identite' && !partage[key])) throw new Error('Autorisation IA incompatible avec le partage.')
    result[key] = row[key]
  }
  return result
}
export function donneesUniversCadeaux(value: unknown): Omit<MonUniversCadeaux, 'revision'> {
  const row = objet(value, ['modeIdentite', 'identite', 'valeurs', 'partage', 'iaCadeaux'])
  const owner = donneesUnivers({ modeIdentite: row.modeIdentite, identite: row.identite, valeurs: row.valeurs, partage: row.partage })
  return { ...owner, iaCadeaux: permissionsIACadeaux(row.iaCadeaux, owner.partage) }
}
export function monUniversCadeaux(value: unknown): MonUniversCadeaux {
  const row = objet(value, ['revision', 'modeIdentite', 'identite', 'valeurs', 'partage', 'iaCadeaux'])
  const { revision: expected, ...data } = row
  return { revision: revision(expected), ...donneesUniversCadeaux(data) }
}
export function commandeUniversCadeaux(value: unknown): CommandeUniversCadeaux {
  const row = objet(value, ['action', 'revision', 'operation', 'donnees'])
  if (row.action === 'masquer') return commandeUnivers(row) as Extract<CommandeUnivers, { action: 'masquer' }>
  const data = donneesUniversCadeaux(row.donnees)
  const { iaCadeaux, ...base } = data
  const command = commandeUnivers({ ...row, donnees: base })
  if (command.action !== 'enregistrer') throw new Error('Action univers inconnue.')
  return { ...command, donnees: { ...command.donnees, iaCadeaux } }
}
export function apercuUniversCadeaux(value: MonUniversCadeaux, avatar: unknown = null) {
  const owner = monUniversCadeaux(value)
  const { revision, modeIdentite, identite, valeurs, partage } = owner
  return apercuUnivers({ revision, modeIdentite, identite, valeurs, partage }, avatar)
}
// Premier brouillon uniquement. Une réponse propriétaire ancienne n'est jamais normalisée ainsi.
export function universCadeauxInitial(value: MonUnivers): MonUniversCadeaux {
  return { ...monUnivers(value), iaCadeaux: { ...IA_CADEAUX_VIDE } }
}
export function selectionUniversCadeaux(value: unknown): SelectionUniversCadeaux {
  const row = objet(value, ['etoileId', 'revision', 'revisionRelation', 'champs'])
  if (!Array.isArray(row.champs) || row.champs.length < 1 || row.champs.length > 5 || new Set(row.champs).size !== row.champs.length ||
    row.champs.some(k => typeof k !== 'string' || !(CHAMPS_IA_CADEAUX as readonly string[]).includes(k))) throw new Error('Sélection IA invalide.')
  return { etoileId: uuidEtoile(row.etoileId), revision: revision(row.revision), revisionRelation: revision(row.revisionRelation, 1),
    champs: CHAMPS_IA_CADEAUX.filter(k => (row.champs as unknown[]).includes(k)) }
}
export function universPourCadeaux(value: unknown): UniversPourCadeaux {
  const row = objet(value, ['revision', 'revisionRelation', 'champs']), input = objet(row.champs, CHAMPS_IA_CADEAUX, true)
  const champs: UniversPourCadeaux['champs'] = {}
  for (const key of CHAMPS_IA_CADEAUX) if (key in input) {
    const text = input[key]
    if (typeof text !== 'string' || !text.trim() || Array.from(text).length > (key === 'identite' ? 80 : 1000) ||
      Array.from(text).some(c => { const n = c.codePointAt(0)!; return n >= 0xd800 && n <= 0xdfff }) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)) throw new Error('Texte cadeaux invalide.')
    champs[key] = text
  }
  return { revision: revision(row.revision), revisionRelation: revision(row.revisionRelation, 1), champs }
}
export function contactCadeaux(value: unknown): string | null {
  if (value === null || value === undefined) return null
  // Compatibilité des contacts privés actuels, uniquement si la conversion est exacte.
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Contact cadeaux invalide.')
    return contactIdEtoile(String(value))
  }
  return contactIdEtoile(value)
}
export function selectionDepuisProjection(etoileId: string, projection: UniversPourCadeaux, fields: unknown): SelectionUniversCadeaux {
  const row = universPourCadeaux(projection)
  const selected = selectionUniversCadeaux({ etoileId, revision: row.revision, revisionRelation: row.revisionRelation, champs: fields })
  if (selected.champs.some(k => !(k in row.champs))) throw new Error('Sélection indisponible : actualise les informations.')
  return selected
}
export function sourceCadeauxAutorisee(value: unknown, selection: SelectionUniversCadeaux): UniversPourCadeaux {
  const row = universPourCadeaux(value), selected = selectionUniversCadeaux(selection)
  if (row.revision !== selected.revision || row.revisionRelation !== selected.revisionRelation || Object.keys(row.champs).length !== selected.champs.length || selected.champs.some(k => !(k in row.champs))) throw new Error('Informations modifiées : sélectionne à nouveau les champs.')
  return row
}
