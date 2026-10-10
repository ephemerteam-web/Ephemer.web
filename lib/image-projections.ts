import type { Contact } from '@/types/database'
import type { EventView } from './personal-events'
import type { MonUnivers } from './univers-contract'
import type { ImageField } from './share-image'

export function contactImageFields(contact: Pick<Contact, 'prenom' | 'nom' | 'date_naissance' | 'email' | 'telephone_indicatif' | 'telephone_numero' | 'note'>): ImageField[] {
  return [{ id: 'name', label: 'Nom', value: [contact.prenom, contact.nom].filter(Boolean).join(' ') },
    { id: 'birthday', label: 'Anniversaire', value: contact.date_naissance?.slice(5).split('-').reverse().join('/') },
    { id: 'year', label: 'Année de naissance', value: contact.date_naissance && !contact.date_naissance.startsWith('1900-') ? contact.date_naissance.slice(0,4) : '', sensitive: true },
    { id: 'email', label: 'Email', value: contact.email, sensitive: true },
    { id: 'phone', label: 'Téléphone', value: [contact.telephone_indicatif, contact.telephone_numero].filter(Boolean).join(' '), sensitive: true },
    { id: 'notes', label: 'Notes', value: contact.note, sensitive: true }]
}
export function eventImageFields(event: EventView): ImageField[] {
  return [{ id: 'date', label: 'Date', value: event.date },
    { id: 'name', label: 'Pour', value: event.contact ? [event.contact.prenom, event.contact.nom].filter(Boolean).join(' ') : 'Ma date' },
    { id: 'age', label: 'Âge', value: event.age === null ? '' : String(event.age) + ' ans', sensitive: true }]
}
export function ownUniversImageFields(value: MonUnivers): ImageField[] {
  const labels = { presentation: 'Présentation', passions: 'Passions', plaisirs: 'Ce qui me fait plaisir', eviter: 'Préférences à éviter' }
  const birthday = value.valeurs.anniversaire
  return [{ id: 'identity', label: 'Identité', value: value.identite },
    ...Object.entries(labels).map(([id,label]) => ({ id, label, value: value.valeurs[id as keyof typeof labels] })),
    { id: 'birthday', label: 'Anniversaire', value: birthday ? `${birthday.jour}/${birthday.mois}` : '' },
    { id: 'year', label: 'Année de naissance', value: birthday?.annee ? String(birthday.annee) : '', sensitive: true },
    { id: 'email', label: 'Email', value: value.valeurs.email, sensitive: true },
    { id: 'phone', label: 'Téléphone', value: value.valeurs.telephone, sensitive: true }]
}
