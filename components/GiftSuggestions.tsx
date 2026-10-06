'use client'
// 🎁 Une recherche explicite ; intérêts et historique filtrés dans le navigateur.
import { useRef, useState } from 'react'
import { useDashboardUser } from './DashboardUserContext'
import { useContactDraft } from './ContactDraftProvider'
import { useRequestLifetime } from '@/lib/hooks/useRequestLifetime'
import { supabase } from '@/lib/supabase-browser'
import { readAllRows } from '@/lib/pagination'
import { attentionRows, loadPreparation } from '@/lib/attention-data'
import { preferenceRows } from '@/lib/personal-preferences'
import { RememberGiftInterests } from './ContactPreferences'
import { CURRENCIES, merchantLink, parseCents } from '@/lib/attention-utils'
import { GIFT_MODES, type GiftMode } from '@/lib/ai-options'
import { filterGiftIdeas, giftTitleKey, usableGiftIdeas, type GiftIdea } from '@/lib/gift-ideas'
import { CATEGORIES_CADEAU, marchandsPourCategorie, type CategorieCadeau } from '@/lib/gift-config'
import { AI_NOTICE, minimalAIInput } from '@/lib/ai-privacy'
import type { AIContactField } from '@/lib/ai-consent'
import { TYPES_EVENEMENT } from '@/lib/constants'
import { isUuid } from '@/lib/private-lists'
import { KeepGeneratedIdea } from './GeneratorAttention'
import { GiftEditor } from './GiftLibrary'
import AIConsent from './AIConsent'
import { LoadState, button, field, panel, useAttentionLoad } from './AttentionShared'

