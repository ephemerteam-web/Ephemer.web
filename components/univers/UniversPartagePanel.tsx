'use client'
// 🌌 Contenu tiers éphémère : retrait, association perdue, erreur et hors ligne l'effacent.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useDashboardUser } from '@/components/DashboardUserContext'
import { useEtoiles } from '@/components/etoiles/EtoilesContext'
import { readUniversPartage } from '@/lib/univers-data'
import type { UniversPartage } from '@/lib/univers-contract'
import UniversView from './UniversView'

export default function UniversPartagePanel({ etoileId, contactId, initialOpen = false }: { etoileId: string; contactId?: string; initialOpen?: boolean }) {
  const { id } = useDashboardUser(), social = useEtoiles()
  const star = social.actives.find(row => row.etoile_id === etoileId)
  const associated = !contactId || social.associations.some(row => row.contact_id === contactId && row.etoile_id === etoileId && row.relation_id === star?.id)
  const allowed = !!star && associated && !social.error && !social.offline
  // Un changement de compte ou de relation détruit aussi le contenu et les lectures.
  return allowed ? <AccountUniversPartage key={`${id}:${star.id}:${contactId ?? ''}`} ownerId={id} etoileId={etoileId} initialOpen={initialOpen} revisionSociale={social.actives} /> : null
}
export function AccountUniversPartage({ ownerId, etoileId, initialOpen = false, revisionSociale }: { ownerId: string; etoileId: string; initialOpen?: boolean; revisionSociale: unknown }) {
  const [open, setOpen] = useState(initialOpen), [value, setValue] = useState<UniversPartage | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false)
  const sequence = useRef(0), controller = useRef<AbortController | null>(null)
  useEffect(() => {
    let alive = true
    const clear = () => { sequence.current++; controller.current?.abort(); setValue(null); setLoading(false) }
    async function refresh() {
      if (!open || document.visibilityState === 'hidden' || navigator.onLine === false) { clear(); return }
      controller.current?.abort()
      const request = ++sequence.current, abort = new AbortController(); controller.current = abort
      // Ne jamais conserver un ancien contenu lorsque la nouvelle lecture échoue.
      setLoading(true); setError('')
      try {
        const row = await readUniversPartage(ownerId, etoileId, abort.signal)
        if (alive && sequence.current === request && !abort.signal.aborted) setValue(row)
      } catch {
        if (alive && sequence.current === request && !abort.signal.aborted) { setValue(null); setError('Univers indisponible. Réessaie après actualisation de tes étoiles.') }
      } finally { if (alive && sequence.current === request) setLoading(false) }
    }
    void refresh()
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh); window.addEventListener('offline', clear); window.addEventListener('pagehide', clear)
    document.addEventListener('visibilitychange', refresh)
    const timer = window.setInterval(refresh, 60000)
    return () => { alive = false; clear(); window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); window.removeEventListener('offline', clear); window.removeEventListener('pagehide', clear); document.removeEventListener('visibilitychange', refresh) }
  }, [ownerId, etoileId, open, revisionSociale])
  return <div className="mt-4 min-w-0 space-y-3">
    <button type="button" aria-expanded={open} onClick={() => setOpen(previous => !previous)} disabled={typeof navigator !== 'undefined' && navigator.onLine === false}
      className="min-h-11 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-accent disabled:opacity-50">{open ? 'Fermer son univers' : 'Voir son univers'}</button>
    {open && <div className="min-w-0 space-y-2">
      {loading && <p role="status" className="text-sm text-muted">Actualisation de son univers…</p>}
      {error && <p role="alert" className="text-sm text-muted">{error}</p>}
      {value && <UniversView value={value} />}
      {value && <Link href={'/dashboard/gift-ideas?' + new URLSearchParams({ etoileId })} className="inline-flex min-h-11 items-center rounded-xl border border-line px-3 py-2 text-sm font-semibold text-accent">Trouver un cadeau</Link>}
      {!value && !error && !loading && <p className="text-sm text-muted">Reconnecte-toi pour consulter son univers partagé.</p>}
    </div>}
  </div>
}
