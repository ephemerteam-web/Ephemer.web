// 🌙 Le contenu reste en mémoire et disparaît dès que la page ne peut plus valider le droit.
import { publicCard, type PublicCard } from './cards'
type ReaderEnvironment = {
  secret: () => string; visible: () => boolean; online: () => boolean
  fetch: typeof fetch; display: (card: PublicCard | null, message: string) => void
  setTimer: typeof setTimeout; clearTimer: typeof clearTimeout; now: () => number
}
export function createCardReader(env: ReaderEnvironment) {
  let generation = 0, stopped = false, controller: AbortController | null = null, timer: ReturnType<typeof setTimeout> | null = null
  function clear(message = '') {
    generation++; controller?.abort(); controller = null
    if (timer !== null) env.clearTimer(timer)
    timer = null; env.display(null, message)
  }
  async function validate() {
    if (stopped) return
    clear('Vérification de la carte…')
    if (!env.online()) { clear('Hors ligne. Reconnecte-toi pour consulter la carte.'); return }
    if (!env.visible()) { clear(); return }
    const secret = env.secret(), current = generation
    if (!/^[A-Za-z0-9_-]{43}$/.test(secret)) { clear('Cette carte est indisponible'); return }
    controller = new AbortController()
    // Timeout et revalidation périodique retirent aussi une carte révoquée sur un onglet laissé ouvert.
    timer = env.setTimer(() => clear('Cette carte est indisponible'), 15000)
    try {
      const response = await env.fetch('/api/cartes/consulter', { method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret }) })
      if (!response.ok) throw new Error('indisponible')
      const card = publicCard(await response.json(), env.now())
      if (stopped || current !== generation || !env.visible() || !env.online() || secret !== env.secret()) return
      if (timer !== null) env.clearTimer(timer)
      env.display(card, '')
      const remaining = Date.parse(card.expiresAt) - env.now()
      timer = env.setTimer(() => { clear(); if (remaining <= 60000) clear('Cette carte est indisponible'); else void validate() }, Math.min(remaining, 60000))
    } catch { if (!stopped && current === generation) clear('Cette carte est indisponible') }
  }
  return { validate, hide: () => clear(), offline: () => clear('Hors ligne. Reconnecte-toi pour consulter la carte.'), dispose: () => { stopped = true; clear() } }
}
