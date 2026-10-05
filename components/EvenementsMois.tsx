// 📅 Agenda mensuel : les dates et les occurrences viennent de l’API existante.
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Modal from '@/components/Modal'
import { useDashboardUser } from '@/components/DashboardUserContext'
import { createRequestScope } from '@/lib/request-scope'
import { supabase } from '@/lib/supabase-browser'
import { usePrivateLists } from '@/lib/hooks/usePrivateLists'
import { parisDay, isCalendarDay } from '@/lib/calendar-day'
import { eventLabels } from '@/lib/personal-events'

interface EvenementContact {
  id: number | null
  occurrenceId: string
  titre: string
  age: number | null
  prenom: string
  nom: string
  typeEvenement: string
  jour: number
  dateComplete: string
  emoji: string
}

type Filter = 'tous' | 'anniversaire' | 'fete_prenomale' | 'personnel'
type Result = { context: string; phase: 'loading' | 'ready' | 'error'; events: EvenementContact[]; error?: string }
const filters: { value: Filter; label: string }[] = [
  { value: 'tous', label: 'Tous' }, { value: 'anniversaire', label: 'Anniversaires' },
  { value: 'fete_prenomale', label: 'Fêtes' }, { value: 'personnel', label: 'Dates personnelles' },
]
const field = 'mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-2.5 py-2 text-base text-ink'
const control = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line bg-surface px-3 text-sm font-medium transition-colors hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40'
const dayOf = (event: EvenementContact) => event.dateComplete.slice(0, 10)
const isPersonal = (event: EvenementContact) => event.typeEvenement !== 'anniversaire' && event.typeEvenement !== 'fete_prenomale'
const person = (event: EvenementContact) => event.id === null ? 'Ma date' : [event.prenom, event.nom].filter(part => part.trim()).join(' ') || 'Sans prénom'
const title = (event: EvenementContact) => isPersonal(event) || event.id === null ? event.titre : person(event)

