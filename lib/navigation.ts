// 🧭 Une seule définition des quatre espaces pour les deux menus.
export const MAIN_SPACES = [
  { label: 'Accueil', href: '/dashboard', icon: '⌂' },
  { label: 'Dates', href: '/dashboard/calendrier', icon: '▦' },
  { label: 'Mes proches', href: '/dashboard/contacts', icon: '♧' },
  { label: 'Célébrations', href: '/dashboard/preparations', icon: '✧' },
] as const

export const DATE_PAGES = [
  { label: 'Calendrier', href: '/dashboard/calendrier', icon: '▦' },
  { label: 'Anniversaires', href: '/dashboard/anniversaires', icon: '🎂' },
  { label: 'Fêtes des saints', href: '/dashboard/calendrier_saints', icon: '🌸' },
] as const

export function activeSpace(path: string) {
  if (path === '/dashboard') return '/dashboard'
  if (/^\/dashboard\/(calendrier|ce-mois-ci|anniversaires)/.test(path)) return '/dashboard/calendrier'
  if (/^\/dashboard\/(contacts|etoiles|inviter)/.test(path)) return '/dashboard/contacts'
  if (/^\/dashboard\/(prepar|idees|gift-ideas|generate|budget|styles|messages-programmes)/.test(path)) return '/dashboard/preparations'
  return ''
}
