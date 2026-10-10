'use client'
// 🎁 Centres d'intérêt explicitement choisis, jamais extraits des notes ni transmis à l'IA.
import Link from 'next/link'
import { useState } from 'react'
import { useDashboardUser } from './DashboardUserContext'
import { EditForm, LoadState, panel, button, useAttentionLoad } from './AttentionShared'
import { CATEGORIES_CADEAU } from '@/lib/gift-config'
import { giftCategories, preferenceRows, readStyleBook, savePreference } from '@/lib/personal-preferences'
import { StyleAssignmentEditor } from './MessageStyles'
import type { Tables } from '@/types/database'

export function RememberGiftInterests({ owner, contactId, categories, preference, onSaved }: { owner: string; contactId: number; categories: string[]; preference: Tables<'preferences_cadeaux_contacts'> | null; onSaved: () => void }) {
  const [snapshot, setSnapshot] = useState(preference)
  const [id] = useState(() => preference?.id ?? crypto.randomUUID())
  return <EditForm label="Enregistrer ces intérêts pour ce contact" onSaved={onSaved} save={async () => { const saved = await savePreference('preferences_cadeaux_contacts', owner, snapshot?.id ?? id, snapshot?.revision ?? null, { contact_id: contactId, categories: giftCategories(categories) }); setSnapshot(saved) }}>
    <p className="text-xs text-muted">Les catégories restent privées et servent seulement aux filtres locaux. Cette action ne donne aucun consentement IA.</p>
  </EditForm>
}
function InterestEditor({ owner, contactId, preference, onSaved }: { owner: string; contactId: number; preference: Tables<'preferences_cadeaux_contacts'> | null; onSaved: () => void }) {
  const [snapshot, setSnapshot] = useState(preference)
  const [id] = useState(() => preference?.id ?? crypto.randomUUID())
  return <EditForm onSaved={onSaved} save={async data => { const saved = await savePreference('preferences_cadeaux_contacts', owner, snapshot?.id ?? id, snapshot?.revision ?? null, { contact_id: contactId, categories: giftCategories(data.getAll('categories').map(String)) }); setSnapshot(saved) }}>
    <fieldset><legend className="font-semibold">Centres d’intérêt</legend>{CATEGORIES_CADEAU.map(c => <label key={c.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="categories" value={c.id} defaultChecked={snapshot?.categories.includes(c.id) ?? false} />{c.emoji} {c.nom}</label>)}</fieldset>
    <p className="text-xs text-muted">Choisis-les toi-même. Ils filtrent les suggestions localement et ne sont jamais envoyés à l’IA. Tout décocher retire ce filtre.</p>
  </EditForm>
}
export default function ContactPreferences({ contactId }: { contactId: number }) {
  const user = useDashboardUser()
  const [notice, setNotice] = useState('')
  const loaded = useAttentionLoad(user.id + ':contact-preferences:' + contactId, async () => {
    const [book, interests] = await Promise.all([readStyleBook(user.id), preferenceRows('preferences_cadeaux_contacts', user.id)])
    return { book, interests }
  })
  if (!loaded.data) return <LoadState error={loaded.error} retry={loaded.reload} />
  const preference = loaded.data.book.contacts.find(p => p.contact_id === contactId) ?? null, interests = loaded.data.interests.find(p => p.contact_id === contactId) ?? null
  const saved = () => { setNotice('Préférences enregistrées.'); loaded.reload() }
  return <section className={panel + ' space-y-5'} aria-label="Préférences personnelles du contact"><h2 className="text-xl font-bold">Ses messages et célébrations</h2>
    <StyleAssignmentEditor key={'style:' + user.id + ':' + contactId} owner={user.id} contactId={contactId} styles={loaded.data.book.styles} preference={preference} onSaved={saved} />
    <Link className={button} href="/dashboard/styles">Gérer mes styles</Link>
    <InterestEditor key={'interests:' + user.id + ':' + contactId} owner={user.id} contactId={contactId} preference={interests} onSaved={saved} />
    {notice && <p role="status" className="text-sm text-success">{notice}</p>}
  </section>
}
