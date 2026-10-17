'use client'
// Éditeur contrôlé ; transport/authentification portés par CollectiveCardExperience.
import { useEffect, useRef, useState } from 'react'
import { CARD_TEMPLATES } from '@/lib/cards'
import { collectiveCardSnapshot, COLLECTIVE_COPY_NOTICE, type CollectiveCardSnapshot } from '@/lib/collective-card'
import { collectiveEmail } from '@/lib/collective-card-workflow'
import type { CollectiveAction, CollectiveCommand } from '@/lib/collective-card-workflow'
import type { CollectiveCardView } from '@/lib/collective-card-contract'
import { resolveCivilSchedule, nextCollectivePassage, type CivilSchedule } from '@/lib/collective-card-schedule'
import { COLLECTIVE_EMAIL_LABELS } from '@/lib/collective-card-delivery'
import type { AvatarRenderConfig } from '@/lib/avatar-render-config'
import CardRendererV3 from '../cards/CardRendererV3'
import CollectivePublishedCard from '../cards/CollectivePublishedCard'

export type { CollectiveCardView } from '@/lib/collective-card-contract'
const button = 'min-h-11 rounded-xl border border-line px-4 py-2 text-sm text-accent disabled:opacity-50'
export function CollectiveCardCreate({ create }: { create: (value: { operation: string; revision: 0; data: { action: 'creer'; id: string; title: string; templateId: typeof CARD_TEMPLATES[number]['id']; recipientEmail: string } }) => Promise<void> }) {
  const [title, setTitle] = useState('Pour toi'), [templateId, setTemplate] = useState<typeof CARD_TEMPLATES[number]['id']>('clair_de_lune'), [address, setAddress] = useState(''), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const pending = useRef(false), ids = useRef(new Map<string, string>()), alive = useRef(true)
  useEffect(() => { alive.current = true; const commands = ids.current; return () => { alive.current = false; commands.clear() } }, [])
  async function submit() {
    if (pending.current || !confirmed) return
    pending.current = true; setBusy(true); setError('')
    try {
      if (!title.trim() || [...title].length > 200) throw new Error('Titre requis, limité à 200 caractères.')
      const recipientEmail = collectiveEmail(address), key = JSON.stringify([title, templateId, recipientEmail])
      if (!ids.current.has('card')) ids.current.set('card', crypto.randomUUID())
      if (!ids.current.has(key)) ids.current.set(key, crypto.randomUUID())
      await create({ operation: ids.current.get(key)!, revision: 0, data: { action: 'creer', id: ids.current.get('card')!, title, templateId, recipientEmail } })
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'Création non confirmée. Ta saisie est conservée.') }
    finally { pending.current = false; if (alive.current) setBusy(false) }
  }
  return <form className="min-w-0 space-y-3 rounded-2xl border border-line p-4" onSubmit={event => { event.preventDefault(); void submit() }} onChange={() => setConfirmed(false)}><h2 className="text-xl font-semibold">Préparer une carte collective</h2><fieldset disabled={busy} className="min-w-0 space-y-3"><label className="block">Titre<input className="mt-1 w-full min-w-0" value={title} onChange={e => setTitle(e.target.value)} required /></label><label className="block">Modèle<select className="mt-1 w-full min-w-0" value={templateId} onChange={e => setTemplate(e.target.value as typeof templateId)}>{CARD_TEMPLATES.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label><label className="block">Adresse privée de référence du destinataire<input className="mt-1 w-full min-w-0" type="email" value={address} onChange={e => setAddress(e.target.value)} required maxLength={254} autoComplete="off" /></label><p className="text-sm text-muted">Cette adresse sert à exclure le destinataire des préparatifs, même s’il crée son compte plus tard. Elle ne sera pas montrée aux participants. Créer la carte n’envoie aucun email et n’invite personne à signer.</p><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={confirmed} onChange={e => { e.stopPropagation(); setConfirmed(e.target.checked) }} />J’ai vérifié le modèle, le titre et l’adresse du destinataire.</label><button className={button} type="submit" disabled={!confirmed}>{busy ? 'Création…' : 'Créer la carte dans cette célébration'}</button></fieldset>{error && <p role="alert">{error}</p>}</form>
}
export default function CollectiveCardPanel({ view, command, verify, chooseAvatar }: { view: CollectiveCardView; command: (value: CollectiveCommand) => Promise<void>; verify: () => Promise<CollectiveCardSnapshot>; chooseAvatar: () => Promise<AvatarRenderConfig> }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [message, setMessage] = useState(view.mine?.message ?? ''), [signature, setSignature] = useState(view.mine?.signature ?? ''), [avatar, setAvatar] = useState<AvatarRenderConfig | null>(view.mine?.avatar ?? null)
  const [avatarChosen, setAvatarChosen] = useState(!!view.mine), [preview, setPreview] = useState(false), [consent, setConsent] = useState(false), [missing, setMissing] = useState(false)
  const operations = useRef(new Map<string, string>()), lock = useRef(false), alive = useRef(true)
  const retry = useRef<{ signature: string; command: CollectiveCommand } | null>(null)
  useEffect(() => { alive.current = true; const pending = operations.current; return () => { alive.current = false; pending.clear() } }, [])
  function publicationId() { const key = 'version:' + view.revision; if (!operations.current.has(key)) operations.current.set(key, crypto.randomUUID()); return operations.current.get(key)! }
  async function run(data: CollectiveAction) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    const key = JSON.stringify([view.revision, data]), signature = data.action === 'publier' ? JSON.stringify(['publier', data.expiryDays]) : JSON.stringify(data)
    if (!operations.current.has(key)) operations.current.set(key, crypto.randomUUID())
    if (retry.current?.signature !== signature) retry.current = { signature, command: { operation: operations.current.get(key)!, revision: view.revision, data } }
    try { await command(retry.current.command); retry.current = null; if (alive.current) setNotice('Action enregistrée. Relis l’état de la carte.') }
    catch (cause) { if ([400, 401, 403, 404, 409, 429].includes(Number((cause as { status?: number })?.status))) retry.current = null; if (alive.current) setError(cause instanceof Error ? cause.message : 'Résultat non confirmé. Ta saisie est conservée.') }
    finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  const candidate = { message, signature, avatar }
  return <section className="min-w-0 space-y-4 rounded-2xl border border-line p-4" aria-labelledby={'collective-' + view.id}>
    <h2 id={'collective-' + view.id} className="text-xl font-semibold">Carte collective</h2>
    <p className="text-sm">Participants → Contributions → Validation → Publication → Partage et envoi → Suivi</p>
    <p><strong>Prochaine action :</strong> {view.nextAction} · {view.responsible}</p>
    <p role="status">Contributions {view.phase === 'ouverte' ? 'ouvertes' : 'fermées'} · {view.validated ? 'Version validée' : 'Validation requise'}</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <fieldset disabled={busy} className="min-w-0 space-y-4">
      <details><summary className="min-h-11 cursor-pointer py-2">Participants et signatures</summary><ul className="space-y-2">{view.members.map(row => <li key={row.participation} className="flex flex-wrap items-center gap-2"><span>{row.name} · {row.signed ? 'Contribution confirmée' : row.invited ? 'Invité à signer' : 'Non invité à signer'}</span>{view.isOrganizer && view.phase === 'ouverte' && !row.invited && <button type="button" className={button} onClick={() => void run({ action: 'inviter', participation: row.participation })}>Inviter à signer</button>}</li>)}</ul></details>
      {view.invited && view.phase === 'ouverte' && <div className="space-y-3"><h3 className="font-semibold">Ma contribution</h3><label className="block">Mon texte<textarea className="mt-1 w-full" value={message} maxLength={4000} onChange={e => { setMessage(e.target.value); setPreview(false); setConsent(false) }} /></label><label className="block">Ma signature<input className="mt-1 w-full" value={signature} maxLength={400} onChange={e => { setSignature(e.target.value); setPreview(false); setConsent(false) }} /></label>
        <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => { setAvatar(null); setAvatarChosen(true); setPreview(false); setConsent(false) }}>Choisir sans avatar</button><button type="button" className={button} onClick={() => { lock.current = true; setBusy(true); void chooseAvatar().then(value => { if (alive.current) { setAvatar(value); setAvatarChosen(true); setPreview(false); setConsent(false) } }, () => { if (alive.current) setError('Impossible de copier ton avatar.') }).finally(() => { lock.current = false; if (alive.current) setBusy(false) }) }}>Choisir mon avatar enregistré</button></div>
        <p className="text-sm text-muted">2 000 caractères de texte et 200 de signature. Les membres autorisés pourront lire ta contribution confirmée. {COLLECTIVE_COPY_NOTICE}</p>
        <button type="button" className={button} disabled={!avatarChosen || !message.trim()} onClick={() => { try { collectiveCardSnapshot({ format: 3, renderVersion: 3, templateVersion: 1, templateId: view.templateId, title: view.title, contributions: [candidate] }); setPreview(true); setError('') } catch (cause) { setError((cause as Error).message) } }}>Prévisualiser ma contribution</button>
        {preview && <><CardRendererV3 snapshot={{ format: 3, renderVersion: 3, templateVersion: 1, templateId: view.templateId, title: view.title, contributions: [candidate] }} /><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />Je confirme ce texte, cette signature, cet avatar et le partage de la version publiée.</label><button type="button" className={button} disabled={!consent} onClick={() => void run({ action: 'confirmer', content: candidate, consent: true })}>Confirmer ma contribution</button></>}
      </div>}
      {view.contributions.map(row => <article key={row.author} className="space-y-2 border-t border-line pt-3"><h3 className="font-semibold">{row.name}{row.hidden ? ' · Masquée' : ''}</h3><p className="whitespace-pre-wrap break-words">{row.content.message}</p><p className="whitespace-pre-wrap break-words">{row.content.signature}</p><div className="flex flex-wrap gap-2">{(row.own || view.isOrganizer) && <button type="button" className={button} onClick={() => { if (window.confirm('Retirer cette contribution révoque aussi les versions publiées qui la contiennent. Continuer ?')) void run({ action: 'retirer', author: row.author }) }}>{row.own ? 'Retirer ma contribution' : 'Retirer cette contribution'}</button>}{view.isOrganizer && <button type="button" className={button} onClick={() => void run({ action: row.hidden ? 'retablir' : 'masquer', author: row.author })}>{row.hidden ? 'Rétablir' : 'Masquer'}</button>}<button type="button" className={button} onClick={() => void run({ action: 'signaler', author: row.author })}>Signaler aux organisateurs</button></div></article>)}
      {view.isOrganizer && view.reports.length > 0 && <details><summary className="min-h-11 cursor-pointer py-2">Signalements privés aux organisateurs</summary>{view.reports.map(row => <p key={row.author + row.target}>{view.members.find(member => member.account === row.author)?.name ?? 'Un membre'} a signalé la contribution de {view.members.find(member => member.account === row.target)?.name ?? 'ce membre'}. Le signalement ne contient aucune copie du texte.</p>)}</details>}
      {view.isOrganizer && <div className="space-y-3 border-t border-line pt-3"><label className="block">Responsable<select value={view.responsibleParticipation ?? ''} onChange={e => void run({ action: 'responsable', participation: e.target.value })}><option value="" disabled>Choisir</option>{view.members.filter(row => row.organizer).map(row => <option key={row.participation} value={row.participation}>{row.name}</option>)}</select></label>
        {view.phase === 'ouverte' ? <><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={missing} onChange={e => setMissing(e.target.checked)} />Je confirme la fermeture même si des personnes n’ont pas signé.</label><button type="button" className={button} onClick={() => void run({ action: 'fermer', confirmMissing: missing })}>Fermer les contributions</button></> : <><button type="button" className={button} onClick={() => { if (window.confirm('Réouvrir invalide la validation et les programmations encore annulables. Un email engagé ne peut pas être rappelé.')) void run({ action: 'rouvrir' }) }}>Réouvrir les contributions</button>{view.contributions.some(row => !row.hidden) && <><CardRendererV3 snapshot={{ format: 3, renderVersion: 3, templateVersion: 1, templateId: view.templateId, title: view.title, contributions: view.contributions.filter(row => !row.hidden).map(row => row.content) }} /><button type="button" className={button} onClick={() => void run({ action: 'valider' })}>Valider cet aperçu final</button></>}{view.validated && <><button type="button" className={button} onClick={() => void run({ action: 'publier', version: publicationId(), expiryDays: 30 })}>Publier maintenant · lien valable 30 jours</button><CollectiveScheduleForm run={run} /></>}</>}
        {view.published && <button type="button" className={button} onClick={() => { if (window.confirm('Révoquer le lien bloque les prochaines consultations, sans effacer les images déjà partagées.')) void run({ action: 'revoquer' }) }}>Révoquer le lien</button>}
        <button type="button" className={button} onClick={() => void run({ action: 'annuler_programmation' })}>Annuler les opérations encore en attente</button>
      </div>}
    </fieldset>
    <p>Publication : {view.publicationState}</p><p>Email : {COLLECTIVE_EMAIL_LABELS[view.emailState]}</p>
    {view.published && <CollectivePublishedCard snapshot={view.published.content} expiresAt={view.published.expiresAt} accessKey={view.published.version} verify={verify} />}
  </section>
}
function CollectiveScheduleForm({ run }: { run: (data: CollectiveAction) => Promise<void> }) {
  const [error, setError] = useState(''), [summary, setSummary] = useState(''), [plan, setPlan] = useState<Extract<CollectiveAction, { action: 'programmer' }> | null>(null)
  function preview(form: HTMLFormElement) {
    setError(''); setPlan(null)
    try {
      const data = new FormData(form), value = (name: string) => String(data.get(name) ?? '')
      const timeZone = value('zone')
      const resolve = (prefix: string): CivilSchedule | null => data.has(prefix) ? resolveCivilSchedule(value(prefix + 'Date'), value(prefix + 'Time'), timeZone, value(prefix + 'Occurrence') as CivilSchedule['occurrence']) : null
      const publication = resolve('publication'), email = resolve('email')
      if (!publication && !email) throw new Error('Choisis au moins une opération.')
      setPlan({ action: 'programmer', id: crypto.randomUUID(), publication, email, address: email ? value('address') : null, consent: true })
      const format = (instant: string) => new Date(instant).toLocaleString('fr-FR', { timeZone }) + ' · ' + timeZone
      setSummary([publication && 'Publication demandée : ' + format(publication.instant) + '. Prochain passage prévu : ' + format(nextCollectivePassage(publication.instant)), email && 'Tentative email demandée : ' + format(email.instant) + '. Prochain passage prévu : ' + format(nextCollectivePassage(email.instant))].filter(Boolean).join('\n'))
    } catch (cause) { setError((cause as Error).message) }
  }
  return <form className="space-y-3" onChange={() => { setPlan(null); setSummary('') }} onSubmit={event => { event.preventDefault(); preview(event.currentTarget) }}>
    <h3 className="font-semibold">Programmer la publication et l’envoi du lien</h3><label className="block">Fuseau<input className="mt-1 w-full min-w-0" name="zone" defaultValue="Europe/Paris" required /></label>
    {['publication', 'email'].map(kind => <fieldset key={kind} className="min-w-0 space-y-2"><legend><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name={kind} />{kind === 'publication' ? 'Programmer la publication' : 'Programmer la tentative email'}</label></legend><label className="block">Date<input className="mt-1 w-full min-w-0" name={kind + 'Date'} type="date" /></label><label className="block">Heure<input className="mt-1 w-full min-w-0" name={kind + 'Time'} type="time" /></label><label className="block">Occurrence de cette heure<select className="mt-1 w-full min-w-0" name={kind + 'Occurrence'} defaultValue="unique"><option value="unique">Heure unique</option><option value="premiere">Première occurrence lors du changement d’heure</option><option value="seconde">Seconde occurrence lors du changement d’heure</option></select></label></fieldset>)}
    <label className="block">Adresse privée du destinataire<input className="mt-1 w-full min-w-0" name="address" type="email" maxLength={254} autoComplete="off" /></label>
    <p className="text-sm text-muted">Traitement quotidien à 07 h UTC, avec jusqu’à près de 24 h d’attente, puis les délais du service. Le déclenchement peut varier dans l’heure prévue. Après 48 h de retard, une reprogrammation sera demandée. Aucun email ne précède la publication. La date de la célébration reste inchangée.</p>
    <button className={button} type="submit">Vérifier les horaires</button>{error && <p role="alert">{error}</p>}{plan && <><p className="whitespace-pre-wrap">{summary}</p><button className={button} type="button" onClick={() => void run(plan)}>Confirmer les horaires et l’adresse</button></>}
  </form>
}
