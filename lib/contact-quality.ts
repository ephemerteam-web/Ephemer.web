import { isCalendarDay } from './calendar-day'

// Modèle métier uniquement : le schéma SQL actuel ne sait pas le persister.
export type PartialBirthDate = { day: number; month: number; year: number | null }
export function partialBirthDate(day: string, month: string, year: string): PartialBirthDate | null {
  if (!day && !month && !year) return null
  const value = `${year || '2000'}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  if (!isCalendarDay(value)) throw new Error('Date de naissance invalide.')
  return { day: Number(day), month: Number(month), year: year ? Number(year) : null }
}
export function ageKnown(birth: string | null | undefined, today = new Date()): number | null {
  // 1900 est ambigu dans les données historiques : ne pas en déduire un âge.
  if (!birth || !isCalendarDay(birth) || birth.startsWith('1900-')) return null
  const [year, month, day] = birth.split('-').map(Number)
  const age = today.getFullYear() - year - (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day) ? 1 : 0)
  return age >= 0 && age <= 120 ? age : null
}
type Identity = { prenom?: string | null; nom?: string | null; email?: string | null; telephone_indicatif?: string | null; telephone_numero?: string | null; date_naissance?: string | null }
const normalized = (v?: string | null) => (v ?? '').trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')
export function duplicateReason(a: Identity, b: Identity): string | null {
  const email = (v?: string | null) => (v ?? '').trim().toLowerCase()
  if (email(a.email) && email(a.email) === email(b.email)) return 'même adresse email (peut être partagée)'
  const phone = (c: Identity) => c.telephone_numero ? `${c.telephone_indicatif ?? ''}${c.telephone_numero}`.replace(/\D/g, '') : ''
  if (phone(a) && phone(a) === phone(b)) return 'même téléphone (peut être partagé)'
  if (normalized(a.prenom) && normalized(a.nom) && normalized(a.prenom) === normalized(b.prenom) && normalized(a.nom) === normalized(b.nom)) return 'mêmes prénom et nom (homonyme possible)'
  return null
}
