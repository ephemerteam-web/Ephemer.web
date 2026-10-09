'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-browser'
import { tokenEtoile, commandeEtoile, type CommandeEtoile } from '@/lib/etoiles-contract'
import { sendEtoileCommand, EtoilesRequestError } from '@/lib/etoiles-data'

export default function PublicEtoileScreen() {
  const [owner, setOwner] = useState<string | null>(null), [verified, setVerified] = useState(false), [ready, setReady] = useState(false)
  const [available, setAvailable] = useState(false), [offline, setOffline] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('')
  const secret = useRef<string | null>(null), attempt = useRef<CommandeEtoile | null>(null), life = useRef(false), account = useRef<string | null | undefined>(undefined)
  const generation = useRef(0), controller = useRef<AbortController | null>(null), locked = useRef(false)
  const fragmentRead = useRef(false)
  useEffect(() => {
    life.current = true
    // Le fragment ne part pas au serveur et disparaît avant tout contrôle de session.
    if (!fragmentRead.current) {
      fragmentRead.current = true
      const fragment = location.hash.slice(1)
      history.replaceState(null, '', location.pathname)
      try { secret.current = tokenEtoile(fragment) } catch { secret.current = null }
    }
    const clear = () => { secret.current = null; attempt.current = null; controller.current?.abort(); setAvailable(false); setNotice(''); setError('') }
    const check = async () => {
      const sequence = ++generation.current
      setOffline(navigator.onLine === false)
      if (navigator.onLine === false) { clear(); setReady(true); return }
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (!life.current || sequence !== generation.current) return
        const next = authError ? null : user?.id ?? null
        if (account.current !== undefined && account.current !== next) clear()
        account.current = next; setOwner(next); setVerified(!!user?.email_confirmed_at && !user?.is_anonymous); setAvailable(Boolean(secret.current)); setReady(true)
      } catch { if (life.current && sequence === generation.current) { setOwner(null); setVerified(false); setReady(true); setError('Session indisponible. Réessaie après reconnexion.') } }
    }
    const hide = () => { if (document.visibilityState === 'hidden') clear(); else void check() }
    const stop = () => { generation.current++; clear(); setOffline(true) }
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (account.current !== undefined && account.current !== (session?.user.id ?? null)) {
        generation.current++; clear(); account.current = session?.user.id ?? null; setOwner(null); setVerified(false)
      }
      const timer = setTimeout(() => { timers.delete(timer); if (life.current) void check() }, 0); timers.add(timer)
    })
    void check()
    const invalidate = () => { generation.current++; controller.current?.abort(); attempt.current = null }
    window.addEventListener('pagehide', clear); window.addEventListener('offline', stop); window.addEventListener('online', check); window.addEventListener('focus', check); document.addEventListener('visibilitychange', hide)
    return () => { life.current = false; invalidate(); subscription.unsubscribe(); timers.forEach(clearTimeout); window.removeEventListener('pagehide', clear); window.removeEventListener('offline', stop); window.removeEventListener('online', check); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', hide) }
  }, [])
  async function request() {
    if (locked.current || !owner || !verified || !secret.current || offline) return
    const initiatingAccount = owner, token = secret.current
    locked.current = true; setBusy(true); setError('')
    try {
      attempt.current ??= commandeEtoile({ action: 'demander_lien', donnees: { token }, operation: crypto.randomUUID() })
      const abort = new AbortController(); controller.current = abort
      const result = await sendEtoileCommand(owner, attempt.current, abort.signal)
      if (!life.current || account.current !== initiatingAccount || secret.current !== token) return
      attempt.current = null; secret.current = null; setAvailable(false); setNotice(result.message ?? 'Demande prise en compte.')
    } catch (err) {
      if (life.current && account.current === initiatingAccount && secret.current === token) {
        if (err instanceof EtoilesRequestError && err.status >= 400 && err.status < 500) attempt.current = null
        setError(err instanceof Error ? err.message : 'Demande indisponible. Réessaie.')
      }
    } finally { locked.current = false; if (life.current) setBusy(false) }
  }
  return <main className="mx-auto min-h-[60vh] max-w-lg space-y-5 px-4 py-12 text-ink">
    <h1 className="text-3xl font-bold">✦ Devenir une étoile</h1>
    <p className="text-muted">Une relation privée dans Ephemer, avec l’accord des deux personnes. Aucun contact n’est ajouté automatiquement.</p>
    {!ready ? <p role="status">Vérification de ta session…</p> : <>
      {offline && <p role="status">Reconnecte-toi, puis ouvre à nouveau le lien.</p>}
      {!owner && <p>Connecte-toi, puis ouvre à nouveau le lien reçu. <Link className="underline" href="/connexion">Se connecter</Link></p>}
      {owner && !verified && <p>Vérifie ton adresse de connexion avant de proposer une relation.</p>}
      {!available && !notice && <p>Ouvre ton lien complet pour envoyer une demande. Il reste uniquement en mémoire pendant cette visite.</p>}
      {available && owner && verified && <button onClick={() => void request()} disabled={busy || offline} className="min-h-11 rounded-xl bg-action px-4 py-3 font-semibold text-on-action disabled:opacity-50">{busy ? 'En cours…' : 'Demander à devenir une étoile'}</button>}
      {notice && <p role="status" className="break-words">{notice}</p>}{error && <p role="alert" className="break-words text-danger">{error}</p>}
      {owner && <Link className="inline-block min-h-11 py-3 underline" href="/dashboard/etoiles">Ouvrir Mes étoiles</Link>}
    </>}
  </main>
}
