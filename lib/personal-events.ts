// Une occurrence datée est l'identité commune aux vues et aux rappels.
import type { Contact, Tables } from '@/types/database'
import { birthdayInYear, isCalendarDay, daysBetween } from './calendar-day'
import { monthEvents } from './month-events'
export type PersonalEvent = Tables<'evenements_personnels'>
export type EventRule = Tables<'regles_evenements'>
export type Occurrence = Tables<'occurrences_evenements'>
export type EventView = { key: string; occurrence: Occurrence | null; event: PersonalEvent | null; contact: Contact | null; date: string; kind: string; title: string; age: number | null; reminder: boolean }
export type EventData = { contacts: Contact[]; events: PersonalEvent[]; rules: EventRule[]; occurrences: Occurrence[] }
export const eventLabels: Record<string, string> = { anniversaire: 'Anniversaire', fete_prenomale: 'Fête prénomale', rencontre: 'Rencontre', mariage: 'Mariage', adoption: 'Adoption', reussite: 'Réussite', libre: 'Événement personnel' }
export function monthWindow(month: number, year: number) {
  const start = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-01`
  const last = new Date(`${start}T00:00:00Z`)
  last.setUTCMonth(last.getUTCMonth() + 1, 0)
  return { start, end: last.toISOString().slice(0, 10) }
}
export function shiftDay(day: string, count: number) {
  if (!isCalendarDay(day)) throw new Error('Date invalide')
  const date = new Date(`${day}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

export function eventViews(data: EventData, start: string, end: string, includeHidden = false): EventView[] {
  const contacts = new Map(data.contacts.map(contact => [contact.id, contact]))
  const events = new Map(data.events.map(event => [event.id, event]))
  const rules = new Map(data.rules.map(rule => [rule.id, rule]))
  const result: EventView[] = []
  const seen = new Set<string>()
  for (const occurrence of data.occurrences) {
    const event = events.get(occurrence.evenement_id)
    if (!event || event.user_id !== occurrence.user_id || event.archive || (!event.visible && !includeHidden) || event.choix_a_reconfirmer || occurrence.annulee ||
        occurrence.date_occurrence < start || occurrence.date_occurrence > end || (event.arrete_apres_cycle !== null && occurrence.cycle !== 0 && occurrence.cycle > event.arrete_apres_cycle)) continue
    const key = `${event.id}:${occurrence.cycle}`
    if (seen.has(key)) continue
    seen.add(key)
    const rule = rules.get(occurrence.regle_id)
    const birthYear = rule?.annee_naissance ?? null
    result.push({ key, occurrence, event, contact: event.contact_id === null ? null : contacts.get(event.contact_id) ?? null,
      date: occurrence.date_occurrence, kind: event.type_evenement, title: occurrence.titre_historique,
      age: event.type_evenement === 'anniversaire' && birthYear !== null ? occurrence.cycle - birthYear : null, reminder: event.rappels_actifs })
  }
  // Une série enregistrée, même arrêtée ou masquée, remplace son ancien calcul.
  for (let year = Number(start.slice(0, 4)); year <= Number(end.slice(0, 4)); year++) {
    for (const contact of data.contacts) {
      const has = (kind: string) => data.events.some(event => event.contact_id === contact.id && event.type_evenement === kind)
      if (!has('anniversaire') && contact.date_naissance && isCalendarDay(contact.date_naissance)) {
        const date = birthdayInYear(contact.date_naissance, year)
        if (date >= start && date <= end) result.push({ key: `ancien:${contact.id}:anniversaire:${year}`, occurrence: null, event: null, contact, date,
          kind: 'anniversaire', title: `Anniversaire de ${contact.prenom ?? 'ce contact'}`, age: contact.date_naissance.startsWith('1900-') ? null : year - Number(contact.date_naissance.slice(0, 4)), reminder: true })
      }
      if (!has('fete_prenomale')) for (let month = 0; month < 12; month++) {
        for (const old of monthEvents([{ ...contact, date_naissance: null }], month, year)) {
          const date = old.dateComplete.slice(0, 10)
          if (date >= start && date <= end) result.push({ key: `ancien:${contact.id}:fete:${year}`, occurrence: null, event: null, contact, date, kind: 'fete_prenomale', title: `Fête de ${contact.prenom ?? 'ce contact'}`, age: null, reminder: false })
        }
      }
    }
  }
  return result.sort((a, b) => daysBetween(b.date, a.date) || a.key.localeCompare(b.key))
}

// Simulation sans RPC de matérialisation : les projections n'ont aucun UUID
// d'occurrence et ne peuvent donc être utilisées pour programmer un envoi.
export function previewEventViews(data: EventData, start: string, end: string): EventView[] {
  const result = eventViews(data, start, end, true)
  const existing = new Set(data.occurrences.map(row => `${row.evenement_id}:${row.cycle}`))
  for (const event of data.events) {
    if (event.archive || event.choix_a_reconfirmer) continue
    const contact = data.contacts.find(row => row.id === event.contact_id) ?? null
    for (const rule of data.rules.filter(row => row.evenement_id === event.id && !row.retiree)) {
      const cycles = event.recurrence === 'ponctuelle' ? [0] : Array.from({ length: Number(end.slice(0, 4)) - Number(start.slice(0, 4)) + 1 }, (_, i) => Number(start.slice(0, 4)) + i)
      for (const cycle of cycles) {
        const key = `${event.id}:${cycle}`
        if (existing.has(key) || (cycle !== 0 && (cycle < rule.debut_cycle || cycle > (rule.fin_cycle ?? 9999) || cycle > (event.arrete_apres_cycle ?? 9999) || cycle < (rule.annee_naissance ?? 1)))) continue
        const date = cycle === 0 ? rule.date_ponctuelle : rule.mois && rule.jour ? birthdayInYear(`2000-${String(rule.mois).padStart(2, '0')}-${String(rule.jour).padStart(2, '0')}`, cycle) : null
        if (!date || date < start || date > end) continue
        existing.add(key)
        result.push({ key, event, contact, occurrence: null, date, kind: event.type_evenement, title: event.titre,
          age: event.type_evenement === 'anniversaire' && rule.annee_naissance !== null ? cycle - rule.annee_naissance : null, reminder: event.rappels_actifs })
      }
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key))
}
