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
    <header className="space-y-2"><h1 className="break-words text-2xl font-bold">Préparer {event.titre}</h1>
      <p>{contact ? [contact.prenom, contact.nom].filter(Boolean).join(' ') : 'Ma date'} · {occurrence.date_occurrence} · {remaining < 0 ? 'Événement passé' : remaining === 0 ? 'Aujourd’hui' : 'Dans ' + remaining + ' jours'}</p>
      <p className="text-sm text-muted">Occurrence du cycle {occurrence.cycle}. La préparation de l’année suivante sera distincte.</p>
      {(occurrence.annulee || event.archive) && <p className="rounded-lg border border-line p-3">Événement {occurrence.annulee ? 'annulé' : 'archivé'} : ton historique est conservé.</p>}
    </header>
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
    <section className={panel}><h2 className="text-lg font-bold">Mes actions facultatives</h2><AddTask preparationId={preparation.id} onSaved={loaded.reload} /></section>
    {tasks.map(task => <TaskEditor key={task.id + ':' + task.revision} task={task} onSaved={loaded.reload} />)}
    <section className={panel}><h2 className="text-lg font-bold">Un coup de main pour trouver les mots ou une idée</h2>
      <div className="flex flex-wrap gap-2"><Link className={button} href={'/dashboard/generate?' + params}>Générer un message</Link><Link className={button} href={'/dashboard/gift-ideas?' + params}>Trouver des idées cadeaux</Link></div>
      <p className="text-xs text-muted">Tes brouillons et préparatifs ne sont pas transmis automatiquement à l’IA.</p>
    </section>
    <CardPreview key={user.id + ':' + preparation.id} ownerId={user.id} preparationId={preparation.id} preparedMessage={tasks.find(task => task.type_tache === 'message')?.brouillon_texte ?? undefined} />
    <GiftChoices preparationId={preparation.id} refresh={giftRefresh} />
    <IdeaLibrary contactId={contact?.id ?? null} preparationId={preparation.id} onChanged={() => setGiftRefresh(v => v + 1)} />
  </main>
}
export function PreparationList() {
  const user = useDashboardUser()
  const loaded = useAttentionLoad(user.id + ':preparations', async () => {
    const [preparations, occurrences, events] = await Promise.all([
      attentionRows('preparations_evenements', user.id),
      readAllRows(() => supabase.from('occurrences_evenements').select('*').eq('user_id', user.id)),
      readAllRows(() => supabase.from('evenements_personnels').select('*').eq('user_id', user.id)),
    ])
    return { preparations, occurrences, events }
  })
  return <main className="mx-auto max-w-4xl space-y-4 p-4 text-ink"><h1 className="text-2xl font-bold">Célébrations</h1><AttentionNav />
    {!loaded.data ? <LoadState error={loaded.error} retry={loaded.reload} /> : <>
      {!loaded.data.preparations.length && <p>Depuis le calendrier ou une fiche contact, choisis « Préparer cet événement ».</p>}
      {loaded.data.preparations.sort((a,b) => b.updated_at.localeCompare(a.updated_at)).map(preparation => {
        const occurrence = loaded.data!.occurrences.find(o => o.id === preparation.occurrence_id)
        const event = loaded.data!.events.find(e => e.id === occurrence?.evenement_id)
        return <article className={panel} key={preparation.id}><h2 className="break-words font-bold">{event?.titre ?? 'Événement'}</h2><p>{occurrence?.date_occurrence} · {preparation.etat === 'terminee' ? 'Terminée' : preparation.etat === 'abandonnee' ? 'Abandonnée' : 'Ouverte'}</p><Link className={button} href={'/dashboard/preparer/' + preparation.occurrence_id}>Préparer cet événement</Link><ShareImageButton title={event?.titre ?? 'Événement'} fields={[{ id: 'date', label: 'Date', value: occurrence?.date_occurrence }, { id: 'state', label: 'État', value: preparation.etat }]} /></article>
      })}
    </>}
  </main>
}
