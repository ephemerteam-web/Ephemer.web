// Synchroniser la cloche et le centre dans cet onglet, même sans Realtime.
type Source = 'bell' | 'centre' | 'etoiles'
const listeners = new Set<(ownerId: string, source: Source) => void>()
export function subscribeNotificationChanges(listener: (ownerId: string, source: Source) => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function notifyNotificationsChanged(ownerId: string, source: Source) {
  listeners.forEach(listener => listener(ownerId, source))
}
