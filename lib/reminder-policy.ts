import { daysBetween, isCalendarDay, nextBirthdayDay, parisDay } from './calendar-day'
import { resolvePreferences } from './notification-preferences'
import type { OptionalPreferences } from './notification-preferences'

// Un message demandé explicitement est distinct des alertes personnelles.
// Une reprise le lendemain couvre une panne et les programmations après le cron.
export const MESSAGE_RETRY_DAYS = 1

export function messageNeedsRescheduling(date: string, today = parisDay()): boolean {
  return !isCalendarDay(date) || daysBetween(date, today) > MESSAGE_RETRY_DAYS
}

// Les alertes automatiques ne sont utiles que jusqu'à leur événement.
export function automaticReminderUseful(date: string, milestone: string, eventDate: string | null, today: string): boolean {
  if (!isCalendarDay(date)) return false
  if (eventDate && isCalendarDay(eventDate)) return today <= eventDate
  const offset = ({ j7: 7, j3: 3, j1: 1, jourj: 0 } as Record<string, number>)[milestone]
  return offset !== undefined && daysBetween(date, today) <= offset
}

export type ReminderPreferences = OptionalPreferences

export function enabledMilestones(prefs: ReminderPreferences | null) {
  const resolved = resolvePreferences(prefs)
  return [
    { jours: 7, enabled: resolved.rappel_j7 },
    { jours: 3, enabled: resolved.rappel_j3 },
    { jours: 1, enabled: resolved.rappel_j1 },
    { jours: 0, enabled: resolved.rappel_jourj },
  ]
}

export type BirthdayContact = {
  id: number
  prenom: string | null
  nom: string | null
  date_naissance: string | null
}
export type PendingBirthday = {
  id: string
  contact_id: number
  event_date: string | null
  jours_restants: number | null
  email_envoye: boolean
}

// Réconcilier tous les paliers déjà franchis d'un anniversaire encore utile.
// L'index unique existant rend les passages répétés sans effet sur les doublons.
export function birthdayNotifications(userId: string, contacts: BirthdayContact[], prefs: ReminderPreferences | null, today: string) {
  return contacts.flatMap(contact => {
    if (!contact.date_naissance || !isCalendarDay(contact.date_naissance)) return []
    const eventDate = nextBirthdayDay(contact.date_naissance, today)
    const remaining = daysBetween(today, eventDate)
    const name = contact.prenom || contact.nom || "quelqu'un"
    return enabledMilestones(prefs)
      .filter(palier => palier.enabled && remaining <= palier.jours)
      .map(palier => ({
        user_id: userId, contact_id: contact.id, type: 'anniversaire',
        message: remaining === 0 ? `C'est aujourd'hui l'anniversaire de ${name} !` : `C'est bientôt l'anniversaire de ${name} !`,
        event_date: eventDate, event_description: `Anniversaire de ${name}`,
        jours_restants: palier.jours, lue: false, email_envoye: false,
      }))
  })
}

// Plusieurs paliers manqués donnent un seul événement dans le récapitulatif.
// Respecter la préférence du palier d'origine, y compris si Jour J est désactivé.
export function selectBirthdayRecap(rows: PendingBirthday[], contacts: BirthdayContact[], prefs: ReminderPreferences | null, today: string) {
  const enabled = new Set(enabledMilestones(prefs).filter(p => p.enabled).map(p => p.jours))
  const groups = new Map<string, { ids: string[]; contact: string; contactId: number; eventDate: string; date: string; jours: number }>()
  for (const contact of contacts) {
    if (!contact.date_naissance || !isCalendarDay(contact.date_naissance)) continue
    const eventDate = nextBirthdayDay(contact.date_naissance, today)
    const remaining = daysBetween(today, eventDate)
    const eventRows = rows.filter(n => n.contact_id === contact.id && n.event_date === eventDate)
    const pending = eventRows.filter(n => !n.email_envoye && n.jours_restants !== null && enabled.has(n.jours_restants) && remaining <= n.jours_restants)
    if (!pending.length) continue
    const latest = Math.min(...pending.map(n => n.jours_restants!))
    // Un palier plus récent déjà accepté rend les anciens rappels superflus.
    if (eventRows.some(n => n.email_envoye && n.jours_restants !== null && n.jours_restants <= latest)) continue
    groups.set(`${contact.id}/${eventDate}`, {
      ids: pending.map(n => n.id), contact: contact.prenom || contact.nom || "quelqu'un",
      contactId: contact.id, eventDate,
      date: new Date(`${eventDate}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }),
      jours: remaining,
    })
  }
  return [...groups.values()]
}
