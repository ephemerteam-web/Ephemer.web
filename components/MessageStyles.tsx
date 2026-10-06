'use client'
// ✍️ Sauvegardes explicites ; les formulaires gardent leur UUID et leur saisie après erreur.
import Link from 'next/link'
import { useState } from 'react'
import { useDashboardUser } from './DashboardUserContext'
import { useContactDraft } from './ContactDraftProvider'
import { AttentionNav, EditForm, LoadState, NoteField, TextField, button, field, panel, useAttentionLoad } from './AttentionShared'
import { TONS_MESSAGE } from '@/lib/constants'
import { readStyleBook, removePreference, savePreference } from '@/lib/personal-preferences'
import { styleValues, type MessageStyle } from '@/lib/message-styles'
import { requireOwner } from '@/lib/attention-data'

export function StyleEditor({ style, owner, onSaved }: { style?: MessageStyle; owner: string; onSaved: () => void }) {
  const [id] = useState(() => style?.id ?? crypto.randomUUID())
  return <EditForm save={data => savePreference('styles_messages', owner, id, style?.revision ?? null, styleValues(data))} onSaved={onSaved}>
    <TextField name="nom" label="Nom du style" value={style?.nom} required maxLength={80} />
    <label className="block text-sm">Ton<select name="ton" className={field} defaultValue={style?.ton ?? 'familier'}>{TONS_MESSAGE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">Longueur<select name="longueur" className={field} defaultValue={style?.longueur ?? 'courte'}><option value="courte">Courte · 1–2 phrases</option><option value="moyenne">Moyenne · 3–4 phrases</option><option value="longue">Longue · 5–6 phrases</option></select></label>
      <label className="block text-sm">S’adresser au destinataire<select name="adresse" className={field} defaultValue={style?.adresse ?? 'tu'}><option value="tu">Tutoiement</option><option value="vous">Vouvoiement</option></select></label></div>
    <label className="flex min-h-11 items-center gap-2 text-sm"><input name="emojis" type="checkbox" defaultChecked={style?.emojis ?? false} />Ajouter des emojis</label>
    <NoteField name="signature" label="Signature facultative, ajoutée localement" value={style?.signature} maxLength={200} />
    <p className="text-xs text-muted">Le nom et la signature ne sont jamais envoyés à l’IA. Tous les tons restent gratuits.</p>
  </EditForm>
}
type DefaultPreference = { id: string; style_id: string; revision: number } | null
export function StyleAssignmentEditor({ owner, styles, preference, contactId, onSaved }: { owner: string; styles: MessageStyle[]; preference: DefaultPreference; contactId?: number; onSaved: () => void }) {
  const [snapshot, setSnapshot] = useState(preference)
  const [id] = useState(() => preference?.id ?? crypto.randomUUID())
  const table = contactId === undefined ? 'preferences_styles_messages' : 'styles_messages_contacts'
  return <EditForm label="Enregistrer le choix" onSaved={onSaved} save={async data => {
    const styleId = String(data.get('style_id') ?? '')
    if (!styleId) { if (snapshot) await removePreference(table, owner, snapshot.id, snapshot.revision); else await requireOwner(owner); setSnapshot(null); return }
    if (!styles.some(s => s.id === styleId)) throw new Error('Style inaccessible.')
    const saved = await savePreference(table, owner, snapshot?.id ?? id, snapshot?.revision ?? null, { style_id: styleId, ...(contactId === undefined ? {} : { contact_id: contactId }) })
    setSnapshot(saved)
  }}><label className="block text-sm">{contactId === undefined ? 'Style par défaut du compte' : 'Style pour ce contact'}<select name="style_id" className={field} defaultValue={snapshot?.style_id ?? ''}><option value="">{contactId === undefined ? 'Réglages actuels, sans style par défaut' : 'Utiliser le défaut du compte'}</option>{styles.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}</select></label>
    <p className="text-xs text-muted">Les réglages temporaires du générateur restent prioritaires. Les messages déjà écrits sont conservés.</p>
  </EditForm>
}
export default function MessageStyles() {
  const user = useDashboardUser(), loaded = useAttentionLoad(user.id + ':styles', () => readStyleBook(user.id))
  const [editing, setEditing] = useState<MessageStyle | 'new' | null>(null)
  const [notice, setNotice] = useState('')
  const { hasPrivateDraft } = useContactDraft()
  const discard = () => !hasPrivateDraft() || window.confirm('Abandonner les modifications de style non enregistrées ?')
  if (!loaded.data) return <main className="p-4 text-ink"><LoadState error={loaded.error} retry={loaded.reload} /></main>
  const book = loaded.data, selected = editing && typeof editing === 'object' ? editing : undefined
  const saved = (message: string) => { setNotice(message); loaded.reload() }
  return <main className="mx-auto max-w-3xl space-y-6 p-4 text-ink sm:p-8"><header className="space-y-2"><h1 className="text-3xl font-bold">Mes styles</h1><p className="text-sm text-muted">Retrouve ta façon d’écrire, sans réécrire tes messages existants.</p><Link className={button} href="/dashboard/generate">Préparer un message</Link></header><AttentionNav />
    {notice && <p role="status" className="text-sm text-success">{notice}</p>}
    <section className={panel}><h2 className="text-lg font-semibold">Mon défaut</h2><StyleAssignmentEditor key={book.defaultPreference?.id ?? 'new-default'} owner={user.id} styles={book.styles} preference={book.defaultPreference} onSaved={() => saved('Style par défaut enregistré.')} /></section>
    <section className={panel}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Styles enregistrés</h2><button className={button} onClick={() => { if (discard()) setEditing('new') }}>Créer un style</button></div>
      {!book.styles.length && <p className="text-sm text-muted">Aucun style enregistré. Les six tons du générateur restent disponibles.</p>}
      <ul className="space-y-2">{book.styles.map(s => <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3"><span className="min-w-0 break-words font-medium">{s.nom}{book.defaultPreference?.style_id === s.id && ' · défaut'}</span><button className={button} onClick={() => { if (discard()) setEditing(s) }}>Modifier {s.nom}</button></li>)}</ul>
      {editing && <div className="space-y-3 border-t border-line pt-4"><h3 className="font-semibold">{selected ? 'Modifier le style' : 'Nouveau style'}</h3><StyleEditor key={selected?.id ?? 'new'} style={selected} owner={user.id} onSaved={() => { setEditing(null); saved('Style enregistré.') }} />
        {selected && <EditForm label="Supprimer ce style" onSaved={() => { setEditing(null); saved('Style et affectations supprimés. Messages existants conservés.') }} save={async () => { if (!window.confirm('Supprimer ce style et ses affectations ? Les messages existants seront conservés.')) throw new Error('Suppression annulée.'); await removePreference('styles_messages', user.id, selected.id, selected.revision) }}><p className="text-xs text-muted">Retire aussi le défaut et les affectations utilisant ce style.</p></EditForm>}
        <button className={button} onClick={() => { if (discard()) setEditing(null) }}>Fermer</button></div>}
    </section>
  </main>
}