function SuggestionCard({ idea, contactId, recipient, occurrenceId, noPurchase, previous, onGiftSaved }: { idea: GiftIdea; contactId: number | null; recipient: string; occurrenceId: string | null; noPurchase: boolean; previous: boolean; onGiftSaved?: () => void }) {
  const merchants = marchandsPourCategorie(idea.categorie as CategorieCadeau)
  const [merchantId, setMerchantId] = useState(merchants[0]?.id ?? ''), [giftOpen, setGiftOpen] = useState(false), [saved, setSaved] = useState(false)
  const { hasPrivateDraft } = useContactDraft()
  const merchant = merchants.find(m => m.id === merchantId)
  const link = merchant ? merchantLink(merchant.url(idea.recherche)) : null
  return <article className={panel + ' flex h-full flex-col rounded-2xl p-5'}>
    <div className="flex items-start gap-3"><span aria-hidden="true" className="text-3xl">{idea.emoji || '✨'}</span><div className="min-w-0"><p className="text-xs text-accent">{CATEGORIES_CADEAU.find(c => c.id === idea.categorie)?.nom}</p><h3 className="break-words text-lg font-semibold">{idea.idee}</h3></div></div>
    <p className="break-words text-sm text-muted">{idea.raison}</p>
    <p className="text-xs text-muted">{noPurchase ? 'Attention sans achat — à organiser toi-même.' : 'Idée à rechercher — prix et disponibilité à vérifier.'}</p>
    {previous && <p className="text-sm text-warning">Un cadeau du même titre figure dans ton historique.</p>}
    {!noPurchase && merchant && link && <div className="mt-auto space-y-2 border-t border-line pt-3"><label className="block text-sm">Choisir un marchand<select className={field} value={merchantId} onChange={e => setMerchantId(e.target.value)}>{merchants.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}</select></label><a className={button + ' w-full'} href={link} target="_blank" rel="noopener noreferrer">Rechercher chez {merchant.nom} ↗</a>{merchant.affilie && <p className="text-xs text-muted">Lien affilié : Ephemer peut recevoir une commission. Tu restes libre de choisir un autre marchand.</p>}</div>}
    <KeepGeneratedIdea title={idea.idee} contactId={contactId} occurrenceId={occurrenceId} />
    <button className={button} onClick={() => { if (!giftOpen || !hasPrivateDraft() || window.confirm('Fermer sans enregistrer ce cadeau ?')) setGiftOpen(v => !v) }}>Déjà offert ?</button>
    {giftOpen && <GiftEditor initialTitle={idea.idee} contactId={contactId} recipient={recipient} occurrenceId={occurrenceId} onSaved={() => { setSaved(true); setGiftOpen(false); onGiftSaved?.() }} />}
    {saved && <p role="status" className="text-sm text-success">Don enregistré. Aucun achat déclaré automatiquement.</p>}
  </article>
}
export default function GiftSuggestions({ initialContactId = null, initialEventType = 'anniversaire', occurrenceId = null }: { initialContactId?: string | null; initialEventType?: string; occurrenceId?: string | null }) {
  const user = useDashboardUser(), lifetime = useRequestLifetime(), pending = useRef(false)
  const { hasPrivateDraft } = useContactDraft()
  const loaded = useAttentionLoad(user.id + ':suggestions:' + occurrenceId, async () => {
    const [contacts, gifts, preparation, interests] = await Promise.all([
      readAllRows(() => supabase.from('contacts').select('id,prenom,nom,relation').eq('user_id', user.id)),
      attentionRows('cadeaux_offerts', user.id),
      occurrenceId ? (isUuid(occurrenceId) ? loadPreparation(user.id, occurrenceId) : Promise.reject(new Error('Occurrence invalide.'))) : Promise.resolve(null),
      preferenceRows('preferences_cadeaux_contacts', user.id),
    ])
    return { contacts, gifts, preparation, interests }
  })
  const [contactId, setContactId] = useState(initialContactId ?? ''), [eventType, setEventType] = useState(TYPES_EVENEMENT.some(e => e.value === initialEventType) ? initialEventType : 'anniversaire')
  const [giftMode, setGiftMode] = useState<GiftMode>('classic'), [budget, setBudget] = useState(''), [currency, setCurrency] = useState('EUR')
  const [categoryOverride, setCategoryOverride] = useState<{ scope: string; values: string[] } | null>(null), [hidePrevious, setHidePrevious] = useState(false), [consent, setConsent] = useState<AIContactField[]>([])
  const [interestsSaved, setInterestsSaved] = useState('')
  const [result, setResult] = useState<{ ideas: GiftIdea[]; noPurchase: boolean; run: number } | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const preparedContact = loaded.data?.preparation?.contact
  const contact = loaded.data?.contacts.find(c => preparedContact ? c.id === preparedContact.id : String(c.id) === contactId)
  const interests = loaded.data?.interests.find(p => p.contact_id === contact?.id) ?? null
  const categoryScope = user.id + ':' + (contact?.id ?? contactId)
  const categories = categoryOverride?.scope === categoryScope ? categoryOverride.values : interests?.categories ?? []
  const setCategories = (values: string[]) => { setInterestsSaved(''); setCategoryOverride({ scope: categoryScope, values }) }
  const previousTitles = loaded.data?.gifts.filter(g => contact && g.contact_id === contact.id).map(g => g.titre) ?? []
  const visible = result ? filterGiftIdeas(result.ideas, categories, previousTitles, hidePrevious) : []
  const discard = () => !hasPrivateDraft() || window.confirm('Abandonner les saisies non enregistrées avant cette action ?')
  async function generate() {
    if (pending.current || !loaded.data || !discard()) return
    pending.current = true; setBusy(true); setError('')
    const scope = lifetime.current
    try {
      if ((contactId || preparedContact) && !contact) throw new Error('Ce contact est inaccessible. Choisis un autre destinataire.')
      const cents = giftMode === 'no_purchase' ? 0 : parseCents(budget)
      const { data: { session } } = await supabase.auth.getSession()
      if (!scope.current()) return
      if (!session || session.user.id !== user.id) throw new Error('Reconnecte-toi pour générer des idées.')
      const response = await fetch('/api/generate-gift-ideas', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(minimalAIInput({ eventType: loaded.data.preparation?.event.type_evenement ?? eventType, relation: contact?.relation ?? 'autre', giftMode, budgetCents: cents, currency, contactId: contact?.id, consentFields: consent })),
      })
      const data = await response.json()
      if (!scope.current()) return
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'La génération a échoué.')
      const ideas = usableGiftIdeas(data.ideas)
      if (!ideas.length) throw new Error('Aucune idée utilisable. Réessaie.')
      setResult(previous => ({ ideas, noPurchase: giftMode === 'no_purchase', run: (previous?.run ?? 0) + 1 }))
    } catch (e) { if (scope.current()) setError(e instanceof Error ? e.message : 'Impossible de générer ces idées.') }
    finally { pending.current = false; if (scope.current()) { setBusy(false); setConsent([]) } }
  }
  if (!loaded.data) return <LoadState error={loaded.error} retry={loaded.reload} />
  return <section aria-label="Suggestions cadeaux" className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
    <div className={panel + ' rounded-2xl space-y-4'}><h2 className="text-xl font-bold">Trouver une attention</h2><p className="text-sm text-muted">Des pistes pour préparer un moment qui compte.</p>
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        {preparedContact ? <p className="text-sm">Pour {[preparedContact.prenom, preparedContact.nom].filter(Boolean).join(' ') || 'le contact de cette préparation'}</p> : <label className="block text-sm">Pour qui ?<select className={field} value={contactId} onChange={e => { if (discard()) { setContactId(e.target.value); setConsent([]); setCategoryOverride(null); setResult(null); setError('') } }}><option value="">Sans contact</option>{loaded.data.contacts.map(c => <option key={c.id} value={c.id}>{[c.prenom, c.nom].filter(Boolean).join(' ') || 'Contact sans nom'}</option>)}</select></label>}
        {contactId && !contact && <p role="alert" className="text-sm text-danger">Ce contact n’est plus disponible. Choisis un autre destinataire.</p>}
        {loaded.data.preparation ? <p className="text-sm">Préparation : {loaded.data.preparation.event.titre}</p> : <label className="block text-sm">Occasion<select className={field} value={eventType} onChange={e => { if (discard()) { setEventType(e.target.value); setResult(null) } }}>{TYPES_EVENEMENT.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}</select></label>}
        <label className="block text-sm">Type d’attention<select className={field} value={giftMode} onChange={e => { if (discard()) { setGiftMode(e.target.value as GiftMode); setResult(null) } }}>{GIFT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></label>
        {giftMode !== 'no_purchase' && <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-2"><label className="text-sm">Plafond de recherche<input className={field} inputMode="decimal" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Facultatif" maxLength={30} /></label><label className="text-sm">Devise<select className={field} value={currency} onChange={e => setCurrency(e.target.value)}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></label></div>}
        <p className="text-xs text-muted">Le plafond guide l’IA. Aucun prix, stock ou délai de livraison n’est garanti.</p>
        <fieldset><legend className="text-sm">Centres d’intérêt · filtres locaux</legend>{CATEGORIES_CADEAU.map(c => <label key={c.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={categories.includes(c.id)} onChange={e => { if (discard()) setCategories(e.target.checked ? [...categories, c.id] : categories.filter(id => id !== c.id)) }} />{c.emoji} {c.nom}</label>)}<p className="text-xs text-muted">Ces filtres ne changent les intérêts enregistrés qu’après une sauvegarde explicite. Ils ne sont pas envoyés à l’IA.</p></fieldset>
        {contact && <RememberGiftInterests key={user.id + ':' + contact.id} owner={user.id} contactId={contact.id} categories={categories} preference={interests} onSaved={() => { setInterestsSaved(categoryScope); loaded.reload() }} />}
        {interestsSaved === categoryScope && <p role="status" className="text-sm text-success">Intérêts enregistrés pour ce contact.</p>}
        {contact && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={hidePrevious} onChange={e => { if (discard()) setHidePrevious(e.target.checked) }} />Masquer les titres déjà offerts</label>}
        {contact && <AIConsent fields={consent} onChange={setConsent} disabled={busy} />}
      </fieldset>
      <details className="text-xs text-muted"><summary className="min-h-11 cursor-pointer py-3">Ce qui est envoyé à l’IA</summary><p>{AI_NOTICE}</p></details>
      <button className={button + ' w-full border-accent bg-action font-semibold text-on-action'} disabled={busy} onClick={() => void generate()}>{busy ? 'Recherche en cours…' : 'Trouver des idées'}</button>
      {error && <p role="alert" className="text-sm text-danger">{error}{result && ' Les suggestions précédentes sont conservées.'}</p>}
    </div>
    <div className="min-w-0 space-y-4" aria-live="polite">
      {busy && <p role="status">Recherche de nouvelles idées…</p>}
      {!result && <div className={panel + ' py-14 text-center'}><span aria-hidden="true" className="text-5xl">✨</span><h3 className="mt-4 text-lg font-semibold">Une petite attention peut faire beaucoup</h3><p className="text-sm text-muted">Choisis une occasion et lance une recherche. Enregistre ensuite les idées qui te plaisent.</p></div>}
      {result && <><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">{visible.length} idée{visible.length > 1 ? 's' : ''} à explorer</h3><p className="text-xs text-muted">Aucun produit vérifié</p></div>
        {!visible.length && <div className={panel}><p>Aucune suggestion ne correspond aux filtres locaux.</p><button className={button} onClick={() => { if (discard()) { setCategories([]); setHidePrevious(false) } }}>Élargir les filtres</button><p className="text-xs text-muted">Tu peux aussi lancer explicitement une nouvelle recherche.</p></div>}
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">{visible.map(idea => <SuggestionCard key={result.run + ':' + idea.idee} idea={idea} contactId={contact?.id ?? null} recipient={[contact?.prenom, contact?.nom].filter(Boolean).join(' ')} occurrenceId={occurrenceId} noPurchase={result.noPurchase} previous={previousTitles.some(title => giftTitleKey(title) === giftTitleKey(idea.idee))} onGiftSaved={loaded.reload} />)}</div>
      </>}
    </div>
  </section>
}
