'use client'
import { useEffect, useState } from 'react'
import { createCardReader } from '@/lib/card-public-reader'
import type { PublicCard } from '@/lib/cards'
import CardRenderer from './CardRenderer'
export default function PublicCardScreen() {
  const [state, setState] = useState<{ card: PublicCard | null; message: string }>({ card: null, message: 'Vérification de la carte…' })
  useEffect(() => {
    const reader = createCardReader({ secret: () => window.location.search ? '' : window.location.hash.slice(1), visible: () => document.visibilityState === 'visible', online: () => navigator.onLine,
      fetch: window.fetch.bind(window), display: (card, message) => setState({ card, message }), setTimer: setTimeout, clearTimer: clearTimeout, now: Date.now })
    const validate = () => { void reader.validate() }, hide = () => reader.hide(), offline = () => reader.offline()
    const visibility = () => { if (document.visibilityState === 'visible') validate(); else hide() }
    window.addEventListener('pageshow', validate); window.addEventListener('focus', validate); window.addEventListener('hashchange', validate)
    window.addEventListener('pagehide', hide); window.addEventListener('offline', offline); window.addEventListener('online', validate); document.addEventListener('visibilitychange', visibility)
    validate()
    return () => {
      reader.dispose(); window.removeEventListener('pageshow', validate); window.removeEventListener('focus', validate); window.removeEventListener('hashchange', validate)
      window.removeEventListener('pagehide', hide); window.removeEventListener('offline', offline); window.removeEventListener('online', validate); document.removeEventListener('visibilitychange', visibility)
    }
  }, [])
  return <main className="mx-auto w-full max-w-2xl min-w-0 flex-1 px-3 py-6 sm:px-6">
    <h1 className="mb-5 text-center text-xl font-semibold">Une carte pour toi</h1>
    {state.card ? <CardRenderer snapshot={state.card.content} /> : <p role="status" className="rounded-xl border border-line p-5 text-center">{state.message || 'Vérification de la carte…'}</p>}
  </main>
}
