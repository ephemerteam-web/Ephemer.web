// Même clé pour le tri, les cartes et la navigation alphabétique.
export type ContactName = { nom: string | null; prenom: string | null }
export type ContactSort = 'nom' | 'prenom'

export function contactSortText(contact: ContactName, sort: ContactSort) {
  const primary = contact[sort]?.trim() ?? ''
  const secondary = contact[sort === 'nom' ? 'prenom' : 'nom']?.trim() ?? ''
  return primary || secondary
}

export function contactLetter(contact: ContactName, sort: ContactSort) {
  return contactSortText(contact, sort).normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase()
}

export function compareContactNames(a: ContactName, b: ContactName, sort: ContactSort) {
  const primary = contactSortText(a, sort).localeCompare(contactSortText(b, sort), 'fr', { sensitivity: 'base' })
  const secondary: ContactSort = sort === 'nom' ? 'prenom' : 'nom'
  return primary || (a[secondary]?.trim() ?? '').localeCompare(b[secondary]?.trim() ?? '', 'fr', { sensitivity: 'base' })
}

// Convertir la position du doigt en index, sans sortir de la réglette.
export function alphabetIndex(clientY: number, top: number, height: number, count: number) {
  if (height <= 0 || count <= 0) return -1
  return Math.max(0, Math.min(count - 1, Math.floor((clientY - top) / height * count)))
}
