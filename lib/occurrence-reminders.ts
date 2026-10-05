import { daysBetween } from './calendar-day'
import { enabledMilestones, type ReminderPreferences } from './reminder-policy'
import type { EventView } from './personal-events'
import type { Notification } from '@/types/database'

export function occurrenceNotifications(owner: string, views: EventView[], prefs: ReminderPreferences | null, today: string) {
  return views.flatMap(view => {
    if (!view.occurrence || !view.event || !view.reminder || view.event.user_id !== owner || view.date < today) return []
    const remaining = daysBetween(today, view.date)
    return enabledMilestones(prefs).filter(palier => palier.enabled && remaining <= palier.jours).map(palier => ({
      user_id: owner, contact_id: view.contact?.id ?? null, occurrence_id: view.occurrence!.id, occurrence_revision: view.occurrence!.revision,
      type: view.kind, message: `${view.title} : ${remaining === 0 ? 'aujourd’hui' : `dans ${remaining} jour(s)`}`,
      event_date: view.date, event_description: view.title, jours_restants: palier.jours, lue: false, email_envoye: false,
    }))
  })
}
type Pending = Pick<Notification, 'id' | 'occurrence_id' | 'occurrence_revision' | 'event_date' | 'jours_restants' | 'email_envoye'>
export function occurrenceRecap(rows: Pending[], views: EventView[], prefs: ReminderPreferences | null, today: string) {
  const enabled = new Set(enabledMilestones(prefs).filter(row => row.enabled).map(row => row.jours))
  return views.flatMap(view => {
    if (!view.occurrence || !view.reminder || view.date < today) return []
    const remaining = daysBetween(today, view.date)
    const matches = rows.filter(row => row.occurrence_id === view.occurrence!.id && row.occurrence_revision === view.occurrence!.revision && row.event_date === view.date)
    const pending = matches.filter(row => !row.email_envoye && row.jours_restants !== null && enabled.has(row.jours_restants) && remaining <= row.jours_restants)
    if (!pending.length || matches.some(row => row.email_envoye && row.jours_restants !== null && row.jours_restants <= Math.min(...pending.map(row => row.jours_restants!)))) return []
    return [{ ids: pending.map(row => row.id), contact: view.title, contactId: view.occurrence.id, eventDate: view.date,
      date: new Date(`${view.date}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }), jours: remaining }]
  })
}
