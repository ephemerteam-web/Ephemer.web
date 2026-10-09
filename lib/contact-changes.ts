// 📡 Événement local après écriture confirmée du carnet, sans contenu personnel.
const listeners = new Set<(ownerId: string) => void>()
export function notifyContactsChanged(ownerId: string) { listeners.forEach(listener => listener(ownerId)) }
export function subscribeContactsChanged(listener: (ownerId: string) => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
