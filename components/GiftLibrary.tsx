'use client'
import { useRef, useState } from 'react'
import { useDashboardUser } from './DashboardUserContext'
import { AttentionNav, EditForm, LoadState, NoteField, TextField, button, field, panel, optional, text, useAttentionLoad } from './AttentionShared'
import { CURRENCIES, centsInput, merchantLink, money, parseCents, attentionError } from '@/lib/attention-utils'
import { attentionRows, removeAttention, requireOwner, saveAttention, type Choice, type Gift, type Idea } from '@/lib/attention-data'
import { supabase } from '@/lib/supabase-browser'
import { parisDay } from '@/lib/calendar-day'
import { useContactDraft } from './ContactDraftProvider'
import { readAllRows } from '@/lib/pagination'
import ShareImageButton from './ShareImageButton'

export function AmountFields({ prefix, label, cents = null, currency = 'EUR' }: { prefix: string; label: string; cents?: number | null; currency?: string | null }) {
  return <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
    <TextField name={prefix + 'Amount'} label={label + ' (facultatif, 0 si gratuit)'} value={centsInput(cents)} />
    <label className="block text-sm">Devise<select className={field} name={prefix + 'Currency'} defaultValue={currency ?? ''}><option value="">Non connue</option>{CURRENCIES.map(code => <option key={code}>{code}</option>)}</select></label>
  </div>
}
function amount(data: FormData, prefix: string) {
  const cents = parseCents(text(data, prefix + 'Amount')), currency = optional(data, prefix + 'Currency')
  if (cents !== null && !currency) throw new Error('Choisis la devise du montant.')
  if (currency && !CURRENCIES.some(code => code === currency)) throw new Error('Devise inconnue.')
  return { cents, currency }
}
export function IdeaEditor({ idea, contactId = null, initialTitle = '', onSaved }: { idea?: Idea; contactId?: number | null; initialTitle?: string; onSaved: () => void }) {
  const user = useDashboardUser()
  const id = useRef<string | null>(null)
  return <EditForm onSaved={onSaved} save={async data => {
    id.current ??= crypto.randomUUID()
    const estimated = amount(data, 'estimate')
    await saveAttention('idees_cadeaux', user.id, idea?.id ?? id.current, idea?.revision ?? null, {
      contact_id: idea?.contact_id ?? contactId, titre: text(data, 'title'), note: optional(data, 'note'),
      lien_marchand: merchantLink(text(data, 'link')), prix_estime_centimes: estimated.cents,
      devise_estimee: estimated.currency, archivee: data.get('archived') === 'on',
    })
  }}>
    <TextField name="title" label="Idée cadeau" required maxLength={200} value={idea?.titre ?? initialTitle} />
    <NoteField name="note" label="Note personnelle (facultative)" value={idea?.note ?? ''} />
    <TextField name="link" label="Lien marchand http/https (facultatif)" value={idea?.lien_marchand ?? ''} maxLength={2048} />
    <AmountFields prefix="estimate" label="Prix estimé" cents={idea?.prix_estime_centimes} currency={idea ? idea.devise_estimee : 'EUR'} />
    <label className="flex min-h-11 items-center gap-2"><input name="archived" type="checkbox" defaultChecked={idea?.archivee ?? false} />Archiver cette idée</label>
  </EditForm>
}
export function IdeaLibrary({ contactId, preparationId, onChanged }: { contactId?: number | null; preparationId?: string; onChanged?: () => void }) {
  const { hasPrivateDraft } = useContactDraft()
  const user = useDashboardUser()
  const loaded = useAttentionLoad(user.id + ':ideas:' + contactId, () => attentionRows('idees_cadeaux', user.id))
  const contacts = useAttentionLoad(user.id + ':idea-contacts', () => readAllRows(() => supabase.from('contacts').select('id,prenom,nom').eq('user_id', user.id)))
  const [search, setSearch] = useState(''), [selectedContact, setSelectedContact] = useState(''), [archive, setArchive] = useState('active'), [known, setKnown] = useState('all')
  const [budget, setBudget] = useState(''), [currency, setCurrency] = useState('EUR')
  let ceiling: number | null = null, filterError = ''
  try { ceiling = parseCents(budget) } catch (e) { filterError = e instanceof Error ? e.message : 'Plafond invalide.' }
  const visible = loaded.data?.filter(idea =>
    (contactId === undefined ? !selectedContact || (selectedContact === 'none' ? idea.contact_id === null : String(idea.contact_id) === selectedContact) : idea.contact_id === contactId || (preparationId && idea.contact_id === null)) &&
    idea.titre.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr')) &&
    (archive === 'all' || idea.archivee === (archive === 'archived')) &&
    (known === 'all' || (idea.prix_estime_centimes !== null) === (known === 'known')) &&
    (ceiling === null || (idea.prix_estime_centimes !== null && idea.devise_estimee === currency && idea.prix_estime_centimes <= ceiling))) ?? []
  const [editing, setEditing] = useState<Idea | 'new' | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const retries = useRef(new Map<string, string>())
  const changed = () => { setEditing(null); loaded.reload(); onChanged?.() }
  const edit = (next: Idea | 'new') => { if (!editing || !hasPrivateDraft() || window.confirm('Abandonner la saisie de cette idée sans l’enregistrer ?')) setEditing(next) }
  async function action(idea: Idea, remove = false) {
    if (pending.current) return
    if (editing && hasPrivateDraft() && !window.confirm('Abandonner la saisie non enregistrée avant cette action ?')) return
    if (remove && !window.confirm('Supprimer cette idée ? Les choix et cadeaux historiques seront conservés.')) return
    pending.current = true; setBusy(true); setError('')
    try {
      if (remove) await removeAttention('idees_cadeaux', user.id, idea.id)
      else if (preparationId) {
        await requireOwner(user.id)
        const key = preparationId + ':' + idea.id
        if (!retries.current.has(key)) retries.current.set(key, crypto.randomUUID())
        const result = await supabase.rpc('choisir_idee_lot05', { p_id: retries.current.get(key)!, p_preparation: preparationId, p_idee: idea.id })
        if (result.error) throw result.error
      }
      changed()
    } catch (error) { setError(attentionError(error)) }
    finally { pending.current = false; setBusy(false) }
  }
  return <section className={panel}><h2 className="text-lg font-bold">Boîte à idées</h2>
    <p className="text-sm text-muted">Garde une idée toute l’année, même sans événement. Les notes sont privées.</p>
    <button className={button} onClick={() => edit('new')}>Ajouter une idée</button>
    <fieldset disabled={!!editing} className="grid min-w-0 gap-3 rounded-xl bg-canvas p-3 sm:grid-cols-2 lg:grid-cols-3"><legend className="text-sm font-medium">Retrouver une inspiration</legend>
      <label className="text-sm">Rechercher un titre<input className={field} value={search} onChange={e => setSearch(e.target.value)} placeholder="Livre, sortie…" /></label>
      {contactId === undefined && <label className="text-sm">Contact<select className={field} value={selectedContact} onChange={e => setSelectedContact(e.target.value)}><option value="">Tous les contacts</option><option value="none">Sans contact</option>{contacts.data?.map(c => <option key={c.id} value={c.id}>{[c.prenom, c.nom].filter(Boolean).join(' ') || 'Contact sans nom'}</option>)}</select></label>}
      <label className="text-sm">Archivage<select className={field} value={archive} onChange={e => setArchive(e.target.value)}><option value="active">Idées actives</option><option value="archived">Idées archivées</option><option value="all">Toutes</option></select></label>
      <label className="text-sm">Estimation<select className={field} value={known} onChange={e => setKnown(e.target.value)}><option value="all">Connue ou inconnue</option><option value="known">Montant connu</option><option value="unknown">Montant inconnu</option></select></label>
      <label className="text-sm">Estimation maximale<input className={field} inputMode="decimal" maxLength={30} value={budget} onChange={e => setBudget(e.target.value)} placeholder="Facultatif" /></label>
      <label className="text-sm">Devise du plafond<select className={field} value={currency} onChange={e => setCurrency(e.target.value)}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></label>
      <p className="text-xs text-muted sm:col-span-2 lg:col-span-3">Un plafond filtre les estimations connues dans cette devise. Les autres devises et montants inconnus restent accessibles en retirant le plafond. Aucune estimation ne garantit un prix marchand.</p>
    </fieldset>
    {contacts.error && <p role="alert" className="text-sm">Le filtre de contacts n’a pas pu être chargé. <button className={button} onClick={contacts.reload}>Réessayer</button></p>}
    {filterError && <p role="alert" className="text-sm text-danger">{filterError}</p>}
    {editing && <IdeaEditor key={editing === 'new' ? 'new' : editing.id + ':' + editing.revision} idea={editing === 'new' ? undefined : editing} contactId={contactId ?? null} onSaved={changed} />}
    {error && <p role="alert">{error}</p>}
    {!loaded.data ? <LoadState error={loaded.error} retry={loaded.reload} /> : <>
      {!visible.length && <p className="rounded-xl bg-canvas p-5 text-sm text-muted">Aucune idée ne correspond. Ajoute une inspiration ou élargis les filtres.</p>}
      {visible.map(idea => <article key={idea.id} className="space-y-3 rounded-2xl border border-line bg-canvas p-4 sm:p-5">
        <h3 className="break-words font-semibold">{idea.titre}{idea.archivee && ' · Archivée'}</h3>
        <ShareImageButton title={idea.titre} fields={[{ id: 'link', label: 'Lien marchand', value: idea.lien_marchand }, { id: 'note', label: 'Note', value: idea.note, sensitive: true }, { id: 'amount', label: 'Prix estimé', value: money(idea.prix_estime_centimes, idea.devise_estimee), sensitive: true }]} />
        <p>{money(idea.prix_estime_centimes, idea.devise_estimee)} estimé</p>
        {idea.note && <p className="whitespace-pre-wrap break-words text-sm">{idea.note}</p>}
        {idea.lien_marchand && <a className={button} href={merchantLink(idea.lien_marchand) ?? undefined} target="_blank" rel="noopener noreferrer">Voir chez le marchand</a>}
        <div className="flex flex-wrap gap-2">
          <button className={button} onClick={() => edit(idea)}>Modifier</button>
          {preparationId && !idea.archivee && <button disabled={busy} className={button} onClick={() => void action(idea)}>Choisir pour cet événement</button>}
          <button disabled={busy} className={button} onClick={() => void action(idea, true)}>Supprimer</button>
        </div>
      </article>)}
    </>}
  </section>
}
function ChoiceEditor({ choice, onSaved }: { choice: Choice; onSaved: () => void }) {
  const user = useDashboardUser()
  return <EditForm onSaved={onSaved} save={async data => {
    const spent = amount(data, 'paid'), estimated = amount(data, 'estimate'), state = text(data, 'state')
    if (state !== 'achete' && (spent.cents !== null || text(data, 'purchaseDate'))) throw new Error('Pour déclarer une dépense, choisis « Acheté ». Efface le montant payé et la date pour revenir à prévu ou abandonné.')
    await saveAttention('choix_cadeaux', user.id, choice.id, choice.revision, {
      titre: text(data, 'title'), etat: state,
      prix_estime_centimes: estimated.cents, devise_estimee: estimated.currency,
      montant_depense_centimes: state === 'achete' ? spent.cents : null,
      devise_depensee: state === 'achete' ? spent.currency : null, date_achat: state === 'achete' ? optional(data, 'purchaseDate') : null,
    })
  }}>
    <TextField name="title" label="Cadeau choisi" required value={choice.titre} maxLength={200} />
    <AmountFields prefix="estimate" label="Prix estimé" cents={choice.prix_estime_centimes} currency={choice.devise_estimee} />
    <label className="block text-sm">État déclaré<select name="state" className={field} defaultValue={choice.etat}><option value="prevu">Prévu / rouvrir</option><option value="achete">Acheté</option><option value="abandonne">Abandonné</option></select></label>
    <AmountFields prefix="paid" label="Montant réellement payé" cents={choice.montant_depense_centimes} currency={choice.devise_depensee ?? 'EUR'} />
    <TextField name="purchaseDate" label="Date d’achat (facultative)" type="date" value={choice.date_achat ?? ''} />
  </EditForm>
}
function DonateChoice({ choice, onSaved }: { choice: Choice; onSaved: () => void }) {
  const user = useDashboardUser()
  const id = useRef<string | null>(null)
  return <EditForm label="Noter ce cadeau offert" onSaved={onSaved} save={async data => {
    await requireOwner(user.id); id.current ??= crypto.randomUUID()
    const result = await supabase.rpc('noter_cadeau_offert_lot05', { p_id: id.current, p_choix: choice.id, p_date: text(data, 'date'), p_reaction: optional(data, 'reaction') as unknown as string })
    if (result.error) throw result.error
  }}>
    <TextField name="date" type="date" label="Date du don" required value={parisDay()} />
    <NoteField name="reaction" label="Réaction (facultative, saisie par toi)" />
    <p className="text-xs text-muted">Le don ne déclare ni achat ni livraison. La dépense éventuelle reste attachée au choix.</p>
  </EditForm>
}
export function GiftChoices({ preparationId, refresh = 0 }: { preparationId: string; refresh?: number }) {
  const user = useDashboardUser()
  const loaded = useAttentionLoad(user.id + ':choices:' + preparationId, async () => {
    const [choices, gifts] = await Promise.all([attentionRows('choix_cadeaux', user.id), attentionRows('cadeaux_offerts', user.id)])
    return { choices, gifts }
  }, refresh)
  return <section className={panel}><h2 className="text-lg font-bold">Cadeaux pour cet événement</h2>
    {!loaded.data ? <LoadState error={loaded.error} retry={loaded.reload} /> : <>
      {!loaded.data.choices.some(c => c.preparation_id === preparationId) && <p>Choisis une idée ci-dessous pour commencer.</p>}
      {loaded.data.choices.filter(c => c.preparation_id === preparationId).map(choice => <article className="space-y-3 border-t border-line pt-3" key={choice.id + ':' + choice.revision}>
        <h3 className="break-words font-semibold">{choice.titre} · {choice.etat === 'achete' ? 'Acheté' : choice.etat === 'abandonne' ? 'Abandonné' : 'Prévu'}</h3>
        <ShareImageButton title={choice.titre} fields={[{ id: 'state', label: 'État', value: choice.etat }, { id: 'estimate', label: 'Prix estimé', value: money(choice.prix_estime_centimes, choice.devise_estimee), sensitive: true }, { id: 'paid', label: 'Montant dépensé', value: money(choice.montant_depense_centimes, choice.devise_depensee), sensitive: true }]} />
        <p>{money(choice.prix_estime_centimes, choice.devise_estimee)} estimé{choice.etat === 'achete' && ' · ' + money(choice.montant_depense_centimes, choice.devise_depensee) + ' dépensé'}</p>
        <details><summary className="min-h-11 cursor-pointer py-2">Modifier le choix ou déclarer l’achat</summary><ChoiceEditor choice={choice} onSaved={loaded.reload} /></details>
        {loaded.data!.gifts.some(g => g.choix_id === choice.id) ? <p className="text-success">Cadeau offert déclaré</p> : <details><summary className="min-h-11 cursor-pointer py-2">Noter le cadeau offert</summary><DonateChoice choice={choice} onSaved={loaded.reload} /></details>}
      </article>)}
    </>}
  </section>
}
export function GiftEditor({ gift, contactId = null, recipient = '', initialTitle = '', occurrenceId = null, onSaved }: { gift?: Gift; contactId?: number | null; recipient?: string; initialTitle?: string; occurrenceId?: string | null; onSaved: () => void }) {
  const user = useDashboardUser(), id = useRef<string | null>(null)
  return <EditForm onSaved={onSaved} save={async data => {
    id.current ??= crypto.randomUUID()
    const bought = !gift?.choix_id && data.get('bought') === 'on'
    const spent = amount(data, 'paid')
    if (!bought && (spent.cents !== null || text(data, 'purchaseDate'))) throw new Error('Coche « Achat déclaré » pour enregistrer une dépense, ou efface le montant et la date.')
    await saveAttention('cadeaux_offerts', user.id, gift?.id ?? id.current, gift?.revision ?? null, {
      contact_id: gift?.contact_id ?? contactId, destinataire_historique: text(data, 'recipient'), titre: text(data, 'title'),
      date_don: text(data, 'date'), reaction: optional(data, 'reaction'), achat_declare: bought,
      ...(!gift && occurrenceId ? { occurrence_id: occurrenceId } : {}),
      montant_depense_centimes: bought ? spent.cents : null, devise_depensee: bought ? spent.currency : null, date_achat: bought ? optional(data, 'purchaseDate') : null,
    })
  }}>
    <TextField name="recipient" label="Destinataire (conservé dans l’historique)" required value={gift?.destinataire_historique ?? recipient} maxLength={200} />
    <TextField name="title" label="Cadeau offert" required value={gift?.titre ?? initialTitle} maxLength={200} />
    <TextField name="date" label="Date du don" required type="date" value={gift?.date_don ?? parisDay()} />
    <NoteField name="reaction" label="Réaction volontaire (facultative)" value={gift?.reaction ?? ''} />
    {!gift?.choix_id && <>
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="bought" defaultChecked={gift?.achat_declare ?? false} />Achat déclaré</label>
      <AmountFields prefix="paid" label="Montant réellement payé" cents={gift?.montant_depense_centimes} currency={gift?.devise_depensee ?? 'EUR'} />
      <TextField name="purchaseDate" label="Date d’achat (facultative)" type="date" value={gift?.date_achat ?? ''} />
    </>}
  </EditForm>
}
export function GiftHistory({ contactId, recipient = '' }: { contactId?: number; recipient?: string }) {
  const { hasPrivateDraft } = useContactDraft()
  const user = useDashboardUser()
  const loaded = useAttentionLoad(user.id + ':history:' + contactId, async () => ({ gifts: await attentionRows('cadeaux_offerts', user.id), choices: await attentionRows('choix_cadeaux', user.id) }))
  const [editing, setEditing] = useState<Gift | 'new' | null>(null), [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const changed = () => { setEditing(null); loaded.reload() }
  const edit = (next: Gift | 'new') => { if (!editing || !hasPrivateDraft() || window.confirm('Abandonner la saisie de ce cadeau sans l’enregistrer ?')) setEditing(next) }
  return <section className={panel}><h2 className="text-lg font-bold">Mémoire des cadeaux offerts</h2>
    <button className={button} onClick={() => edit('new')}>Noter un cadeau offert directement</button>
    {editing && <GiftEditor key={editing === 'new' ? 'new' : editing.id + ':' + editing.revision} gift={editing === 'new' ? undefined : editing} contactId={contactId ?? null} recipient={recipient} onSaved={changed} />}
    {error && <p role="alert">{error}</p>}
    {!loaded.data ? <LoadState error={loaded.error} retry={loaded.reload} /> : <>
      {!loaded.data.gifts.filter(g => contactId === undefined || g.contact_id === contactId).length && <p>Aucun cadeau offert enregistré.</p>}
      {loaded.data.gifts.filter(g => contactId === undefined || g.contact_id === contactId).sort((a,b) => b.date_don.localeCompare(a.date_don)).map(gift => {
        const source = gift.choix_id ? loaded.data!.choices.find(c => c.id === gift.choix_id) : gift
        return <article className="space-y-2 border-t border-line pt-3" key={gift.id}>
          <h3 className="break-words font-semibold">{gift.titre} · {gift.destinataire_historique}</h3>
          <ShareImageButton title={gift.titre} fields={[{ id: 'recipient', label: 'Pour', value: gift.destinataire_historique }, { id: 'date', label: 'Offert le', value: gift.date_don }, { id: 'reaction', label: 'Réaction', value: gift.reaction, sensitive: true }, { id: 'amount', label: 'Montant', value: source ? money(source.montant_depense_centimes, source.devise_depensee) : '', sensitive: true }]} />
          <p>Offert le {gift.date_don}{source && ' · ' + money(source.montant_depense_centimes, source.devise_depensee)}</p>
          {gift.reaction && <p className="whitespace-pre-wrap break-words">{gift.reaction}</p>}
          <div className="flex flex-wrap gap-2"><button className={button} onClick={() => edit(gift)}>Modifier</button>
            <button disabled={busy} className={button} onClick={async () => {
              if (busy || !window.confirm('Retirer ce don de l’historique ? Une dépense attachée au choix restera conservée.')) return
              if (editing && hasPrivateDraft() && !window.confirm('Abandonner la saisie non enregistrée avant ce retrait ?')) return
              setBusy(true); setError('')
              try { await removeAttention('cadeaux_offerts', user.id, gift.id); changed() } catch (e) { setError(attentionError(e)) } finally { setBusy(false) }
            }}>Retirer ce don</button></div>
        </article>
      })}
    </>}
  </section>
}
export default function GiftLibraryPage() {
  return <main className="mx-auto max-w-4xl space-y-6 p-4 text-ink"><h1 className="text-2xl font-bold">Mes idées et cadeaux</h1><AttentionNav /><IdeaLibrary /><GiftHistory /></main>
}
