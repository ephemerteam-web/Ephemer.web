// Les anciens liens restent utilisables, avec leur contexte de contact ou d'étoile.
export function legacyDestination(path: 'month' | 'gifts', search: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (Array.isArray(value)) value.forEach(item => query.append(key, item))
    else if (value !== undefined) query.set(key, value)
  }
  query.set('vue', path === 'month' ? 'agenda' : 'suggestions')
  return `${path === 'gifts' ? '/dashboard/idees' : '/dashboard/calendrier'}?${query}`
}
