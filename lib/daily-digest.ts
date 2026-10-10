import type { EventView } from './personal-events'

// Même sélection dans l'app et sur le serveur. Les fêtes déduites d'un prénom
// ne sont pas confirmées : leur indicateur reminder vaut false.
export function dailyEvents(views: EventView[], day: string) {
  const seen = new Set<string>()
  return views.filter(view => {
    if (view.date !== day || !view.reminder || seen.has(view.key)) return false
    if (view.event && (view.event.archive || view.event.choix_a_reconfirmer || !view.event.rappels_actifs)) return false
    if (view.occurrence?.annulee) return false
    seen.add(view.key)
    return true
  })
}

// Le texte personnel reste générique ; seuls les saints publics sont nommés.
export function digestPayload(count: number, saints: string[], day: string) {
  if (!count && !saints.length) return null
  return { kind: 'daily', title: 'Ta journée avec Ephemer',
    body: [count ? `${count} date${count > 1 ? 's' : ''} à célébrer aujourd’hui. Ouvre Ephemer pour les découvrir.` : '',
      saints.length ? `Nous fêtons ${saints.join(', ')}.` : ''].filter(Boolean).join(' '),
    publicSaints: saints.join(', '), hasEvents: count > 0,
    url: '/dashboard/notifications?vue=jour', tag: `ephemer-${day}` }
}

export function safePushSubscription(value: unknown): { endpoint: string; keys: { p256dh: string; auth: string }; saints: boolean } | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.endpoint !== 'string' || !row.keys || typeof row.keys !== 'object') return null
  try {
    const url = new URL(row.endpoint)
    const allowed = url.hostname === 'fcm.googleapis.com' || url.hostname === 'updates.push.services.mozilla.com' ||
      url.hostname.endsWith('.push.apple.com') || url.hostname.endsWith('.notify.windows.com') || url.hostname.endsWith('.wns.windows.com')
    if (!allowed || url.protocol !== 'https:' || url.username || url.password || url.hash || (url.port && url.port !== '443')) return null
  } catch { return null }
  const keys = row.keys as Record<string, unknown>
  if (typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string' || !/^[\w-]{87}$/.test(keys.p256dh) || !/^[\w-]{22}$/.test(keys.auth)) return null
  const settings = row.ephemer as { saints?: unknown } | undefined
  return { endpoint: row.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, saints: settings?.saints === true }
}

// Injecter les transports permet de vérifier les relances sans vrai push.
export async function dispatchDaily<T>(payload: T | null, claim: () => Promise<boolean>, send: (payload: T) => Promise<void>) {
  if (!payload || !await claim()) return false
  // Une exception (réponse incertaine comprise) ne libère jamais la réservation.
  await send(payload)
  return true
}
