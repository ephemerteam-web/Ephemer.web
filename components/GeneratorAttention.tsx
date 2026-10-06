'use client'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { useDashboardUser } from './DashboardUserContext'
import { EditForm, LoadState, button, panel, useAttentionLoad } from './AttentionShared'
import { IdeaEditor } from './GiftLibrary'
import { loadPreparation, requireOwner } from '@/lib/attention-data'
import { supabase } from '@/lib/supabase-browser'
import { isUuid } from '@/lib/private-lists'
import { useContactDraft } from './ContactDraftProvider'

export function SavePreparationMessage({ occurrenceId, message }: { occurrenceId: string; message: string }) {
  const user = useDashboardUser(), id = useRef<string | null>(null)
  const [notice, setNotice] = useState('')
  const task = useRef<{ id: string; revision: number; titre: string } | null>(null)
  const loaded = useAttentionLoad(user.id + ':' + occurrenceId, async () => {
    if (!isUuid(occurrenceId)) throw new Error('Occurrence invalide.')
    return loadPreparation(user.id, occurrenceId)
  })
  if (!loaded.data) return <LoadState error={loaded.error} retry={loaded.reload} />
  const existing = loaded.data.tasks.find(t => t.type_tache === 'message')
  const preparationId = loaded.data.preparation.id
  return <section className={panel}><EditForm label="Enregistrer comme brouillon dans la préparation" onSaved={() => { loaded.reload(); setNotice('Brouillon enregistré. Aucun message n’a été envoyé.') }} save={async () => {
    if (!isUuid(occurrenceId)) throw new Error('Occurrence invalide.')
    if (!message.trim()) throw new Error('Le message est vide.')
    await requireOwner(user.id)
    if (!task.current) {
      task.current = existing ?? null
      if (existing?.brouillon_texte && !window.confirm('Remplacer le brouillon enregistré par ce texte généré ?')) { task.current = null; throw new Error('Remplacement annulé. Le brouillon est conservé.') }
      if (!task.current) {
        id.current ??= crypto.randomUUID()
        const created = await supabase.rpc('ajouter_tache_lot04', { p_id: id.current, p_preparation: preparationId, p_type: 'message', p_titre: 'Préparer un message' })
        if (created.error) throw created.error
        task.current = created.data
        if (created.data?.brouillon_texte && !window.confirm('Un brouillon existe déjà. Le remplacer ?')) { task.current = null; throw new Error('Remplacement annulé. Le brouillon est conservé.') }
      }
    }
    if (!task.current) throw new Error('Tâche inaccessible.')
    const saved = await supabase.rpc('enregistrer_tache_lot04', { p_id: task.current.id, p_revision: task.current.revision, p_titre: task.current.titre, p_brouillon: message, p_etat: 'a_faire' })
    if (saved.error) throw saved.error
    if (!saved.data) throw new Error('Sauvegarde non confirmée.')
    task.current = saved.data
  }}><p className="text-sm text-muted">Le texte sera sauvegardé comme brouillon. Tu pourras déclarer « Message prêt » dans la préparation.</p></EditForm>
    {notice && <p role="status">{notice}</p>}<Link className={button} href={'/dashboard/preparer/' + occurrenceId}>Retrouver la préparation</Link>
  </section>
}
export function KeepGeneratedIdea({ title, contactId, occurrenceId }: { title: string; contactId: number | null; occurrenceId: string | null }) {
  const { hasPrivateDraft } = useContactDraft()
  const [open, setOpen] = useState(false), [notice, setNotice] = useState('')
  return <div className="mt-2 min-w-0"><button className={button} onClick={() => { if (!open || !hasPrivateDraft() || window.confirm('Fermer sans enregistrer cette idée ?')) setOpen(v => !v) }}>Garder cette idée</button>
    {open && <section className={panel}><IdeaEditor initialTitle={title} contactId={contactId} onSaved={() => { setOpen(false); setNotice('Idée enregistrée dans ta boîte à idées.') }} /></section>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {notice && occurrenceId && isUuid(occurrenceId) && <Link className={button} href={'/dashboard/preparer/' + occurrenceId}>Choisir pour cet événement</Link>}
  </div>
}
