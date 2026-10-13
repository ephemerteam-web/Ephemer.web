'use client'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { useDashboardUser } from './DashboardUserContext'
import { AttentionNav, EditForm, LoadState, NoteField, TextField, button, field, panel, optional, text, useAttentionLoad } from './AttentionShared'
import { GiftChoices, IdeaLibrary } from './GiftLibrary'
import { attentionRows, loadPreparation, requireOwner, type Task } from '@/lib/attention-data'
import { supabase } from '@/lib/supabase-browser'
import { daysBetween, parisDay } from '@/lib/calendar-day'
import { isUuid } from '@/lib/private-lists'
import { normalizeOccasion } from '@/lib/constants'
import { readAllRows } from '@/lib/pagination'
import CardPreview from './cards/CardPreview'
import ShareImageButton from './ShareImageButton'
import CelebrationTabs from './CelebrationTabs'
import CelebrationCosts from './CelebrationCosts'
import Modal from './Modal'
import { TASK_TEMPLATES, preparationIsHistory } from '@/lib/celebration-personal'
import { CELEBRATIONS_ENABLED } from '@/lib/celebration-contract'
import { CelebrationHub, PublishCelebration } from './celebrations/CelebrationExperience'

function TaskTemplates({ preparationId, onSaved }: { preparationId: string; onSaved: () => void }) {
  const user = useDashboardUser()
  const [selected, setSelected] = useState<keyof typeof TASK_TEMPLATES>('anniversaire')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const batch = useRef<{ template: keyof typeof TASK_TEMPLATES; ids: string[]; completed: number } | null>(null)
  const pending = useRef(false)
  async function add() {
    if (pending.current) return
    pending.current = true; setBusy(true); setError(''); setNotice('')
    batch.current ??= { template: selected, ids: TASK_TEMPLATES[selected].tasks.map(() => crypto.randomUUID()), completed: 0 }
    const current = batch.current
    try {
      await requireOwner(user.id)
      for (; current.completed < current.ids.length; current.completed++) {
        const result = await supabase.rpc('ajouter_tache_lot04', { p_id: current.ids[current.completed], p_preparation: preparationId, p_type: 'libre', p_titre: TASK_TEMPLATES[current.template].tasks[current.completed] })
        if (result.error) throw result.error
      }
      batch.current = null; setNotice('Les tâches du modèle ont été ajoutées.'); onSaved()
    } catch { setError('Ajout interrompu. Réessaie pour compléter ce modèle sans dupliquer les tâches déjà enregistrées.') }
    finally { pending.current = false; setBusy(false) }
  }
  return <details className={panel}><summary className="min-h-11 cursor-pointer py-2 font-semibold">Choisir un modèle de tâches</summary>
    <label className="block text-sm">Modèle<select className={field} value={selected} disabled={busy || batch.current !== null} onChange={e => { setSelected(e.target.value as keyof typeof TASK_TEMPLATES); setNotice('') }}>{Object.entries(TASK_TEMPLATES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
    <p className="text-sm text-muted">Aperçu : seules ces tâches seront ajoutées après ton choix.</p>
    <ul className="list-inside list-disc text-sm">{TASK_TEMPLATES[selected].tasks.map(title => <li key={title}>{title}</li>)}</ul>
    <button type="button" className={button} disabled={busy} onClick={() => void add()}>{busy ? 'Ajout…' : batch.current ? 'Compléter ce modèle' : 'Ajouter ces tâches'}</button>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </details>
}

const taskLabels: Record<string, string> = { cadeau: 'Choisir un cadeau', message: 'Préparer un message', appel: 'Prévoir un appel', sortie: 'Prévoir une sortie', libre: 'Tâche libre' }
function TaskEditor({ task, onSaved }: { task: Task; onSaved: () => void }) {
  const user = useDashboardUser()
  return <article className={panel}><h3 className="font-semibold">{taskLabels[task.type_tache]} · {task.etat === 'faite' ? task.type_tache === 'message' ? 'Message prêt' : 'Faite' : task.etat === 'abandonnee' ? 'Abandonnée' : 'À faire'}</h3>
    <EditForm onSaved={onSaved} save={async data => {
      await requireOwner(user.id)
      const result = await supabase.rpc('enregistrer_tache_lot04', { p_id: task.id, p_revision: task.revision,
        p_titre: text(data, 'title'), p_brouillon: optional(data, 'draft') as unknown as string, p_etat: text(data, 'state') })
      if (result.error) throw result.error
    }}>
      <TextField name="title" label="Titre de la tâche" required value={task.titre} maxLength={200} />
      {task.type_tache === 'message' && <NoteField name="draft" label="Brouillon privé" maxLength={10000} value={task.brouillon_texte ?? ''} />}
      <label className="block text-sm">Progression<select className={field} name="state" defaultValue={task.etat}>
        <option value="a_faire">À faire / rouvrir</option><option value="faite">{task.type_tache === 'message' ? 'Message prêt (texte requis)' : 'Faite'}</option><option value="abandonnee">Abandonner</option>
      </select></label>
      {task.type_tache === 'cadeau' && <p className="text-xs text-muted">Une tâche faite ne déclare aucun achat. Déclare l’achat séparément dans le choix cadeau.</p>}
      {task.type_tache === 'message' && <p className="text-xs text-muted">Message prêt signifie que tu as terminé le texte. Aucun envoi ni livraison n’est déclaré ici.</p>}
    </EditForm>
  </article>
}
function AddTask({ preparationId, onSaved }: { preparationId: string; onSaved: () => void }) {
  const user = useDashboardUser(), id = useRef<string | null>(null)
  const [version, setVersion] = useState(0)
  return <EditForm key={version} label="Ajouter cette action" onSaved={() => { id.current = null; setVersion(v => v + 1); onSaved() }} save={async data => {
    await requireOwner(user.id); id.current ??= crypto.randomUUID()
    const kind = text(data, 'kind')
    const result = await supabase.rpc('ajouter_tache_lot04', { p_id: id.current, p_preparation: preparationId, p_type: kind, p_titre: text(data, 'title') || taskLabels[kind] })
    if (result.error) throw result.error
  }}>
    <label className="block text-sm">Action facultative<select name="kind" className={field}>{Object.entries(taskLabels).map(([key,label]) => <option value={key} key={key}>{label}</option>)}</select></label>
    <TextField name="title" label="Titre personnalisé (facultatif)" maxLength={200} />
  </EditForm>
}
export default function PreparationScreen({ occurrenceId }: { occurrenceId: string }) {
  const user = useDashboardUser()
  return <PersonalCelebration key={user.id + ':' + occurrenceId} occurrenceId={occurrenceId} />
}
function PersonalCelebration({ occurrenceId }: { occurrenceId: string }) {
  const user = useDashboardUser()
  const loaded = useAttentionLoad(user.id + ':' + occurrenceId, async () => {
    if (!isUuid(occurrenceId)) throw new Error('Adresse de préparation invalide.')
    return loadPreparation(user.id, occurrenceId)
  })
  const [giftRefresh, setGiftRefresh] = useState(0)
  if (!loaded.data) return <main className="mx-auto max-w-4xl p-4 text-ink"><AttentionNav /><LoadState error={loaded.error} retry={loaded.reload} /></main>
  const { occurrence, event, contact, preparation, tasks } = loaded.data
  const remaining = daysBetween(parisDay(), occurrence.date_occurrence)
  const params = new URLSearchParams({ occurrenceId, eventType: normalizeOccasion(event.type_evenement) })
  if (contact) params.set('contactId', String(contact.id))
  return <main className="mx-auto max-w-4xl space-y-6 p-4 text-ink"><AttentionNav />
    <header className="space-y-2"><h1 className="break-words text-2xl font-bold">{event.titre}</h1>
      <p>{contact ? [contact.prenom, contact.nom].filter(Boolean).join(' ') : 'Ma date'} · {occurrence.date_occurrence} · {remaining < 0 ? 'Événement passé' : remaining === 0 ? 'Aujourd’hui' : 'Dans ' + remaining + ' jours'}</p>
      <p className="text-sm text-muted">Occurrence du cycle {occurrence.cycle}. La préparation de l’année suivante sera distincte.</p>
      <p className="text-sm text-muted">Organisation personnelle · Toi seul accèdes à cette préparation.</p>
      {(occurrence.annulee || event.archive) && <p className="rounded-lg border border-line p-3">Événement {occurrence.annulee ? 'annulé' : 'archivé'} : ton historique est conservé.</p>}
    </header>
    {CELEBRATIONS_ENABLED && <PublishCelebration source={{preparation:preparation.id,titre:event.titre,date:occurrence.date_occurrence,taches:tasks.map(task=>({id:task.id,titre:task.titre,type:task.type_tache}))}} />}
    <CelebrationTabs organisation={<>
    <section className={panel}><h2 className="text-lg font-bold">Ma préparation</h2>
      <ShareImageButton title={event.titre} fields={[{ id: 'date', label: 'Date', value: occurrence.date_occurrence }, { id: 'state', label: 'État', value: preparation.etat }, ...tasks.map(task => ({ id: task.id, label: task.titre, value: task.brouillon_texte ?? task.etat, sensitive: true }))]} />
      <EditForm key={preparation.id + ':' + preparation.revision} onSaved={loaded.reload} save={async data => {
        await requireOwner(user.id)
        const result = await supabase.rpc('enregistrer_preparation_lot04', { p_id: preparation.id, p_revision: preparation.revision,
          p_etat: text(data, 'state'), p_sans_achat: data.get('noPurchase') === 'on' })
        if (result.error) throw result.error
      }}>
        <label className="block text-sm">État<select className={field} name="state" defaultValue={preparation.etat}><option value="ouverte">Ouverte / rouvrir</option><option value="terminee">Terminée</option><option value="abandonnee">Abandonner</option></select></label>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="noPurchase" defaultChecked={preparation.sans_achat} />Sans achat</label>
        <p className="text-xs text-muted">Sans achat retire les choix prévus du budget ; aucune dépense ni aucun historique n’est effacé.</p>
      </EditForm>
    </section>
    <TaskTemplates preparationId={preparation.id} onSaved={loaded.reload} />
    <section className={panel}><h2 className="text-lg font-bold">Mes actions facultatives</h2><AddTask preparationId={preparation.id} onSaved={loaded.reload} /></section>
    {tasks.map(task => <TaskEditor key={task.id + ':' + task.revision} task={task} onSaved={loaded.reload} />)}
    <section className={panel}><h2 className="text-lg font-bold">Un coup de main pour trouver les mots ou une idée</h2>
      <div className="flex flex-wrap gap-2"><Link className={button} href={'/dashboard/generate?' + params}>Générer un message</Link></div>
      <p className="text-xs text-muted">Tes brouillons et préparatifs ne sont pas transmis automatiquement à l’IA.</p>
    </section>
    <CardPreview key={user.id + ':' + preparation.id} ownerId={user.id} preparationId={preparation.id} preparedMessage={tasks.find(task => task.type_tache === 'message')?.brouillon_texte ?? undefined} />
    </>} ideas={<>
    <GiftChoices preparationId={preparation.id} refresh={giftRefresh} onChanged={() => setGiftRefresh(v => v + 1)} />
    <IdeaLibrary contactId={contact?.id ?? null} preparationId={preparation.id} onChanged={() => setGiftRefresh(v => v + 1)} />
    <Link className={button} href={'/dashboard/idees?vue=suggestions&' + params}>Trouver des suggestions</Link>
    <p className="text-xs text-muted">La recherche de suggestions est facultative. Aucun appel IA à l’ouverture.</p>
    </>} costs={<CelebrationCosts preparationId={preparation.id} refresh={giftRefresh} includePlanned={!preparation.sans_achat && preparation.etat !== 'abandonnee' && !occurrence.annulee && !event.archive} />} />
  </main>
}
export function PreparationList() {
  const user = useDashboardUser()
  if(CELEBRATIONS_ENABLED)return <CelebrationHub key={user.id} legacy={<PersonalCelebrationList embedded/>}/>
  return <PersonalCelebrationList key={user.id} />
}
function PersonalCelebrationList({embedded=false}:{embedded?:boolean}) {
  const user = useDashboardUser()
  const [history, setHistory] = useState(false), [organize, setOrganize] = useState(false)
  const [soloOnly, setSoloOnly] = useState(false)
  const loaded = useAttentionLoad(user.id + ':preparations', async () => {
    const [preparations, occurrences, events] = await Promise.all([
      attentionRows('preparations_evenements', user.id),
      readAllRows(() => supabase.from('occurrences_evenements').select('*').eq('user_id', user.id)),
      readAllRows(() => supabase.from('evenements_personnels').select('*').eq('user_id', user.id)),
    ])
    return { preparations, occurrences, events }
  })
  const today = parisDay()
  const entries = (loaded.data?.preparations ?? []).map(preparation => {
    const occurrence = loaded.data?.occurrences.find(o => o.id === preparation.occurrence_id)
    const event = loaded.data?.events.find(e => e.id === occurrence?.evenement_id)
    return { preparation, occurrence, event, historical: preparationIsHistory(preparation, occurrence?.date_occurrence, today, occurrence?.annulee, event?.archive) }
  }).filter(entry => entry.historical === history).sort((a,b) => history ? b.preparation.updated_at.localeCompare(a.preparation.updated_at) : (a.occurrence?.date_occurrence ?? '9999').localeCompare(b.occurrence?.date_occurrence ?? '9999') || a.preparation.id.localeCompare(b.preparation.id))
  const Container=embedded?'section':'main'
  return <Container className="mx-auto max-w-4xl space-y-4 p-4 text-ink">{embedded?<h2 className="text-xl font-bold">Préparations personnelles existantes</h2>:<h1 className="text-2xl font-bold">Mes célébrations</h1>}<AttentionNav />
    <button className={button} onClick={() => setOrganize(true)}>Organiser une célébration</button>
    <p className="text-sm text-muted">Retrouve tes préparations personnelles, leurs idées et leurs frais au même endroit.</p>
    <div className="flex flex-wrap gap-2" aria-label="Organisation"><button className={button} aria-pressed={!soloOnly} onClick={() => setSoloOnly(false)}>Tous</button><button className={button} aria-pressed={soloOnly} onClick={() => setSoloOnly(true)}>Seul</button><button className={button} disabled>À plusieurs · indisponible</button></div>
    <div className="flex gap-2" aria-label="Période"><button className={button} aria-pressed={!history} onClick={() => setHistory(false)}>À venir</button><button className={button} aria-pressed={history} onClick={() => setHistory(true)}>Historique</button></div>
    <Modal open={organize} onClose={() => setOrganize(false)} title="Organiser une célébration" className="w-full sm:max-w-xl">
      <h2 className="text-xl font-bold">Organiser une célébration</h2>
      <p className="my-3 text-sm">Choisis une de tes dates enregistrées pour commencer une préparation personnelle. La date d’anniversaire reste inchangée.</p>
      {!loaded.data ? <LoadState error={loaded.error} retry={loaded.reload} /> : <div className="max-h-72 space-y-2 overflow-y-auto">{loaded.data.occurrences.filter(o => !o.annulee && o.date_occurrence >= today && loaded.data!.events.some(e => e.id === o.evenement_id && !e.archive)).sort((a,b) => a.date_occurrence.localeCompare(b.date_occurrence)).map(o => <Link key={o.id} className={button + ' flex justify-start'} href={'/dashboard/preparer/' + o.id}>{loaded.data!.events.find(e => e.id === o.evenement_id)?.titre} · {o.date_occurrence}</Link>)}</div>}
      <Link className={button + ' my-3'} href="/dashboard/calendrier">Créer ou retrouver une date dans Dates</Link>
      <p className="text-sm text-muted">L’organisation à plusieurs et la création sans date ne sont pas encore disponibles.</p>
      <button className={button + ' mt-3'} onClick={() => setOrganize(false)}>Fermer</button>
    </Modal>
    {!loaded.data ? <LoadState error={loaded.error} retry={loaded.reload} /> : <>
      {!entries.length && <p>{history ? 'Aucune préparation dans ton historique.' : 'Aucune célébration à venir. Choisis une date pour commencer.'}</p>}
      {entries.map(({ preparation, occurrence, event }) => {
        return <article className={panel} key={preparation.id}><h2 className="break-words font-bold">{event?.titre ?? 'Célébration'}</h2><p>{occurrence?.date_occurrence ?? 'Date indisponible'} · {preparation.etat === 'terminee' ? 'Terminée' : preparation.etat === 'abandonnee' ? 'Abandonnée' : 'Ouverte'}</p><Link className={button} href={'/dashboard/preparer/' + preparation.occurrence_id}>Ouvrir la célébration</Link><ShareImageButton title={event?.titre ?? 'Célébration'} fields={[{ id: 'date', label: 'Date', value: occurrence?.date_occurrence }, { id: 'state', label: 'État', value: preparation.etat }]} /></article>
      })}
    </>}
  </Container>
}
