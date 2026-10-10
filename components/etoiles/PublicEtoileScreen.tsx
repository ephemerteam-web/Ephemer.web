'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-browser'
import { tokenEtoile, commandeEtoile, type CommandeEtoile } from '@/lib/etoiles-contract'
import { sendEtoileCommand, EtoilesRequestError } from '@/lib/etoiles-data'
import { bindEtoileContext, clearEtoileContext, readEtoileContext, startEtoileContext, ETOILE_CONTEXT_TTL, type EtoileContext } from '@/lib/etoile-context'

export default function PublicEtoileScreen() {
  const [owner, setOwner] = useState<string | null>(null), [verified, setVerified] = useState(false), [ready, setReady] = useState(false)
  const [available, setAvailable] = useState(false), [offline, setOffline] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('')
  const context = useRef<EtoileContext | null>(null), attempt = useRef<CommandeEtoile | null>(null), life = useRef(false), account = useRef<string | null>(null)
  const [verificationAttempt, setVerificationAttempt] = useState(0)
  const generation = useRef(0), controller = useRef<AbortController | null>(null), locked = useRef(false), initialized = useRef(false)
  useEffect(() => {
    life.current = true
    let storage: Storage | null = null
    try { storage = sessionStorage } catch { /* Stockage interdit : lien utilisable sur cette page. */ }
    if (!initialized.current) {
      initialized.current = true
      const fragment = location.hash.slice(1)
      history.replaceState(null, '', location.pathname + (location.search ?? ''))
      try {
        context.current = fragment ? (storage ? startEtoileContext(storage, fragment) : { token: tokenEtoile(fragment), owner: null, expiresAt: Date.now() + ETOILE_CONTEXT_TTL }) : storage ? readEtoileContext(storage) : null
      } catch { context.current = null; if (storage) clearEtoileContext(storage) }
    }
    const clear = () => { context.current = null; attempt.current = null; controller.current?.abort(); if (storage) clearEtoileContext(storage); setAvailable(false); setNotice('') }
    const check = async () => {
      const sequence = ++generation.current
      setOffline(navigator.onLine === false)
      if (context.current && context.current.expiresAt <= Date.now()) clear()
      if (navigator.onLine === false) { controller.current?.abort(); setReady(true); return }
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (!life.current || sequence !== generation.current) return
        if (authError && authError.name !== 'AuthSessionMissingError') throw new Error('Session indisponible')
        const next = authError ? null : user?.id ?? null
        if (next && context.current?.owner && context.current.owner !== next) clear()
        if (next && context.current) context.current = storage ? bindEtoileContext(storage, next) ?? { ...context.current, owner: next } : { ...context.current, owner: next }
        account.current = next; setOwner(next); setVerified(!!user?.email_confirmed_at && !user?.is_anonymous); setAvailable(Boolean(context.current)); setReady(true); setError('')
      } catch { if (life.current && sequence === generation.current) { setReady(true); setVerified(false); setError('Session indisponible. Réessaie ou reconnecte-toi.') } }
    }
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (context.current?.owner && session?.user.id && context.current.owner !== session.user.id)) { generation.current++; clear(); setOwner(null); setVerified(false) }
      const timer = setTimeout(() => { timers.delete(timer); if (life.current) void check() }, 0); timers.add(timer)
    })
    const update = () => { if (document.visibilityState !== 'hidden') void check() }
    const stop = () => { generation.current++; controller.current?.abort(); setOffline(true) }
    const timer = window.setInterval(update, 15000)
    void check()
    window.addEventListener('offline', stop); window.addEventListener('online', update); window.addEventListener('focus', update); document.addEventListener('visibilitychange', update)
    const invalidate = () => { generation.current++ }
    return () => { life.current = false; invalidate(); controller.current?.abort(); subscription.unsubscribe(); timers.forEach(clearTimeout); window.clearInterval(timer); window.removeEventListener('offline', stop); window.removeEventListener('online', update); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update) }
  }, [verificationAttempt])
  async function request() {
    if (locked.current || !owner || !verified || !context.current || offline) return
    if (context.current.expiresAt <= Date.now()) { context.current = null; setAvailable(false); try { clearEtoileContext(sessionStorage) } catch { /* Stockage interdit. */ } return }
    const initiatingAccount = owner, token = context.current.token
    locked.current = true; setBusy(true); setError('')
    try {
      attempt.current ??= commandeEtoile({ action: 'demander_lien', donnees: { token }, operation: crypto.randomUUID() })
      const abort = new AbortController(); controller.current = abort
      const result = await sendEtoileCommand(owner, attempt.current, abort.signal)
      if (!life.current || account.current !== initiatingAccount || context.current?.token !== token) return
      attempt.current = null; context.current = null; try { clearEtoileContext(sessionStorage) } catch { /* Stockage interdit. */ }
      setAvailable(false); setNotice(result.message ?? 'Demande prise en compte. Retrouve son état dans Mes étoiles.')
    } catch (err) {
      if (life.current && account.current === initiatingAccount && context.current?.token === token) {
        if (err instanceof EtoilesRequestError && err.status >= 400 && err.status < 500) attempt.current = null
        setError(err instanceof Error ? err.message : 'Demande indisponible. Réessaie.')
      }
    } finally { locked.current = false; if (life.current) setBusy(false) }
  }
  return <main className="mx-auto min-h-[60vh] max-w-lg space-y-5 px-4 py-12 text-ink">
    <h1 className="text-3xl font-bold">✦ Devenir une étoile</h1>
    <p className="text-muted">Une relation privée dans Ephemer, avec l’accord des deux personnes. Aucun contact n’est ajouté automatiquement.</p>
    {!ready ? <p role="status">Vérification de ta session…</p> : <>
      {offline && <p role="status">Reconnecte-toi pour continuer. Aucune demande n’est envoyée hors ligne.</p>}
      {!owner && <div className="space-y-3"><p>Connecte-toi ou crée ton compte pour retrouver cette invitation.</p><div className="flex flex-wrap gap-3">
        <Link prefetch={false} className="min-h-11 rounded-xl bg-action px-4 py-3 text-on-action" href="/connexion?next=%2Fetoile">Se connecter</Link>
        <Link prefetch={false} className="min-h-11 rounded-xl border border-line px-4 py-3" href="/inscription?next=%2Fetoile">Créer un compte</Link>
      </div><p className="text-sm text-muted">Ton invitation est conservée dans cet onglet pendant 30 minutes. Si le stockage est interdit, reconnecte-toi puis rouvre le lien.</p></div>}
      {owner && !verified && <p>Vérifie ton adresse de connexion avant de proposer une relation.</p>}
      {!available && !notice && <p>Le lien est absent ou son contexte a expiré. Ouvre à nouveau le lien complet reçu.</p>}
      {available && owner && verified && <button onClick={() => void request()} disabled={busy || offline} className="min-h-11 rounded-xl bg-action px-4 py-3 font-semibold text-on-action disabled:opacity-50">{busy ? 'En cours…' : error ? 'Réessayer la demande' : 'Demander à devenir une étoile'}</button>}
      {notice && <p role="status" className="break-words">{notice}</p>}{error && <p role="alert" className="break-words text-danger">{error}</p>}
      {error && <button className="inline-block min-h-11 py-3 underline" onClick={() => setVerificationAttempt(value => value + 1)}>Réessayer la vérification</button>}
      {owner && <Link className="inline-block min-h-11 py-3 underline" href="/dashboard/etoiles">Ouvrir Mes étoiles</Link>}
    </>}
  </main>
}
