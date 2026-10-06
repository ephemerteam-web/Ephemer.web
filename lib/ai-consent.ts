// Le serveur relit uniquement les champs autorisés du compte authentifié.
export const AI_CONTACT_FIELDS = ['firstName', 'age', 'note'] as const
export type AIContactField = typeof AI_CONTACT_FIELDS[number]
export function consentInput(input: Record<string, unknown>) {
  const selected = input.consentFields
  const fields = Array.isArray(selected) ? AI_CONTACT_FIELDS.filter(field => selected.includes(field)) : []
  const contactId = typeof input.contactId === 'number' && Number.isSafeInteger(input.contactId) && input.contactId > 0 ? input.contactId : null
  return fields.length && contactId ? { contactId, consentFields: fields } : {}
}
export function contactAIContext(contact: { prenom: string | null; date_naissance: string | null; note: string | null }, fields: readonly AIContactField[], today: string) {
  const context: Record<string, string | number> = {}
  if (fields.includes('firstName') && contact.prenom) context.prenom = contact.prenom.trim().slice(0,80)
  if (fields.includes('note') && contact.note) context.note = contact.note.trim().slice(0,4000)
  if (fields.includes('age') && contact.date_naissance && !contact.date_naissance.startsWith('1900-') && /^\d{4}-\d{2}-\d{2}$/.test(contact.date_naissance)) {
    const age = Number(today.slice(0,4)) - Number(contact.date_naissance.slice(0,4)) - (today.slice(5) < contact.date_naissance.slice(5) ? 1 : 0)
    if (age >= 0 && age <= 130) context.age = age
  }
  return context
}
