'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { collectiveService } from '@/lib/collective-card-data'
import type { CollectiveRead, CollectiveMutation } from '@/lib/collective-card-contract'
import { avatarForCard } from '@/lib/avatar-data'
import CollectiveCardPanel, { CollectiveCardCreate } from './CollectiveCardPanel'

export default function CollectiveCardExperience({ owner, celebration, organizer }: { owner: string; celebration: string; organizer: boolean }) {
  const [view, setView] = useState<CollectiveRead | null>(null), [error, setError] = useState(''), [link, setLink] = useState(''), [linkError, setLinkError] = useState('')
  const epoch = useRef(0), requests = useRef(new Set<AbortController>()), current = useRef<CollectiveRead | null>(null)
  const sequence = useRef(0)
  const read = useCallback(async () => {
    const generation = epoch.current, order = ++sequence.current, abort = new AbortController(); requests.current.add(abort)
    try {
      const result = await collectiveService.read(owner, celebration, abort.signal)
      if (generation === epoch.current && order === sequence.current && !abort.signal.aborted) {
        const previous = current.current
        if (!previous || 'absente' in previous || 'absente' in result || previous.published?.version !== result.published?.version) setLink('')
        current.current = result; setView(result); setError('')
      }
      if (generation !== epoch.current || order !== sequence.current || abort.signal.aborted) throw new DOMException('Lecture dépassée.', 'AbortError')
      return result
    } catch (cause) {
      if (generation === epoch.current && order === sequence.current && !abort.signal.aborted) { current.current = null; setView(null); setLink(''); setError(cause instanceof Error ? cause.message : 'Lecture indisponible.') }
      throw cause
    } finally { requests.current.delete(abort) }
  }, [owner, celebration])
  useEffect(() => {
    const controllers = requests.current
    const clear = () => { epoch.current++; controllers.forEach(c => c.abort()); controllers.clear(); current.current = null; setView(null); setLink('') }
    const refresh = () => { if (navigator.onLine && document.visibilityState === 'visible') { clear(); void read().catch(() => {}) } }
    // Les lectures périodiques gardent le composant de saisie monté et son brouillon en mémoire.
    const periodic = () => { if (navigator.onLine && document.visibilityState === 'visible') void read().catch(() => {}) }
    const offline = () => { clear(); setError('Hors ligne. Reconnecte-toi pour relire la carte ; les images préparées ont été retirées.') }
    const visibility = () => { if (document.visibilityState === 'visible') periodic(); else setLink('') }
    const timer = window.setInterval(periodic, 60000)
    window.addEventListener('online', refresh); window.addEventListener('offline', offline); window.addEventListener('focus', periodic); document.addEventListener('visibilitychange', visibility)
    refresh()
    return () => { clear(); window.clearInterval(timer); window.removeEventListener('online', refresh); window.removeEventListener('offline', offline); window.removeEventListener('focus', periodic); document.removeEventListener('visibilitychange', visibility) }
  }, [read])
  async function command(value: CollectiveMutation) {
    const generation = epoch.current, abort = new AbortController(); requests.current.add(abort)
    let failure: unknown
    try { await collectiveService.command(owner, celebration, value, abort.signal) } catch (cause) { failure = cause }
    finally { requests.current.delete(abort) }
    if (generation !== epoch.current || abort.signal.aborted) return
    // Même après réponse perdue/conflit : relire, en gardant le même éditeur et sa saisie.
    await read()
    if (failure) throw failure
  }
  async function recoverLink() {
    const generation = epoch.current, abort = new AbortController(); requests.current.add(abort); setLinkError('')
    try {
      const result = await collectiveService.link(owner, celebration, abort.signal), latest = await read()
      if (generation !== epoch.current || abort.signal.aborted || 'absente' in latest || result.version !== latest.published?.version || Date.parse(result.expiresAt) <= Date.now()) return
      setLink(window.location.origin + '/carte#' + result.secret)
    } catch (cause) { if (generation === epoch.current) { setLink(''); setLinkError(cause instanceof Error ? cause.message : 'Lien indisponible.') } }
    finally { requests.current.delete(abort) }
  }
  if (!view) return <section className="space-y-3 rounded-2xl border border-line p-4"><h2 className="font-semibold">Carte collective</h2><p role="status">{error || 'Lecture de la carte…'}</p>{error && <button type="button" className="min-h-11 rounded-xl border border-line px-4" onClick={() => void read().catch(() => {})}>Réessayer</button>}</section>
  if ('absente' in view) return organizer ? <CollectiveCardCreate key={owner + celebration} create={command} /> : null
  return <div className="min-w-0 space-y-3"><CollectiveCardPanel key={view.id} view={view} command={command} chooseAvatar={() => avatarForCard(owner)} verify={async () => {
    const expected = view.published, result = await read()
    if ('absente' in result || !expected || result.published?.version !== expected.version || Date.parse(result.published.expiresAt) <= Date.now()) throw new Error('La publication a changé. Relis la carte.')
    return result.published.content
  }} />{view.isOrganizer && view.published && <section className="space-y-2 rounded-2xl border border-line p-4"><button type="button" className="min-h-11 rounded-xl border border-line px-4" onClick={() => void recoverLink()}>Obtenir le lien de la carte publiée</button>{link && <><label className="block">Lien secret transférable<input readOnly className="w-full" value={link} onFocus={e => e.currentTarget.select()} /></label><button type="button" className="min-h-11 rounded-xl border border-line px-4" onClick={() => void navigator.clipboard.writeText(link).catch(() => setLinkError('Sélectionne et copie le lien dans le champ.'))}>Copier le lien</button></>}{linkError && <p role="alert">{linkError}</p>}</section>}</div>
}
