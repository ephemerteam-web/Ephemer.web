import { tokenEtoile } from './etoiles-contract'
export const ETOILE_CONTEXT_KEY = 'ephemer-etoile-entree-v1'
export const ETOILE_CONTEXT_TTL = 30 * 60 * 1000
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export type EtoileContext = { token: string; expiresAt: number; owner: string | null }
export function clearEtoileContext(storage: Store) { try { storage.removeItem(ETOILE_CONTEXT_KEY) } catch { /* Le stockage peut être interdit. */ } }
export function readEtoileContext(storage: Store, now = Date.now()): EtoileContext | null {
  try {
    const value = JSON.parse(storage.getItem(ETOILE_CONTEXT_KEY) ?? 'null')
    if (!value || !Number.isFinite(value.expiresAt) || value.expiresAt <= now || value.expiresAt > now + ETOILE_CONTEXT_TTL ||
      (value.owner !== null && typeof value.owner !== 'string')) throw new Error('Contexte expiré.')
    return { token: tokenEtoile(value.token), expiresAt: value.expiresAt, owner: value.owner }
  } catch { clearEtoileContext(storage); return null }
}
export function writeEtoileContext(storage: Store, value: EtoileContext): boolean {
  try { storage.setItem(ETOILE_CONTEXT_KEY, JSON.stringify(value)); return true } catch { return false }
}
export function startEtoileContext(storage: Store, token: string, now = Date.now()) {
  const value: EtoileContext = { token: tokenEtoile(token), expiresAt: now + ETOILE_CONTEXT_TTL, owner: null }
  writeEtoileContext(storage, value)
  return value
}
export function bindEtoileContext(storage: Store, owner: string, now = Date.now()) {
  const value = readEtoileContext(storage, now)
  if (!value) return null
  if (value.owner !== null && value.owner !== owner) { clearEtoileContext(storage); return null }
  const bound = { ...value, owner }
  writeEtoileContext(storage, bound)
  return bound
}
