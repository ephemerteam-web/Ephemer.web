'use client'
import { useDashboardUser } from '@/components/DashboardUserContext'
import { readAllResult } from '@/lib/pagination'

import { Suspense, useEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-browser'
import { AI_NOTICE } from '@/lib/ai-privacy'
import { genererMessage } from '@/lib/api-messages'
import { TYPES_EVENEMENT, TYPES_RELATION, TONS_MESSAGE } from '@/lib/constants'
import { calculerDateEvenement, calculerDatesJ7J1JourJ, formatDateLocale, formaterDateFR } from '@/lib/date-utils'
import { isCalendarDay, parseLocalDay } from '@/lib/calendar-day'
import { chosenNameDay, nameDays } from '@/lib/name-days'
import { canGenerate, contactDisplayName, generatorReducer, initialGeneratorState, searchGeneratorContacts, type GeneratorContact } from '@/lib/message-generator'
import ProgrammerRappel from '@/components/ProgrammerRappel'
import AIConsent from '@/components/AIConsent'
import { SavePreparationMessage } from '@/components/GeneratorAttention'
import type { AIContactField } from '@/lib/ai-consent'
import { MESSAGE_LENGTHS } from '@/lib/ai-options'
import { readStyleBook } from '@/lib/personal-preferences'
import { resolveMessageStyle, styleSettings } from '@/lib/message-styles'
import { useAttentionLoad } from '@/components/AttentionShared'

const fieldClass = 'min-h-11 w-full min-w-0 max-w-full rounded-xl border border-line bg-canvas px-3 py-2 text-base text-ink focus-visible:outline-2 focus-visible:outline-accent'
const secondaryButtonClass = 'min-h-11 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/10 disabled:opacity-50'
const otherOccasions = TYPES_EVENEMENT.filter(event => event.value !== 'anniversaire' && event.value !== 'fete_prenomale')

function GenerateForm({ contactId, initialOccasion, occurrenceId }: { contactId: string | null; initialOccasion: string | null; occurrenceId?: string | null }) {
  const [consent, setConsent] = useState<{ contact: number | null; fields: AIContactField[] }>({ contact: null, fields: [] })
  const [state, reduce] = useReducer(generatorReducer, initialOccasion, initialGeneratorState)
  const temporarySettings = useRef(false)
  const appliedContext = useRef('')
  const dispatch: typeof reduce = action => {
    if (['tone', 'length', 'addressing', 'emojis', 'signature', 'relation', 'style'].includes(action.type)) temporarySettings.current = true
    if (['contact', 'manual', 'clear'].includes(action.type)) temporarySettings.current = false
    reduce(action)
  }
  const [contacts, setContacts] = useState<GeneratorContact[]>([])
  const user = useDashboardUser()
  const styleBook = useAttentionLoad(user.id + ':generator-styles', () => readStyleBook(user.id))
  const session = { user }
  const [contactsLoading, setContactsLoading] = useState(true)
  const [contactsError, setContactsError] = useState('')
  const [prefillWarning, setPrefillWarning] = useState('')
  const [retry, setRetry] = useState(0)
  const [search, setSearch] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [preferredFeast, setPreferredFeast] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [copied, setCopied] = useState(false)
  const [actionError, setActionError] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const freeNameRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLElement>(null)
  const pendingRef = useRef(false)
  const recipientTouchedRef = useRef(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Le chargement peut être relancé ; une réponse arrivée après navigation est ignorée.
  useEffect(() => {
    let active = true
    async function loadContacts() {
      try {
    const { data, error } = await readAllResult(() => supabase.from('contacts')
          .select('id, prenom, nom, relation, date_naissance, email, est_favori')
          .eq('user_id', user.id))
        if (!active) return
        if (error) throw new Error('Impossible de charger tes contacts. Tu peux réessayer ou saisir un prénom.')
        const loaded = data ?? []
        setContacts(loaded)
        if (contactId && !recipientTouchedRef.current) {
          const contact = loaded.find(item => String(item.id) === contactId)
          if (contact) { appliedContext.current = ''; reduce({ type: 'contact', contact }) }
          else setPrefillWarning('Ce contact n’est plus disponible. Choisis un autre destinataire.')
        }
      } catch (error) {
        if (active) setContactsError(error instanceof Error ? error.message : 'Impossible de charger tes contacts.')
      } finally {
        if (active) setContactsLoading(false)
      }
    }
    void loadContacts()
    return () => { active = false }
  }, [contactId, retry, user.id])

  // Appliquer le style une seule fois par destinataire ; une saisie temporaire reste prioritaire.
  useEffect(() => {
    if (!styleBook.data || contactsLoading) return
    const context = user.id + ':' + (state.contact?.id ?? (state.manual ? 'manual' : 'empty'))
    if (appliedContext.current === context) return
    appliedContext.current = context
    if (temporarySettings.current) return
    const book = styleBook.data
    const assigned = book.contacts.find(p => p.contact_id === state.contact?.id)?.style_id ?? null
    const settings = resolveMessageStyle(book.styles, book.defaultPreference?.style_id ?? null, assigned)
    if (settings) reduce({ type: 'style', settings })
  }, [styleBook.data, contactsLoading, state.contact?.id, state.manual, user.id])

  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current) }, [])

  const matches = useMemo(() => searchGeneratorContacts(contacts, search), [contacts, search])
  const selectedContact = state.contact
  const firstName = state.firstName
  const recipientName = selectedContact ? contactDisplayName(selectedContact) : firstName.trim()
  const isOtherOccasion = state.eventType !== 'anniversaire' && state.eventType !== 'fete_prenomale'
  const relationLabel = TYPES_RELATION.find(item => item.value === state.relation)?.label ?? 'Autre'
  const toneLabel = state.tone === 'familier' ? 'Chaleureux' : TONS_MESSAGE.find(item => item.value === state.tone)?.label ?? 'Chaleureux'
  const occasionLabel = TYPES_EVENEMENT.find(item => item.value === state.eventType)?.label.replace(/^\S+\s+/, '') ?? 'Anniversaire'

  // Les dates ne servent qu'au rappel, jamais à autoriser la génération.
  const feastDates = useMemo(() => nameDays(firstName), [firstName])
  const datesPossibles = useMemo(() => {
    if (!selectedContact) return null
    let day: Date | null = null
    if (state.eventType === 'anniversaire') {
      if (selectedContact.date_naissance && isCalendarDay(selectedContact.date_naissance)) {
        day = calculerDateEvenement('anniversaire', { prenom: firstName, date_naissance: selectedContact.date_naissance })
      }
    } else if (state.eventType === 'fete_prenomale') {
      const chosen = chosenNameDay(firstName, preferredFeast, formatDateLocale(new Date()))
      if (chosen) day = parseLocalDay(chosen)
    } else if (isCalendarDay(eventDate)) day = parseLocalDay(eventDate)
    return day ? calculerDatesJ7J1JourJ(day) : null
  }, [selectedContact, firstName, state.eventType, preferredFeast, eventDate])

  function resetFeedback() {
    setCopied(false)
    setActionError('')
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
  }

  function resetDates() {
    setPreferredFeast('')
    setEventDate('')
    resetFeedback()
  }

  function chooseContact(contact: GeneratorContact) {
    appliedContext.current = ''
    setConsent({ contact: null, fields: [] })
    recipientTouchedRef.current = true
    dispatch({ type: 'contact', contact })
    setSearch('')
    setListOpen(false)
    setPrefillWarning('')
    resetDates()
  }

  function changeRecipient(manual = false) {
    appliedContext.current = ''
    setConsent({ contact: null, fields: [] })
    recipientTouchedRef.current = true
    dispatch({ type: manual ? 'manual' : 'clear' })
    setSearch('')
    setListOpen(!manual)
    setPrefillWarning('')
    resetDates()
    requestAnimationFrame(() => manual ? freeNameRef.current?.focus() : searchRef.current?.focus())
  }

  // La liste utilise de vrais boutons : Tab/Entrée, flèches et Échap fonctionnent.
  function handleListKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      searchRef.current?.focus()
      setListOpen(false)
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (index < 0) return
    event.preventDefault()
    const next = index + (event.key === 'ArrowDown' ? 1 : -1)
    if (next < 0) searchRef.current?.focus()
    else buttons[Math.min(next, buttons.length - 1)]?.focus()
  }

  async function handleGenerate() {
    if (!session || !canGenerate(state) || pendingRef.current || !styleBook.data) return
    pendingRef.current = true
    resetFeedback()
    dispatch({ type: 'begin' })
    try {
      // Interface existante conservée ; les informations inutilisées restent vides.
      const text = await genererMessage({ firstName, lastName: '', age: null, relation: state.relation, tone: state.tone,
        eventType: state.eventType, eventDate: null, eventDescription: null, note: null,
        length: state.length, addressing: state.addressing, emojis: state.emojis, signature: state.signature,
        contactId: selectedContact?.id, consentFields: consent.contact === selectedContact?.id ? consent.fields : [] })
      dispatch({ type: 'success', value: text })
      if (window.matchMedia('(max-width: 767px)').matches) {
        requestAnimationFrame(() => resultRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }))
      }
    } catch (error) {
      dispatch({ type: 'failure', value: error instanceof Error ? error.message : 'Impossible de générer le message. Réessaie.' })
    } finally {
      pendingRef.current = false
      setConsent({ contact: null, fields: [] })
    }
  }

  function showCopied() {
    setCopied(true)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  async function handleCopy() {
    setActionError('')
    try {
      await navigator.clipboard.writeText(state.message)
      showCopied()
    } catch {
      setActionError('La copie automatique est indisponible. Tu peux sélectionner le texte du message et le copier.')
    }
  }

  async function handleShare() {
    setActionError('')
    try {
      if (navigator.share) await navigator.share({ title: 'Message Ephemer', text: state.message })
      else await handleCopy()
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setActionError('Le partage a échoué. Tu peux copier le message.')
    }
  }

  return (
    <div className="min-h-screen w-full min-w-0 max-w-full overflow-x-clip bg-canvas px-3 py-5 text-ink sm:px-4 md:px-8 md:py-8">
      <div className="mx-auto w-full min-w-0 max-w-xl space-y-5">
        <header className="space-y-1">
          <h1 className="text-xl font-bold sm:text-2xl">Un message pour tes proches</h1>
          <p className="text-sm text-muted">Choisis à qui l’adresser, puis laisse-toi inspirer.</p>
        </header>
        <section className="space-y-2 rounded-xl border border-line p-3" aria-label="Styles de messages">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Mes styles</h2><Link className={secondaryButtonClass} href="/dashboard/styles">Gérer mes styles</Link></div>
          {!styleBook.data ? <div role={styleBook.error ? 'alert' : 'status'} className="text-sm text-muted">{styleBook.error ?? 'Chargement des styles…'}{styleBook.error && <button type="button" className={secondaryButtonClass} onClick={styleBook.reload}>Réessayer</button>}</div> : <>
            <label className="block text-sm" htmlFor="saved-message-style">Appliquer un style à cette demande</label><select id="saved-message-style" className={fieldClass} value="" disabled={state.loading} onChange={e => { const style = styleBook.data?.styles.find(s => s.id === e.target.value); if (style) dispatch({ type: 'style', settings: styleSettings(style) }) }}><option value="">Choisir un style enregistré</option>{styleBook.data.styles.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}</select>
            <p className="text-xs text-muted">Style du contact, puis défaut du compte. Tes réglages temporaires restent prioritaires et ne modifient aucun style enregistré.</p>
          </>}
        </section>

        <form className="min-w-0 space-y-4" onSubmit={event => { event.preventDefault(); void handleGenerate() }}>
          <fieldset disabled={state.loading} className="min-w-0 space-y-4 disabled:opacity-70">
            <legend className="sr-only">Destinataire et occasion</legend>
            <section aria-labelledby="recipient-label" className="min-w-0 space-y-2">
              <h2 id="recipient-label" className="text-sm font-semibold">Pour qui ?</h2>
              {selectedContact ? (
                <div className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-ink/5 p-3">
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-action/15 text-sm font-bold text-accent">{recipientName.charAt(0).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" title={recipientName}>{recipientName}</p>
                    <p className="truncate text-xs text-muted">{relationLabel}</p>
                  </div>
                  <button type="button" className={secondaryButtonClass} onClick={() => changeRecipient()}>Changer</button>
                </div>
              ) : state.manual ? (
                <div className="space-y-2">
                  <label htmlFor="free-firstname" className="sr-only">Prénom du destinataire</label>
                  <input ref={freeNameRef} id="free-firstname" autoComplete="off" maxLength={80} value={firstName} placeholder="Son prénom" className={fieldClass}
                    onChange={event => { dispatch({ type: 'name', value: event.target.value }); resetFeedback() }} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted">Sans créer de fiche contact.</span>
                    <button type="button" className="min-h-11 text-sm text-accent underline underline-offset-4" onClick={() => changeRecipient()}>Choisir un contact</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <label htmlFor="contact-search" className="sr-only">Rechercher un contact</label>
                    <input ref={searchRef} id="contact-search" type="search" autoComplete="off" value={search} placeholder="Rechercher un contact…"
                      className={`${fieldClass} pr-12`} aria-controls="contact-results"
                      onFocus={() => setListOpen(true)}
                      onChange={event => { setSearch(event.target.value); setListOpen(true) }}
                      onKeyDown={event => {
                        if (event.key === 'Escape') setListOpen(false)
                        if (event.key === 'ArrowDown') { event.preventDefault(); setListOpen(true); requestAnimationFrame(() => listRef.current?.querySelector('button')?.focus()) }
                      }} />
                    <button type="button" aria-label={listOpen ? 'Masquer les contacts' : 'Afficher les contacts'} aria-expanded={listOpen} aria-controls="contact-results"
                      className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-lg text-muted"
                      onClick={() => setListOpen(open => !open)}>
                      <svg aria-hidden="true" className={`h-4 w-4 ${listOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                  </div>
                  {contactsLoading && <p role="status" className="text-sm text-muted">Chargement de tes contacts…</p>}
                  {contactsError && <div role="alert" className="space-y-1 text-sm text-danger">
                    <p>{contactsError}</p>
                    <button type="button" className={secondaryButtonClass} onClick={() => { setContactsLoading(true); setContactsError(''); setRetry(value => value + 1) }}>Réessayer</button>
                    {!session && <Link href="/connexion" className="ml-3 inline-flex min-h-11 items-center underline">Se reconnecter</Link>}
                  </div>}
                  {!contactsLoading && !contactsError && contacts.length === 0 && <p className="text-sm text-muted">Tu n’as pas encore de contact. Saisis un prénom pour commencer.</p>}
                  {listOpen && !contactsLoading && !contactsError && contacts.length > 0 && (
                    <div id="contact-results" ref={listRef} onKeyDown={handleListKey} className="max-h-64 min-w-0 overflow-y-auto rounded-xl border border-line bg-surface">
                      {matches.length === 0 ? <p role="status" className="p-3 text-sm text-muted">Aucun contact trouvé. Essaie un autre nom ou saisis un prénom.</p> : matches.map(contact => (
                        <button key={contact.id} type="button" onClick={() => chooseContact(contact)} className="flex min-h-11 w-full min-w-0 items-center gap-2 border-b border-line px-3 py-2 text-left last:border-0 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-accent">
                          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/5 text-xs font-semibold">{contactDisplayName(contact).charAt(0).toUpperCase()}</span>
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium" title={contactDisplayName(contact)}>{contactDisplayName(contact)}</span><span className="block truncate text-xs text-muted">{TYPES_RELATION.find(item => item.value === contact.relation)?.label ?? 'Autre'}</span></span>
                          {contact.est_favori && <span role="img" aria-label="Favori" className="shrink-0 text-accent">★</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <button type="button" className="min-h-11 text-sm text-accent underline underline-offset-4" onClick={() => changeRecipient(true)}>Saisir un prénom</button>
                </div>
              )}
              {prefillWarning && <p role="status" className="text-sm text-warning">{prefillWarning}</p>}
            </section>

            <section aria-labelledby="occasion-label" className="space-y-2">
              <h2 id="occasion-label" className="text-sm font-semibold">Pour quelle occasion ?</h2>
              <div className="flex flex-wrap gap-2">
                {[{ value: 'anniversaire', label: 'Anniversaire' }, { value: 'fete_prenomale', label: 'Fête' }, { value: 'autre', label: 'Autre occasion' }].map(item => {
                  const active = item.value === 'autre' ? isOtherOccasion : state.eventType === item.value
                  return <button key={item.value} type="button" aria-pressed={active}
                    className={`min-h-11 rounded-full border px-3 py-2 text-sm transition-colors ${active ? 'border-action bg-action text-on-action' : 'border-line text-muted hover:bg-ink/5'}`}
                    onClick={() => { if (!active) { dispatch({ type: 'occasion', value: item.value }); resetDates() } }}>{item.label}</button>
                })}
              </div>
              {isOtherOccasion && <div>
                <label htmlFor="other-occasion" className="sr-only">Choisir une autre occasion</label>
                <select id="other-occasion" value={state.eventType} className={fieldClass} onChange={event => { dispatch({ type: 'occasion', value: event.target.value }); resetDates() }}>
                  {otherOccasions.map(event => <option key={event.value} value={event.value}>{event.label}</option>)}
                </select>
              </div>}
            </section>

            <details className="min-w-0 rounded-xl border border-line px-3">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Personnaliser <span className="font-normal text-muted">· {toneLabel}</span></summary>
              <div className="grid min-w-0 gap-3 pb-3 sm:grid-cols-2">
                <div className="min-w-0"><label htmlFor="message-tone" className="mb-1 block text-sm text-muted">Ton du message</label>
                  <select id="message-tone" value={state.tone} className={fieldClass} onChange={event => { dispatch({ type: 'tone', value: event.target.value }); resetFeedback() }}>
                    {TONS_MESSAGE.map(tone => <option key={tone.value} value={tone.value}>{tone.value === 'familier' ? 'Chaleureux' : tone.label}</option>)}
                  </select>
                </div>
                <div className="min-w-0"><label htmlFor="message-relation" className="mb-1 block text-sm text-muted">Votre relation</label>
                  <select id="message-relation" value={state.relation} className={fieldClass} onChange={event => { dispatch({ type: 'relation', value: event.target.value }); resetFeedback() }}>
                    {TYPES_RELATION.map(relation => <option key={relation.value} value={relation.value}>{relation.label}</option>)}
                  </select>
                </div>
                <label className="min-w-0 text-sm text-muted" htmlFor="message-length">Longueur<select id="message-length" className={fieldClass} value={state.length} onChange={e => dispatch({ type: 'length', value: e.target.value })}>{MESSAGE_LENGTHS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}</select></label>
                <label className="min-w-0 text-sm text-muted" htmlFor="message-addressing">S’adresser au destinataire<select id="message-addressing" className={fieldClass} value={state.addressing} onChange={e => dispatch({ type: 'addressing', value: e.target.value })}><option value="tu">Tutoiement</option><option value="vous">Vouvoiement</option></select></label>
                <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={state.emojis} onChange={e => dispatch({ type: 'emojis', value: String(e.target.checked) })} />Autoriser quelques emojis</label>
                <label className="min-w-0 text-sm text-muted sm:col-span-2" htmlFor="message-signature">Signature facultative<textarea id="message-signature" className={fieldClass} maxLength={200} value={state.signature} onChange={e => dispatch({ type: 'signature', value: e.target.value })} /><span className="text-xs">Ajoutée localement au message, jamais transmise à l’IA.</span></label>
                <p className="text-xs text-muted sm:col-span-2">Ces choix concernent ce message uniquement et ne modifient pas le contact.</p>
              </div>
            </details>
          </fieldset>

          <p className="break-words text-xs text-muted">{occasionLabel} · {relationLabel} · {toneLabel}</p>
          {state.manual && !session && !contactsLoading && contactsError && <p role="alert" className="text-sm text-danger">Ta session est indisponible. <Link href="/connexion" className="underline">Reconnecte-toi</Link> pour générer un message.</p>}
          {selectedContact && <AIConsent fields={consent.contact === selectedContact.id ? consent.fields : []} onChange={fields => setConsent({ contact: selectedContact.id, fields })} disabled={state.loading} />}
          <button type="submit" disabled={!session || !canGenerate(state) || !styleBook.data} aria-busy={state.loading} className="min-h-11 w-full rounded-xl bg-action px-4 py-3 font-semibold text-on-action transition-colors hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50">
            {state.loading ? 'Génération en cours…' : state.hasResult ? 'Nouvelle version' : 'Générer le message'}
          </button>
          {state.loading && <p role="status" className="text-sm text-muted">Création de ton message…</p>}
          {state.error && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{state.error}{state.message && ' Ton message précédent est conservé.'}</p>}
          <details className="text-xs text-muted"><summary className="min-h-11 cursor-pointer py-2">Confidentialité de la génération</summary><p className="pb-2 leading-relaxed">{AI_NOTICE}</p></details>
        </form>

        {state.hasResult && <section ref={resultRef} aria-labelledby="result-title" className="min-w-0 scroll-mt-24 space-y-3 rounded-xl border border-line bg-ink/5 p-3 sm:p-4">
          <h2 id="result-title" className="text-sm font-semibold">Ton message pour {recipientName}</h2>
          <label htmlFor="generated-message" className="sr-only">Modifier le message généré</label>
          <textarea id="generated-message" value={state.message} disabled={state.loading} onChange={event => { dispatch({ type: 'edit', value: event.target.value }); resetFeedback() }} className={`${fieldClass} min-h-36 resize-y leading-relaxed`} />
          {occurrenceId && state.message.trim() && <SavePreparationMessage key={occurrenceId} occurrenceId={occurrenceId} message={state.message} />}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!state.message.trim()} onClick={() => void handleCopy()} className={secondaryButtonClass}>{copied ? 'Copié !' : 'Copier'}</button>
            <button type="button" disabled={!state.message.trim()} onClick={() => void handleShare()} className={secondaryButtonClass}>Partager</button>
          </div>
          <span className="sr-only" role="status">{copied ? 'Message copié.' : ''}</span>
          {actionError && <p role="alert" className="text-sm text-danger">{actionError}</p>}
        </section>}

        {state.message.trim() && selectedContact && session && <details className="min-w-0 rounded-xl border border-line px-3">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Programmer un rappel</summary>
          <fieldset disabled={state.loading} className="min-w-0 space-y-3 pb-3">
            <legend className="sr-only">Options de programmation</legend>
            {state.eventType === 'fete_prenomale' && <div>
              <label htmlFor="preferred-feast" className="mb-1 block text-sm text-muted">Date de la fête</label>
              <select id="preferred-feast" value={preferredFeast} onChange={event => setPreferredFeast(event.target.value)} className={fieldClass}>
                <option value="">Choisir une date</option>
                {feastDates.map(day => <option key={day} value={day}>{day.split('-').reverse().join('/')}</option>)}
              </select>
              <p className="mt-1 text-xs text-muted">{feastDates.length ? 'Choisis la fête retenue pour ce rappel. Le calendrier du contact reste inchangé.' : 'Aucune fête trouvée pour ce prénom. Tu peux choisir une date d’envoi personnalisée ci-dessous.'}</p>
            </div>}
            {isOtherOccasion && <div>
              <label htmlFor="event-date" className="mb-1 block text-sm text-muted">Date de l’occasion (facultative)</label>
              <input id="event-date" type="date" value={eventDate} onChange={event => setEventDate(event.target.value)} className={fieldClass} />
              <p className="mt-1 text-xs text-muted">Pour proposer des rappels avant l’occasion. Tu peux aussi choisir directement une date d’envoi ci-dessous.</p>
            </div>}
            {datesPossibles && <p className="text-sm text-muted">{occasionLabel} : {formaterDateFR(datesPossibles.jourJ)}</p>}
            {!datesPossibles && state.eventType === 'anniversaire' && <p className="text-sm text-muted">Aucune date d’anniversaire disponible. Choisis une date d’envoi personnalisée ci-dessous.</p>}
            {!selectedContact.email && <p className="text-sm text-warning">Ce contact n’a pas d’adresse e-mail. Tu peux te programmer un rappel ou <Link href={`/dashboard/contacts/${selectedContact.id}/edit`} className="underline">compléter sa fiche</Link> pour lui envoyer un e-mail.</p>}
            <ProgrammerRappel key={`${selectedContact.id}:${state.eventType}:${preferredFeast}:${eventDate}:${state.message}`} session={session}
              occurrenceId={occurrenceId}
              selectedContact={{ ...selectedContact, prenom: selectedContact.prenom ?? '', nom: selectedContact.nom ?? '' }} message={state.message} tone={state.tone} eventType={state.eventType} datesPossibles={datesPossibles} />
            <p className="text-xs leading-relaxed text-muted">Chaque rappel correspond à un envoi unique. Les anniversaires proposent leur prochaine occurrence ; les dates personnalisées ne se renouvellent pas automatiquement.</p>
          </fieldset>
        </details>}
        {state.hasResult && state.manual && <p className="text-xs text-muted">Pour programmer un rappel, choisis un contact enregistré.</p>}
      </div>
    </div>
  )
}

function GenerateFromUrl() {
  const searchParams = useSearchParams()
  const contactId = searchParams.get('contactId')
  const initialOccasion = searchParams.get('eventType')
  // Une nouvelle URL ouvre un nouveau formulaire, sans réutiliser un ancien message.
  const occurrenceId = searchParams.get('occurrenceId')
  return <GenerateForm key={JSON.stringify([contactId, initialOccasion, occurrenceId])} contactId={contactId} initialOccasion={initialOccasion} occurrenceId={occurrenceId} />
}

export default function GeneratePage() {
  return <Suspense fallback={<div className="min-h-[60vh] p-4 text-muted" role="status">Chargement…</div>}><GenerateFromUrl /></Suspense>
}
