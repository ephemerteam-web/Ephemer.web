import { SAINTS } from './saints'
import { nextBirthdayDay } from './calendar-day'
const normalized = (name: string) => name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
export function nameDays(name: string): string[] {
  const key = normalized(name)
  return [...new Set(SAINTS.filter(s => s.prenoms.some(p => normalized(p) === key)).map(s => s.date))].sort()
}
export function chosenNameDay(name: string, preferred: string, today: string): string | null {
  if (!nameDays(name).includes(preferred)) return null
  return nextBirthdayDay(`2000-${preferred}`, today)
}
