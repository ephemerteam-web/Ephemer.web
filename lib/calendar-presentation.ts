// Présentation uniquement : les occurrences restent calculées par personal-events.
import type { EventView } from './personal-events'
import { parseLocalDay } from './calendar-day'

export type CalendarFilter = 'all' | 'birthday' | 'feast' | 'personal'
export function eventGroup(kind: string): Exclude<CalendarFilter, 'all'> {
  return kind === 'anniversaire' ? 'birthday' : kind === 'fete_prenomale' ? 'feast' : 'personal'
}
export function calendarEvents(views: EventView[], month: string, filter: CalendarFilter, contactIds: Set<number> | null) {
  return views.filter(view => view.date.startsWith(`${month}-`)
    && (filter === 'all' || eventGroup(view.kind) === filter)
    && (contactIds === null || (view.contact !== null && contactIds.has(view.contact.id))))
    .sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key))
}
export function monthDays(month: string): (string | null)[] {
  const first = parseLocalDay(`${month}-01`)
  const offset = (first.getDay() + 6) % 7
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const days: (string | null)[] = Array.from({ length: offset }, () => null)
  for (let day = 1; day <= last; day++) days.push(`${month}-${String(day).padStart(2, '0')}`)
  while (days.length % 7) days.push(null)
  return days
}
export function selectedCalendarDay(month: string, requested: string | null, today: string, views: EventView[]) {
  if (requested?.startsWith(`${month}-`) && monthDays(month).includes(requested)) return requested
  if (today.startsWith(`${month}-`)) return today
  return views.find(view => view.date.startsWith(`${month}-`))?.date ?? `${month}-01`
}
export function adjacentMonth(month: string, offset: number) {
  const first = parseLocalDay(`${month}-01`)
  first.setMonth(first.getMonth() + offset)
  return `${String(first.getFullYear()).padStart(4, '0')}-${String(first.getMonth() + 1).padStart(2, '0')}`
}
