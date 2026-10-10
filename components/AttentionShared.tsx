'use client'
import Link from 'next/link'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useContactDraft } from './ContactDraftProvider'
import { attentionError } from '@/lib/attention-utils'
export const field = 'min-h-11 w-full min-w-0 rounded-lg border border-line bg-canvas p-2 text-ink'
export const button = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-ink/10 disabled:opacity-50'
export const panel = 'min-w-0 space-y-3 rounded-xl border border-line bg-surface p-4'
export function AttentionNav() {
  return <nav aria-label="Célébrations" className="mb-6 flex flex-wrap gap-2">
    <Link className={button} href="/dashboard/preparations">Mes préparations</Link>
    <Link className={button} href="/dashboard/idees">Boîte à idées et cadeaux</Link>
    <Link className={button} href="/dashboard/generate">Messages</Link>
    <Link className={button} href="/dashboard/messages-programmes">Messages programmés</Link>
    <Link className={button} href="/dashboard/budget">Budget cadeaux</Link>
    <Link className={button} href="/dashboard/styles">Mes styles</Link>
  </nav>
}
export function useAttentionLoad<T>(scope: string, loader: () => Promise<T>, refresh = 0) {
  const ref = useRef(loader)
  useEffect(() => { ref.current = loader })
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ scope: string; data?: T; error?: string }>({ scope: '' })
  useEffect(() => {
    let active = true
    ref.current().then(data => { if (active) setState({ scope, data }) }, error => { if (active) setState({ scope, error: attentionError(error) }) })
    return () => { active = false }
  }, [scope, attempt, refresh])
  return { data: state.scope === scope ? state.data : undefined, error: state.scope === scope ? state.error : undefined, reload: () => setAttempt(n => n + 1) }
}
export function LoadState({ error, retry }: { error?: string; retry: () => void }) {
  return error ? <div role="alert" className={panel}><p>{error}</p><button className={button} onClick={retry}>Réessayer</button></div> : <p role="status">Chargement des données privées…</p>
}
export function EditForm({ children, save, onSaved, label = 'Enregistrer' }: { children: ReactNode; save: (data: FormData) => Promise<unknown>; onSaved: () => void; label?: string }) {
  const { registerPrivateDraft } = useContactDraft()
  const draftId = useId()
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  useEffect(() => { registerPrivateDraft(draftId, dirty); return () => registerPrivateDraft(draftId, false) }, [registerPrivateDraft, draftId, dirty])
  useEffect(() => {
    if (!dirty) return
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', leave)
    return () => { window.removeEventListener('beforeunload', leave) }
  }, [dirty])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    pending.current = true; setBusy(true); setError('')
    const data = new FormData(event.currentTarget)
    try { await save(data); setDirty(false); onSaved() }
    catch (error) { setError(attentionError(error)); setDirty(true) }
    finally { pending.current = false; setBusy(false) }
  }
  return <form onSubmit={submit} onChange={() => setDirty(true)} className="space-y-3">
    <fieldset disabled={busy} className="min-w-0 space-y-3">{children}<button className={button} type="submit">{busy ? 'Enregistrement…' : label}</button></fieldset>
    {dirty && <p className="text-xs text-muted">Modifications non enregistrées</p>}
    {error && <div role="alert" className="space-y-2 text-sm text-danger"><p>{error}</p><button type="button" className={button} onClick={() => { if (window.confirm('Recharger la page et abandonner les saisies non enregistrées ? Copie-les d’abord si tu souhaites les conserver.')) window.location.reload() }}>Recharger la page</button></div>}
  </form>
}
export function TextField({ name, label, value = '', type = 'text', required = false, maxLength }: { name: string; label: string; value?: string; type?: string; required?: boolean; maxLength?: number }) {
  return <label className="block text-sm">{label}<input className={field} name={name} defaultValue={value} type={type} required={required} maxLength={maxLength} /></label>
}
export function NoteField({ name, label, value = '', maxLength = 4000 }: { name: string; label: string; value?: string; maxLength?: number }) {
  return <label className="block text-sm">{label}<textarea className={field + ' min-h-24'} name={name} defaultValue={value} maxLength={maxLength} /></label>
}
export const text = (data: FormData, name: string) => String(data.get(name) ?? '').trim()
export const optional = (data: FormData, name: string) => text(data, name) || null
