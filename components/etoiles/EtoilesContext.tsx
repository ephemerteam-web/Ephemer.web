'use client'
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useDashboardUser } from '@/components/DashboardUserContext'
import { recogniseEtoiles, readEtoiles } from '@/lib/etoiles-data'
import { subscribeContactsChanged } from '@/lib/contact-changes'
import { notifyNotificationsChanged } from '@/lib/notification-changes'
import type { Etoile, DemandeRecue, AssociationEtoile } from '@/lib/etoiles-contract'

type Seed = { etoileId: string; draftId: string }
type State = { actives: Etoile[]; recues: DemandeRecue[]; associations: AssociationEtoile[]; loading: boolean; error: string; offline: boolean;
  refresh: (recognise?: boolean) => Promise<void>; contactSeed: Seed | null; setContactSeed: (seed: Seed | null) => void }
const Context = createContext<State | null>(null)
// Les anciens tests/aperçus sans fournisseur conservent un carnet sans pastille.
const empty: State = { actives: [], recues: [], associations: [], loading: false, error: '', offline: false, refresh: async () => {}, contactSeed: null, setContactSeed: () => {} }
export function useEtoiles() { return useContext(Context) ?? empty }
export default function EtoilesProvider({ children }: { children: ReactNode }) {
  const { id } = useDashboardUser()
  return <AccountEtoiles key={id} ownerId={id}>{children}</AccountEtoiles>
}
export function AccountEtoiles({ children, ownerId }: { children: ReactNode; ownerId: string }) {
  const [actives, setActives] = useState<Etoile[]>([]), [recues, setRecues] = useState<DemandeRecue[]>([]), [associations, setAssociations] = useState<AssociationEtoile[]>([])
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [offline, setOffline] = useState(false)
  const [contactSeed, setContactSeed] = useState<Seed | null>(null)
  const life = useRef(false), generation = useRef(0), controller = useRef<AbortController | null>(null)
  // Sérialiser les reconnaissances ; une invalidation en cours programme une reprise.
  const running = useRef(false), again = useRef(false), recognitionWanted = useRef(false)
  const refresh = useCallback(async (recognise = false) => {
    recognitionWanted.current ||= recognise
    if (running.current) { again.current = true; return }
    running.current = true
    do {
      again.current = false
      const request = ++generation.current, abort = new AbortController(); controller.current = abort
      const recogniseNow = recognitionWanted.current; recognitionWanted.current = false
      if (!life.current) break
      if (navigator.onLine === false) {
        setOffline(true); setActives([]); setRecues([]); setAssociations([]); setLoading(false); recognitionWanted.current ||= recogniseNow; break
      }
      setOffline(false); setLoading(true)
      try {
        if (recogniseNow) await recogniseEtoiles(ownerId, abort.signal)
        const [stars, incoming, links] = await Promise.all([readEtoiles(ownerId, 'actives', abort.signal), readEtoiles(ownerId, 'recues', abort.signal), readEtoiles(ownerId, 'associations', abort.signal)])
        if (life.current && generation.current === request) { setActives(stars); setRecues(incoming); setAssociations(links); setError(''); notifyNotificationsChanged(ownerId, 'etoiles') }
      } catch (err) {
        if (life.current && generation.current === request && !abort.signal.aborted) { setActives([]); setRecues([]); setAssociations([]); setError(err instanceof Error ? err.message : 'Impossible de charger tes étoiles. Réessaie.') }
      } finally { if (life.current && generation.current === request) setLoading(false) }
    } while (again.current && life.current)
    running.current = false
  }, [ownerId])
  useEffect(() => {
    life.current = true
    const update = () => { if (document.visibilityState !== 'hidden') void refresh(true) }
    const stop = () => { generation.current++; controller.current?.abort(); setOffline(true); setActives([]); setRecues([]); setAssociations([]); setContactSeed(null); setLoading(false) }
    const invalidate = () => { generation.current++; controller.current?.abort() }
    // Premier chargement réseau, puis synchronisation sur les événements du compte.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(true)
    window.addEventListener('focus', update); window.addEventListener('online', update); window.addEventListener('offline', stop)
    document.addEventListener('visibilitychange', update)
    const timer = window.setInterval(update, 60000)
    const unsubscribe = subscribeContactsChanged(changed => { if (changed === ownerId) void refresh(true) })
    return () => { life.current = false; invalidate(); window.clearInterval(timer); unsubscribe(); window.removeEventListener('focus', update); window.removeEventListener('online', update); window.removeEventListener('offline', stop); document.removeEventListener('visibilitychange', update) }
  }, [ownerId, refresh])
  return <Context.Provider value={{ actives, recues, associations, loading, error, offline, refresh, contactSeed, setContactSeed }}>{children}</Context.Provider>
}