// On formate une date civile en UTC, sans la décaler selon le fuseau de l’appareil.
function dateLabel(day: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`))
}

function EventIcon({ kind }: { kind: string }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'anniversaire' ? <path d="M4 12h16v8H4zM4 15c2 2 3-2 5 0s3-2 5 0 4-2 6 0M7 12V8m5 4V7m5 5V8M7 5v.5M12 4v.5M17 5v.5" />
      : kind === 'fete_prenomale' ? <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM19 3v2m-1-1h2" />
        : <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4m8-4v4M4 11h16m-12 4h2m4 0h2" /></>}
  </svg>
}

export default function EvenementsMois() {
  const user = useDashboardUser()
  const lists = usePrivateLists()
  const today = parisDay()
  const [month, setMonth] = useState(() => ({ mois: Number(today.slice(5, 7)) - 1, annee: Number(today.slice(0, 4)) }))
  const { mois, annee } = month
  const [filter, setFilter] = useState<Filter>('tous')
  const [result, setResult] = useState<Result | null>(null)
  const [selection, setSelection] = useState<{ context: string; event: EvenementContact } | null>(null)
  const scopeRef = useRef(createRequestScope())
  // Cette clé masque une ancienne réponse dès le rendu, avant même le prochain effet.
  const context = `${user.id}:${annee}:${mois}:${lists.selected}`
  const selectionContext = `${context}:${filter}`
  const current = result?.context === context ? result : null
  const loading = lists.loading || !current || current.phase === 'loading'
  const error = lists.error || current?.error
  const events = !loading && !error ? current?.events ?? [] : []
  const filtered = events.filter(event => filter === 'tous' || (filter === 'personnel' ? isPersonal(event) : event.typeEvenement === filter))
  const groups = new Map<string, EvenementContact[]>()
  for (const event of filtered) {
    const day = dayOf(event)
    const items = groups.get(day)
    if (items) items.push(event)
    else groups.set(day, [event])
  }
  const selected = !loading && !error && selection?.context === selectionContext ? selection.event : null
  const monthDay = `${String(annee).padStart(4, '0')}-${String(mois + 1).padStart(2, '0')}-01`
  const monthLabel = dateLabel(monthDay, { month: 'long', year: 'numeric' })

  const load = useCallback(async () => {
    scopeRef.current.cancel()
    const scope = createRequestScope()
    scopeRef.current = scope
    setSelection(null)
    setResult({ context, phase: 'loading', events: [] })
    let message = 'Impossible de charger les événements. Réessaie.'
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!scope.current()) return
      if (session?.user.id !== user.id) { message = 'Session indisponible. Reconnecte-toi pour consulter tes événements.'; throw new Error() }
      const response = await fetch(`/api/evenements-mois?mois=${mois}&annee=${annee}${lists.selected ? `&liste=${encodeURIComponent(lists.selected)}` : ''}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!scope.current()) return
      if (response.status === 401) message = 'Session indisponible. Reconnecte-toi pour consulter tes événements.'
      if (response.status === 403) message = 'Tu n’as pas accès à ces événements.'
      if (response.status === 404) message = 'Cette liste est indisponible. Choisis une autre liste ou réessaie.'
      if (!response.ok) throw new Error()
      const data = await response.json()
      if (!scope.current()) return
      // Une réponse incomplète bloque l’agenda entier ; aucune liste partielle.
      if (!Array.isArray(data.evenements) || data.evenements.some((event: EvenementContact) =>
        !event || typeof event.dateComplete !== 'string' || !isCalendarDay(dayOf(event)) || dayOf(event).slice(0, 7) !== monthDay.slice(0, 7) ||
        typeof event.occurrenceId !== 'string' || !event.occurrenceId || typeof event.titre !== 'string' ||
        typeof event.prenom !== 'string' || typeof event.nom !== 'string' || typeof event.typeEvenement !== 'string' ||
        (event.id !== null && (!Number.isSafeInteger(event.id) || event.id < 1)) ||
        (event.age !== null && (!Number.isInteger(event.age) || event.age < 0)))) throw new Error()
      const sorted = [...data.evenements].sort((a: EvenementContact, b: EvenementContact) => dayOf(a).localeCompare(dayOf(b)) || a.occurrenceId.localeCompare(b.occurrenceId))
      setResult({ context, phase: 'ready', events: sorted })
    } catch {
      if (scope.current()) setResult({ context, phase: 'error', events: [], error: message })
    }
  }, [context, mois, annee, monthDay, user.id, lists.selected])

  useEffect(() => {
    let active = true
    // Attendre les listes évite une requête sur un filtre encore indéterminé.
    void Promise.resolve().then(() => { if (active && !lists.loading && !lists.error) return load() })
    return () => { active = false; scopeRef.current.cancel() }
  }, [load, lists.loading, lists.error])

  function navigateMonth(step: number) {
    setSelection(null)
    setMonth(previous => {
      const index = previous.annee * 12 + previous.mois + step
      return { annee: Math.floor(index / 12), mois: index % 12 }
    })
  }

  return <div className="min-w-0 space-y-5">
    <header className="relative isolate flex min-w-0 items-center justify-between gap-3 py-1">
      <div><h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Ce mois-ci</h1><p className="mt-1 text-sm text-muted">Les dates qui comptent pour toi.</p></div>
      <svg aria-hidden="true" viewBox="0 0 240 110" className="pointer-events-none absolute right-10 top-0 -z-10 h-24 w-48 text-accent opacity-15">
        <path d="M20 105A95 95 0 0 1 210 105" fill="none" stroke="currentColor" strokeWidth=".7" />
        <path d="m90 21 2 6 6 2-6 2-2 6-2-6-6-2 6-2Zm105 30 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z" fill="currentColor" /><circle cx="148" cy="17" r="1.8" fill="currentColor" />
      </svg>
      <button type="button" className={`${control} shrink-0`} onClick={() => { const day = parisDay(); setSelection(null); setMonth({ mois: Number(day.slice(5, 7)) - 1, annee: Number(day.slice(0, 4)) }) }}>Aujourd’hui</button>
    </header>

    <div className="grid min-w-0 gap-4 rounded-2xl border border-line bg-surface/80 p-3 sm:p-4 lg:grid-cols-[minmax(240px,1fr)_minmax(0,1.2fr)] lg:items-end lg:gap-6">
      <nav aria-label="Navigation mensuelle" className="flex min-w-0 items-center justify-between gap-2 lg:pb-0.5">
        <button type="button" className={control} aria-label="Mois précédent" disabled={annee === 1 && mois === 0} onClick={() => navigateMonth(-1)}><span aria-hidden="true">‹</span></button>
        <h2 className="min-w-0 text-center text-base font-semibold capitalize text-ink sm:text-lg">{monthLabel}</h2>
        <button type="button" className={control} aria-label="Mois suivant" disabled={annee === 9999 && mois === 11} onClick={() => navigateMonth(1)}><span aria-hidden="true">›</span></button>
      </nav>
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3">
        <label className="min-w-0 text-xs font-medium text-muted">Type<select aria-label="Type d’événement" className={field} value={filter} onChange={event => { setSelection(null); setFilter(event.target.value as Filter) }}>
          {filters.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label>
        <label className="min-w-0 text-xs font-medium text-muted">Liste<select aria-label="Liste personnelle" className={field} value={lists.selected} disabled={lists.loading || !!lists.error} onChange={event => { setSelection(null); lists.select(event.target.value) }}>
          <option value="">Toutes les listes</option>{lists.lists.map(list => <option key={list.id} value={list.id}>{list.nom}</option>)}
        </select></label>
      </div>
    </div>

    <div aria-live="polite" aria-atomic="true" className="text-sm text-muted">
      {error ? 'Agenda indisponible' : loading ? 'Chargement des événements…' : `${filtered.length} événement${filtered.length > 1 ? 's' : ''} · ${groups.size} journée${groups.size > 1 ? 's' : ''}`}
    </div>
    {error ? <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
      <p className="text-sm text-ink">{error}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" className={control} onClick={() => { if (lists.error) void lists.retry(); else void load() }}>Réessayer</button>
        {current?.error?.startsWith('Session') && <Link className={control} href="/connexion">Se reconnecter</Link>}</div>
    </div> : loading ? <div aria-busy="true" aria-label="Chargement de l’agenda" className="space-y-3">
      {[0, 1, 2].map(index => <div key={index} aria-hidden="true" className="space-y-3 rounded-2xl border border-line bg-surface/60 p-4"><div className="h-3 w-28 rounded bg-ink/10" /><div className="h-10 w-full rounded-lg bg-ink/5" /></div>)}
    </div> : !filtered.length ? <section className="rounded-2xl border border-dashed border-line bg-surface/50 px-5 py-8 text-center">
      <span aria-hidden="true" className="mb-3 inline-flex text-accent"><EventIcon kind="libre" /></span>
      <h3 className="font-semibold text-ink">{filter !== 'tous' || lists.selected ? 'Aucun résultat avec ces filtres' : 'Aucun événement pour ce mois'}</h3>
      <p className="mt-2 text-sm text-muted">{filter !== 'tous' || lists.selected ? 'Essaie un autre type ou consulte toutes les listes.' : 'Tu peux parcourir un autre mois pour retrouver tes prochaines dates.'}</p>
      {(filter !== 'tous' || lists.selected) && <button type="button" className={`${control} mt-4`} onClick={() => { setSelection(null); setFilter('tous'); lists.select('') }}>Réinitialiser les filtres</button>}
    </section> : <div aria-label="Agenda du mois" className="space-y-5">
      {[...groups].map(([day, items]) => <section key={day} aria-label={dateLabel(day, { weekday: 'long', day: 'numeric', month: 'long' })}>
        <h3 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium text-muted"><time dateTime={day} className="capitalize">{dateLabel(day, { weekday: 'long', day: 'numeric', month: 'long' })}</time>{day === today && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">Aujourd’hui</span>}</h3>
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface/90">
          {items.map(event => <li key={event.occurrenceId} className="border-b border-line/60 last:border-b-0">
            <button type="button" aria-haspopup="dialog" aria-label={`Voir ${event.titre}, ${dateLabel(day, { day: 'numeric', month: 'long', year: 'numeric' })}`} onClick={() => setSelection({ context: selectionContext, event })}
              className="group flex min-h-[76px] w-full min-w-0 items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-ink/5 focus-visible:-outline-offset-4 sm:px-4">
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${event.typeEvenement === 'anniversaire' ? 'bg-accent/10 text-accent' : event.typeEvenement === 'fete_prenomale' ? 'bg-info/10 text-info' : 'bg-ink/5 text-muted'}`}><EventIcon kind={event.typeEvenement} /></span>
              <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold text-ink sm:text-base">{title(event)}</span><span className="mt-0.5 block break-words text-xs leading-relaxed text-muted sm:text-sm">{eventLabels[event.typeEvenement] ?? 'Date personnelle'}{isPersonal(event) ? ` · ${person(event)}` : ''}{event.age !== null ? ` · ${event.age} ans` : ''}</span></span>
              <span aria-hidden="true" className="shrink-0 text-xl text-muted transition-colors group-hover:text-accent">›</span>
            </button>
          </li>)}
        </ul>
      </section>)}
    </div>}

    <Modal open={!!selected} onClose={() => setSelection(null)} title={selected ? selected.titre : 'Détail de l’événement'} className="w-[calc(100%-2rem)] max-w-md">
      {selected && <div className="min-w-0 space-y-5">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-accent">{eventLabels[selected.typeEvenement] ?? 'Date personnelle'}</p><h3 className="mt-1 break-words text-xl font-semibold text-ink">{selected.titre}</h3></div><button type="button" data-initial-focus className={`${control} shrink-0`} onClick={() => setSelection(null)}>Fermer</button></div>
        <dl className="space-y-3 rounded-xl border border-line bg-canvas/60 p-4"><div><dt className="text-xs text-muted">Date</dt><dd className="mt-1 capitalize text-sm font-medium"><time dateTime={dayOf(selected)}>{dateLabel(dayOf(selected), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></dd></div><div><dt className="text-xs text-muted">{selected.id === null ? 'Événement personnel' : 'Contact'}</dt><dd className="mt-1 break-words text-sm font-medium">{person(selected)}</dd></div>{selected.age !== null && <div><dt className="text-xs text-muted">Âge à cette date</dt><dd className="mt-1 text-sm font-medium">{selected.age} ans</dd></div>}</dl>
        {selected.id !== null && <Link href={`/dashboard/contacts/${selected.id}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-4 py-2 text-sm font-medium text-on-action transition-colors hover:bg-action-hover">Modifier le contact</Link>}
      </div>}
    </Modal>
  </div>
}
