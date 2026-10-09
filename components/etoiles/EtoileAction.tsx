'use client'
import { useState, useRef, useEffect } from 'react'
import { useDashboardUser } from '@/components/DashboardUserContext'
import { useContactDraft } from '@/components/ContactDraftProvider'
import { useEtoiles } from './EtoilesContext'
import { commandeEtoile, type CommandeEtoile, type ResultatEtoile } from '@/lib/etoiles-contract'
import { sendEtoileCommand, EtoilesRequestError } from '@/lib/etoiles-data'

export default function EtoileAction({ action, donnees, children, confirmation, disabled = false, onResult, onBusy }: {
  action: CommandeEtoile['action']; donnees: Record<string, string>; children: React.ReactNode; confirmation?: string; disabled?: boolean;
  onResult?: (result: ResultatEtoile) => void; onBusy?: (busy: boolean) => void;
}) {
  const { id } = useDashboardUser(), social = useEtoiles(), { confirm } = useContactDraft()
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const attempt = useRef<{ key: string; command: CommandeEtoile } | null>(null), locked = useRef(false), alive = useRef(false), controller = useRef<AbortController | null>(null)
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); attempt.current = null } }, [id])
  async function run() {
    if (locked.current || disabled || social.offline || social.loading || social.error || navigator.onLine === false) return
    locked.current = true; setBusy(true); setError(''); setNotice(''); onBusy?.(true)
    try {
      if (confirmation && !await confirm(confirmation)) return
      if (!alive.current) return
      const key = JSON.stringify([action, donnees])
      if (attempt.current?.key !== key) attempt.current = { key, command: commandeEtoile({ action, donnees, operation: crypto.randomUUID() }) }
      const abort = new AbortController(); controller.current = abort
      const result = await sendEtoileCommand(id, attempt.current.command, abort.signal)
      if (!alive.current) return
      attempt.current = null
      // Le callback peut retirer ce bouton (révocation/association). Libérer le
      // panneau avant ce démontage, sinon son bouton Fermer resterait bloqué.
      onBusy?.(false)
      onResult?.(result); setNotice(result.message ?? 'Action enregistrée.')
      await social.refresh()
    } catch (err) {
      if (!alive.current) return
      if (err instanceof EtoilesRequestError && err.status >= 400 && err.status < 500) attempt.current = null
      setError(err instanceof Error ? err.message : 'Action indisponible. Réessaie.')
      // Une réponse perdue peut avoir suivi une écriture : relire aussi après erreur.
      await social.refresh()
    } finally { locked.current = false; if (alive.current) { setBusy(false); onBusy?.(false) } }
  }
  return <div className="min-w-0"><button type="button" disabled={disabled || busy || social.offline || social.loading || Boolean(social.error)} onClick={() => void run()}
    className="min-h-11 rounded-xl border border-line bg-ink/5 px-3 py-2 text-sm font-semibold hover:bg-ink/10 disabled:opacity-50">{busy ? 'En cours…' : children}</button>
    {error && <p role="alert" className="mt-2 max-w-md break-words text-sm text-danger">{error}</p>}{notice && <p role="status" className="mt-2 text-sm text-muted">{notice}</p>}</div>
}
