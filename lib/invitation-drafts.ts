// Un brouillon local expire sept jours après sa dernière modification, jamais après une lecture.
export const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000
const PREFIX = 'invitation-'
const fields = ['prenom', 'nom', 'jour', 'mois', 'annee', 'relation', 'noteLibre', 'email', 'indicatif', 'tel']
export type DraftData = Record<string, unknown>
type StorageLike = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>
function parse(raw: string | null, now: number): { version: 1; modifiedAt: number; data: DraftData } | null {
  try {
    const value = JSON.parse(raw ?? 'null')
    if (!value || value.version !== 1 || !Number.isFinite(value.modifiedAt) || value.modifiedAt > now || now - value.modifiedAt >= DRAFT_TTL ||
      !value.data || typeof value.data !== 'object' || Array.isArray(value.data) ||
      !fields.every(key => typeof value.data[key] === 'string') || !Array.isArray(value.data.interets) ||
      !value.data.interets.every((item: unknown) => typeof item === 'string')) return null
    return value
  } catch { return null }
}
export function purgeInvitationDrafts(storage: StorageLike, now = Date.now()) {
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => !!key && key.startsWith(PREFIX))
    for (const key of keys) if (!parse(storage.getItem(key), now)) storage.removeItem(key)
  } catch { /* Un stockage interdit ne bloque pas le site. */ }
}
export function restoreInvitationDraft(storage: StorageLike, token: string, now = Date.now()): DraftData {
  purgeInvitationDrafts(storage, now)
  try { return parse(storage.getItem(PREFIX + token), now)?.data ?? {} } catch { return {} }
}
export function saveInvitationDraft(storage: StorageLike, token: string, data: DraftData, now = Date.now()): boolean {
  try {
    const previous = parse(storage.getItem(PREFIX + token), now)
    if (previous && JSON.stringify(previous.data) === JSON.stringify(data)) return true
    storage.setItem(PREFIX + token, JSON.stringify({ version: 1, modifiedAt: now, data }))
    return true
  } catch { return false }
}
export function eraseInvitationDraft(storage: StorageLike, token: string) { try { storage.removeItem(PREFIX + token) } catch { /* Stockage interdit. */ } }
