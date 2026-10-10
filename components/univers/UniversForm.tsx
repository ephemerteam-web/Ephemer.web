'use client'
// Orchestration indépendante du transport : révision, reprise et brouillon privé.
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useContactDraft } from '@/components/ContactDraftProvider'
import { resultatUnivers } from '@/lib/univers-contract'
import { commandeUniversCadeaux as commandeUnivers, monUniversCadeaux as monUnivers, type CommandeUniversCadeaux as CommandeUnivers, type MonUniversCadeaux as MonUnivers } from '@/lib/cadeaux-social-contract'
import UniversEditor from './UniversEditor'
import ShareImageButton from '../ShareImageButton'
import { ownUniversImageFields } from '@/lib/image-projections'
import { avatarRenderConfig } from '@/lib/avatar-render-config'

export type UniversService = {
  lire: (ownerId: string, signal: AbortSignal) => Promise<unknown>
  commander: (ownerId: string, command: CommandeUnivers, signal: AbortSignal) => Promise<unknown>
}
const isOffline = () => navigator.onLine === false
export default function UniversForm(props: { ownerId: string; api: UniversService; avatarEnregistre?: unknown }) {
  return <AccountUniversForm key={props.ownerId} {...props} />
}
export function AccountUniversForm({ ownerId, api, avatarEnregistre = null }: { ownerId: string; api: UniversService; avatarEnregistre?: unknown }) {
  const [saved, setSaved] = useState<MonUnivers | null>(null), [draft, setDraft] = useState<MonUnivers | null>(null)
  const [busy, setBusy] = useState(false), [offline, setOffline] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [conflict, setConflict] = useState(false)
  const { confirm, registerPrivateDraft } = useContactDraft(), id = useId()
  const alive = useRef(false), dirtyRef = useRef(false), lock = useRef(false), epoch = useRef(0)
  const readAbort = useRef<AbortController | null>(null), writeAbort = useRef<AbortController | null>(null)
  const attempt = useRef<{ fingerprint: string; command: CommandeUnivers } | null>(null), savedRef = useRef<MonUnivers | null>(null)
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved)
  let imageAvatar = null
  if (avatarEnregistre) { try { imageAvatar = avatarRenderConfig(avatarEnregistre) } catch { /* Pas de copie d'une configuration invalide. */ } }
  useEffect(() => { dirtyRef.current = dirty; savedRef.current = saved }, [dirty, saved])
  const invalidate = useCallback(() => { epoch.current++; readAbort.current?.abort(); writeAbort.current?.abort(); attempt.current = null }, [])
  const read = useCallback(async () => {
    if (!alive.current) throw new Error('Lecture univers abandonnée.')
    if (isOffline()) throw new Error('Hors ligne : reconnecte-toi pour relire ton univers.')
    readAbort.current?.abort()
    const version = ++epoch.current, abort = new AbortController(); readAbort.current = abort
    try {
      const row = monUnivers(await api.lire(ownerId, abort.signal))
      if (!alive.current || version !== epoch.current || abort.signal.aborted) throw new Error('Lecture univers dépassée.')
      return row
    } catch (failure) {
      if (!alive.current || version !== epoch.current || abort.signal.aborted) { const obsolete = new Error('Lecture univers abandonnée.'); obsolete.name = 'AbortError'; throw obsolete }
      throw failure
    }
  }, [api, ownerId])
  useEffect(() => {
    alive.current = true
    const refresh = async () => {
      if (document.visibilityState === 'hidden' || lock.current) return
      if (isOffline()) { setOffline(true); return }
      setOffline(false)
      try {
        const row = await read()
        if (dirtyRef.current) {
          if (row.revision !== savedRef.current?.revision) { setConflict(true); setNotice('Ton univers a changé ailleurs. Ta saisie est conservée ; relis avant d’enregistrer.') }
        } else { setSaved(row); setDraft(row); setConflict(false) }
        setError('')
      } catch (failure) { if (alive.current && (failure as Error)?.name !== 'AbortError') setError(failure instanceof Error ? failure.message : 'Lecture impossible.') }
    }
    const stop = () => { setOffline(true); epoch.current++; readAbort.current?.abort(); writeAbort.current?.abort() }
    void refresh()
    const update = () => { void refresh() }
    const timer = window.setInterval(update, 60000)
    window.addEventListener('focus', update); window.addEventListener('online', update); window.addEventListener('offline', stop)
    document.addEventListener('visibilitychange', update)
    return () => { alive.current = false; invalidate(); window.clearInterval(timer)
      window.removeEventListener('focus', update); window.removeEventListener('online', update); window.removeEventListener('offline', stop); document.removeEventListener('visibilitychange', update) }
  }, [read, invalidate])
  useEffect(() => { registerPrivateDraft(id, dirty); return () => registerPrivateDraft(id, false) }, [id, dirty, registerPrivateDraft])
  async function reload() {
    if (lock.current || isOffline()) return
    if (dirty && !await confirm('Relire remplacera ta saisie par les informations enregistrées. Continuer ?')) return
    lock.current = true; setBusy(true)
    try { const row = await read(); setSaved(row); setDraft(row); setError(''); setNotice('Informations enregistrées relues.'); setConflict(false); attempt.current = null }
    catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'Lecture impossible.') }
    finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  async function run(action: 'enregistrer' | 'masquer') {
    if (lock.current || !draft || !saved || isOffline() || conflict) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    let command: CommandeUnivers | null = null
    try {
      if (action === 'masquer' && !await confirm('Masquer toutes tes informations facultatives pour tes étoiles ? Les valeurs enregistrées restent privées. Ta saisie non enregistrée est conservée.')) return
      if (!alive.current || isOffline()) throw new Error('Reconnecte-toi avant de continuer.')
      const { revision: ignoredRevision, ...donnees } = draft; void ignoredRevision
      const fingerprint = JSON.stringify({ action, revision: saved.revision, donnees: action === 'enregistrer' ? donnees : {} })
      if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, command: commandeUnivers({ action, revision: saved.revision, operation: crypto.randomUUID(), donnees: action === 'enregistrer' ? donnees : {} }) }
      command = attempt.current.command
      epoch.current++; readAbort.current?.abort()
      const abort = new AbortController(); writeAbort.current = abort
      let result: ReturnType<typeof resultatUnivers> | null = null, failure: unknown = null
      try { result = resultatUnivers(await api.commander(ownerId, command, abort.signal)) } catch (error) { failure = error }
      // Même après erreur/réponse perdue : lire sans réémettre une nouvelle commande.
      const row = await read()
      const expected = command.revision + (action === 'masquer' && command.revision === 0 ? 0 : 1)
      const masked = Object.values(row.partage).every(value => !value) && ['presentation', 'passions', 'plaisirs', 'eviter'].every(key => !row.iaCadeaux[key as keyof typeof row.iaCadeaux])
      // L'ordre des clés reçu ne constitue pas une preuve : comparaison canonique métier.
      const same = action === 'enregistrer' && JSON.stringify(monUnivers({ ...command.donnees, revision: expected })) === JSON.stringify(row)
      if (row.revision === expected && (same || (action === 'masquer' && masked)) && (!result || result.revision === row.revision)) {
        setSaved(row)
        if (action === 'enregistrer') setDraft(row)
        else setDraft(previous => previous ? { ...previous, revision: row.revision, partage: { ...row.partage }, iaCadeaux: { ...row.iaCadeaux } } : row)
        setConflict(false); attempt.current = null; setNotice(action === 'enregistrer' ? 'Tes informations et ton partage sont enregistrés.' : 'Toutes tes informations facultatives sont masquées.')
      } else {
        if (row.revision !== saved.revision) setConflict(true)
        throw failure instanceof Error ? failure : new Error('Enregistrement non confirmé ou conflit. Ta saisie est conservée ; relis avant de continuer.')
      }
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'Action impossible. Ta saisie est conservée.') }
    finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  return <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
    <header><h1 className="text-2xl font-semibold text-ink">Mon univers</h1><p className="mt-2 text-sm text-muted">Présente-toi à tes étoiles et choisis ce que tu partages.</p></header>
    {saved && <ShareImageButton title="Mon univers" fields={ownUniversImageFields(saved)} avatarSnapshot={imageAvatar} />}
    {offline && <p role="status" className="text-sm text-muted">Hors ligne : tes modifications restent en mémoire pendant cette session.</p>}
    {error && <p role="alert" className="rounded-xl border border-line p-3 text-ink">{error}</p>}
    {notice && <p role="status" className="text-sm text-ink">{notice}</p>}
    {draft ? <UniversEditor draft={draft} onChange={value => { dirtyRef.current = JSON.stringify(value) !== JSON.stringify(savedRef.current); setDraft(value) }} avatarEnregistre={avatarEnregistre} disabled={busy} /> : <p className="text-muted">{error ? 'Les informations enregistrées ne sont pas disponibles.' : 'Chargement de ton univers…'}</p>}
    <div className="flex flex-wrap gap-3">
      {/* aria-disabled garde le déclencheur focalisable au retour du dialogue ; le verrou interdit tout deuxième appel. */}
      <button type="button" disabled={!draft || offline || conflict} aria-disabled={busy || !draft || offline || conflict} onClick={() => void run('enregistrer')} className="min-h-11 rounded-xl bg-action px-4 py-3 text-on-action disabled:opacity-50 aria-disabled:opacity-50">Enregistrer mes informations et mon partage</button>
      <button type="button" disabled={!saved || offline || conflict} aria-disabled={busy || !saved || offline || conflict} onClick={() => void run('masquer')} className="min-h-11 rounded-xl border border-line px-4 py-3 text-ink disabled:opacity-50 aria-disabled:opacity-50">Masquer toutes mes informations facultatives</button>
      <button type="button" disabled={offline} aria-disabled={busy || offline} onClick={() => void reload()} className="min-h-11 px-3 py-3 text-accent disabled:opacity-50 aria-disabled:opacity-50">Relire les informations enregistrées</button>
    </div>
    {dirty && <p className="text-sm text-muted">Modifications non enregistrées.</p>}
  </div>
}
