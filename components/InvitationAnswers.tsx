'use client'
import { useEffect, useRef, useState } from 'react'
import { notifyContactsChanged } from '@/lib/contact-changes'
import { notifyNotificationsChanged } from '@/lib/notification-changes'
import { useDashboardUser } from '@/components/DashboardUserContext'
import { invitationRpc, readPendingAnswers } from '@/lib/invitation-data'
import { invitationNote, type InvitationAnswer, type InvitationCandidate, type PendingAnswer } from '@/lib/invitation-contract'
import type { Json } from '@/types/database'
const labels = { prenom: 'Prénom', nom: 'Nom', email: 'E-mail', tel: 'Téléphone', indicatif: 'Indicatif', relation: 'Relation', note: 'Goûts et texte libre', anniversaire: 'Anniversaire' } as const
type Field = keyof typeof labels
function incoming(d: InvitationAnswer): InvitationCandidate { return { ...d, id: '', note: invitationNote(d), empreinte: '' } }
function display(value: unknown) {
  if (value && typeof value === 'object' && 'day' in value && 'month' in value && 'year' in value) return String(value.day) + '/' + value.month + (value.year === null ? ' · année privée' : '/' + value.year)
  return typeof value === 'string' && value ? value : 'Non renseigné'
}
export default function InvitationAnswers() {
  const owner = useDashboardUser().id
  return <AccountAnswers key={owner} owner={owner} />
}
function AccountAnswers({ owner }: { owner: string }) {
  const [rows, setRows] = useState<PendingAnswer[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    readPendingAnswers(owner).then(value => { if (alive) { setRows(value); setError('') } }).catch(failure => { if (alive) setError(failure instanceof Error ? failure.message : 'Réponses indisponibles.') }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [owner, attempt])
  return <section className="mb-8 space-y-4 rounded-2xl border border-accent/20 bg-surface p-4 sm:p-5"><h2 className="text-xl font-semibold">Réponses à examiner</h2><p className="text-sm text-muted">Une fiche reconnue est complétée sans remplacer tes informations. Les différences et homonymes demandent ton choix.</p>
    {loading && <p role="status">Chargement des réponses…</p>}
    {error && <p role="alert">{error} <button className="min-h-11 underline" onClick={() => { setLoading(true); setAttempt(value => value + 1) }}>Réessayer</button></p>}
    {!loading && !error && !rows.length && <p className="text-sm text-muted">Aucune réponse à vérifier.</p>}
    {rows.map(row => <Answer key={row.id + ':' + row.revision} row={row} owner={owner} onSaved={() => { setLoading(true); setAttempt(value => value + 1) }} />)}
  </section>
}
export function Answer({ row, owner, onSaved }: { row: PendingAnswer; owner: string; onSaved: () => void }) {
  const [target, setTarget] = useState(row.candidats.length === 1 ? row.candidats[0].id : ''), [fields, setFields] = useState<Field[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const alive = useRef(false), lock = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const candidate = row.candidats.find(value => value.id === target), data = incoming(row.donnees)
  async function run(action: 'completer' | 'creer' | 'ignorer') {
    if (lock.current || (action === 'completer' && !candidate)) return
    if (action === 'creer' && !window.confirm('Créer une personne distincte malgré la correspondance possible ?')) return
    lock.current = true; setBusy(true); setError('')
    try {
      const result = await invitationRpc<{ ok: boolean }>('traiter_reponse_invitation', { p_id: row.id, p_revision: row.revision, p_action: action, p_contact: target || null, p_champs: fields as Json, p_empreinte: candidate?.empreinte ?? null }, owner)
      if (!result.ok) throw new Error('Traitement non confirmé. Relis la liste.')
      if (alive.current) { notifyContactsChanged(owner); notifyNotificationsChanged(owner, 'centre'); onSaved() }
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'Traitement indisponible.') }
    finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  return <article className="space-y-4 rounded-2xl border border-line p-4"><h3 className="font-semibold">Réponse de {row.donnees.prenom} {row.donnees.nom}</h3>
    {!!row.candidats.length && <label className="block text-sm">Fiche à compléter<select className="mt-2 block w-full p-3" disabled={busy} value={target} onChange={event => { setTarget(event.target.value); setFields([]) }}><option value="">Choisir une fiche existante</option>{row.candidats.map(value => <option key={value.id} value={value.id}>{value.prenom} {value.nom}</option>)}</select></label>}
    <div className="space-y-3">{(Object.keys(labels) as Field[]).map(key => <div key={key} className="rounded-xl bg-canvas p-3 text-sm"><p className="font-medium">{labels[key]}</p><div className="grid gap-2 sm:grid-cols-2">
      {candidate && <p className="break-words text-muted">Ta fiche : {display(candidate[key])}</p>}<p className="break-words">Réponse : {display(data[key])}</p>
    </div>{candidate && display(candidate[key]) !== 'Non renseigné' && display(data[key]) !== 'Non renseigné' && JSON.stringify(candidate[key]) !== JSON.stringify(data[key]) && <label className="mt-2 flex min-h-11 items-center gap-2"><input type="checkbox" disabled={busy} checked={fields.includes(key)} onChange={event => setFields(value => event.target.checked ? [...value, key] : value.filter(field => field !== key))} />Utiliser la réponse pour ce champ</label>}</div>)}</div>
    <p className="text-xs text-muted">Les champs vides seront complétés. Les valeurs existantes restent conservées, sauf celles cochées explicitement.</p>
    {error && <p role="alert" className="text-danger">{error}</p>}
    <div className="flex flex-wrap gap-2"><button disabled={busy || !candidate} className="min-h-11 rounded-xl bg-action px-4 py-3 text-on-action disabled:opacity-50" onClick={() => void run('completer')}>Compléter cette fiche</button><button disabled={busy} className="min-h-11 rounded-xl border border-line px-4 py-3" onClick={() => void run('creer')}>Créer une personne distincte</button><button disabled={busy} className="min-h-11 px-4 py-3 underline" onClick={() => void run('ignorer')}>Garder ma fiche sans modification</button></div>
  </article>
}
