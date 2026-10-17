// Résolution civile explicite, sans bibliothèque ni changement de la date de l'événement.
import { isCalendarDay } from './calendar-day'

export const COLLECTIVE_LATE_MS = 48 * 60 * 60 * 1000
export type CivilSchedule = { date: string; time: string; timeZone: string; occurrence: 'unique' | 'premiere' | 'seconde'; instant: string }
function formatter(timeZone: string) {
  try { return new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }) }
  catch { throw new Error('Fuseau horaire invalide.') }
}
function partsAt(format: Intl.DateTimeFormat, instant: number) {
  const parts = format.formatToParts(instant)
  const part = (name: string) => parts.find(value => value.type === name)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}`
}
export function civilScheduleCandidates(date: string, time: string, timeZone: string): string[] {
  if (!isCalendarDay(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) || typeof timeZone !== 'string' || timeZone.length > 100) throw new Error('Date ou heure invalide.')
  const format = formatter(timeZone), local = `${date}T${time}:00`, reference = Date.parse(local + 'Z')
  const offsets = new Set<number>()
  // Les deux côtés d'une transition, y compris les décalages de 30 minutes et de date.
  for (let hours = -48; hours <= 48; hours += 6) {
    const instant = reference + hours * 3600000
    offsets.add(Date.parse(partsAt(format, instant) + 'Z') - instant)
  }
  return [...offsets].map(offset => reference - offset).filter(instant => partsAt(format, instant) === local).sort((a, b) => a - b).map(instant => new Date(instant).toISOString())
}
export function resolveCivilSchedule(date: string, time: string, timeZone = 'Europe/Paris', occurrence: CivilSchedule['occurrence'] = 'unique'): CivilSchedule {
  const candidates = civilScheduleCandidates(date, time, timeZone)
  if (!candidates.length) throw new Error('Cette heure n’existe pas dans ce fuseau. Choisis une autre heure.')
  if (candidates.length > 1 && !['premiere', 'seconde'].includes(occurrence)) throw new Error('Cette heure existe deux fois. Choisis la première ou la seconde occurrence.')
  if (candidates.length === 1 && occurrence !== 'unique') throw new Error('Cette heure ne possède qu’une occurrence.')
  return { date, time, timeZone, occurrence, instant: candidates[occurrence === 'seconde' ? 1 : 0] }
}
export function validateCivilSchedule(value: CivilSchedule): CivilSchedule {
  const resolved = resolveCivilSchedule(value.date, value.time, value.timeZone, value.occurrence)
  if (resolved.instant !== value.instant) throw new Error('L’horaire a changé. Relis puis confirme la programmation.')
  return resolved
}
export function nextCollectivePassage(instant: string, now = Date.now()): string {
  const due = Date.parse(instant)
  if (!Number.isFinite(due) || !Number.isFinite(now)) throw new Error('Horaire invalide.')
  const threshold = Math.max(due, now), next = new Date(threshold)
  next.setUTCHours(7, 0, 0, 0)
  if (next.getTime() < threshold) next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString()
}
export function collectiveDue(instant: string, now: number): 'attente' | 'due' | 'a_reprogrammer' {
  const date = Date.parse(instant)
  if (!Number.isFinite(date) || !Number.isFinite(now)) throw new Error('Horaire invalide.')
  return now < date ? 'attente' : now - date > COLLECTIVE_LATE_MS ? 'a_reprogrammer' : 'due'
}
