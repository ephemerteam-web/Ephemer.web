// 📅 Même occurrence civile pour l'API mensuelle, le calendrier et la newsletter.
import { birthdayInYear, isCalendarDay } from './calendar-day'
import { trouverSaintParPrenom } from './saints'

type MonthContact = { id: string | number; prenom: string | null; nom: string | null; date_naissance: string | null }
export type MonthEvent = {
  id: string | number; prenom: string; nom: string;
  typeEvenement: 'anniversaire' | 'fete_prenomale'; jour: number; dateComplete: string; emoji: string
}

export function monthEvents(contacts: MonthContact[], month: number, year: number): MonthEvent[] {
  const events: MonthEvent[] = []
  for (const contact of contacts) {
    const add = (birth: string, typeEvenement: MonthEvent['typeEvenement']) => {
      if (!isCalendarDay(birth)) return
      const day = birthdayInYear(birth, year)
      if (Number(day.slice(5, 7)) !== month + 1) return
      events.push({ id: contact.id, prenom: contact.prenom || 'Contact', nom: contact.nom || '',
        typeEvenement, jour: Number(day.slice(8)), dateComplete: `${day}T00:00:00.000Z`,
        emoji: typeEvenement === 'anniversaire' ? '🎂' : '🎉' })
    }
    if (contact.date_naissance) add(contact.date_naissance, 'anniversaire')
    const saint = contact.prenom ? trouverSaintParPrenom(contact.prenom) : null
    if (saint) add(`2000-${saint.date}`, 'fete_prenomale')
  }
  return events.sort((a, b) => a.jour - b.jour || String(a.id).localeCompare(String(b.id)))
}

export function requestedMonth(params: URLSearchParams, today: string) {
  const integer = (key: string, fallback: number, min: number, max: number) => {
    const raw = params.get(key)
    if (raw === null) return fallback
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) < min || Number(raw) > max) {
      throw new Error('Le mois doit être compris entre 0 et 11 et l’année entre 1 et 9999.')
    }
    return Number(raw)
  }
  return { mois: integer('mois', Number(today.slice(5, 7)) - 1, 0, 11),
    annee: integer('annee', Number(today.slice(0, 4)), 1, 9999) }
}
