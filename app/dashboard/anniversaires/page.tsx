'use client'
import { useContacts } from '@/lib/hooks/useContacts'
import LoadFailure from '@/components/LoadFailure'
import MissingContactBanner from '@/components/MissingContactBanner'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formaterDateFR } from '@/lib/date-utils'
import { parisDay, daysBetween, parseLocalDay } from '@/lib/calendar-day'
import { shiftDay } from '@/lib/personal-events'
import { usePersonalEvents } from '@/lib/hooks/usePersonalEvents'
import { usePrivateLists } from '@/lib/hooks/usePrivateLists'
import { ListSelector } from '@/components/PrivateLists'
import { useDrawer } from '@/components/DrawerContext'
import ProgressRing from '@/components/ProgressRing'

// ─── Types ────────────────────────────────────────────────────────────────────

type Contact = Pick<import('@/types/database').Contact, 'id' | 'nom' | 'prenom' | 'date_naissance' | 'relation' | 'email'>

type ContactAvecAnniv = {
  contact: Contact
  joursRestants: number
  ageAVenir: number | null
  prochainAnniv: Date
}

type FilterMode = 'all' | 'week' | 'month' | 'today'
type SortMode = 'date' | 'alpha' | 'relation'
type ViewMode = 'cards' | 'compact'

// ─── Constantes visuelles ──────────────────────────────────────────────────────

const BADGE_CONFIG = {
  today: { label: "Aujourd'hui", classe: 'bg-action text-on-action' },
  soon: { label: 'Bientôt', classe: 'bg-orange-400/20 text-warning border border-orange-400/40' },
  later: { label: '', classe: 'bg-ink/10 text-muted border border-line' },
}

// ─── Skeleton loader (carte grise qui pulse) ──────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-ink/5 border border-line rounded-2xl p-4 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-ink/10 rounded" />
        <div className="h-5 w-16 bg-ink/10 rounded-full" />
      </div>
      <div className="h-3 w-32 bg-ink/10 rounded" />
      <div className="h-2 w-full bg-ink/10 rounded-full" />
      <div className="h-9 w-full bg-ink/10 rounded-xl" />
    </div>
  )
}

// ─── Page principale ────────────────────────────────────────────────────────

export default function AnniversairesPage() {
  const router = useRouter()
  const { contacts: allContacts, loading, error: listError, retry } = useContacts()
  const lists = usePrivateLists()
  const today = parisDay()
  const dates = usePersonalEvents(today, shiftDay(today, 399))
  const contacts = lists.filter(allContacts)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [sortMode, setSortMode] = useState<SortMode>('date')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const { ouvrirDrawer } = useDrawer()

  // ── Chargement des contacts ──


  // ── Calcul des anniversaires (avec gestion date manquante) ──
  const { annivList, contactsSansDate } = useMemo(() => {
  const annivList: ContactAvecAnniv[] = []
  const contactsSansDate: Contact[] = []
  for (const contact of contacts) {
    const next = dates.views.find(view => view.contact?.id === contact.id && view.kind === 'anniversaire')
    if (!next) { contactsSansDate.push(contact); continue }
    annivList.push({ contact, joursRestants: daysBetween(today, next.date), ageAVenir: next.age, prochainAnniv: parseLocalDay(next.date) })
  }
  return { annivList, contactsSansDate }
  }, [contacts, dates.views, today])

  // ── Filtrage ──
  const annivListFiltree = useMemo(() => {
    return annivList.filter(a => {
      if (filterMode === 'today') return a.joursRestants === 0
      if (filterMode === 'week') return a.joursRestants >= 0 && a.joursRestants <= 7
      if (filterMode === 'month') return a.joursRestants >= 0 && a.joursRestants <= 30
      return true
    })
  }, [annivList, filterMode])

  // ── Tri ──
  const annivListTriee = useMemo(() => {
    const copie = [...annivListFiltree]
    if (sortMode === 'date') {
      copie.sort((a, b) => a.joursRestants - b.joursRestants)
    } else if (sortMode === 'alpha') {
      copie.sort((a, b) => (a.contact.prenom ?? '').localeCompare(b.contact.prenom ?? ''))
    } else if (sortMode === 'relation') {
      copie.sort((a, b) => (a.contact.relation ?? '').localeCompare(b.contact.relation ?? ''))
    }
    return copie
  }, [annivListFiltree, sortMode])

  // ── Compteurs pour l'en-tête ──
  const counts = useMemo(() => ({
    all: annivList.length,
    today: annivList.filter(a => a.joursRestants === 0).length,
  }), [annivList])

  // ── Actions ──
  const handleMessage = useCallback((contactId: string | number) => {
    router.push(`/dashboard/generate?contactId=${contactId}&eventType=anniversaire`)
  }, [router])

  // ── Rendu ──
  if (dates.error || lists.error) return <LoadFailure message={dates.error || lists.error} retry={() => { dates.retry(); lists.retry() }} />
  if (dates.loading || lists.loading) return <p role="status">Chargement des anniversaires…</p>
  if (listError) return <LoadFailure message={listError} retry={retry} />
  return (
    <div className="min-h-screen bg-canvas px-4 py-6 sm:px-6 sm:py-10">

      <main className="max-w-5xl mx-auto space-y-6">
        <ListSelector state={lists} />

        {/* En-tête */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎂</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-ink">Anniversaires</h1>
              <p className="text-xs sm:text-sm text-muted">
                {counts.today > 0
                  ? `${counts.today} anniversaire${counts.today > 1 ? 's' : ''} aujourd'hui !`
                  : `${counts.all} contacts référencés`}
              </p>
            </div>
          </div>
        </header>

        {/* ⚠️ Section contacts sans date de naissance */}
        <MissingContactBanner contacts={contactsSansDate} reason="sans date de naissance" actionLabel="Compléter les dates" />

        {/* Barre de filtres + tri + vue */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'today', 'week', 'month'] as FilterMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm transition ${
                  filterMode === mode
                    ? 'bg-action text-on-action font-semibold'
                    : 'bg-ink/5 text-muted hover:bg-ink/10'
                }`}
              >
                {mode === 'all' ? 'Tous' : mode === 'today' ? "Aujourd'hui" : mode === 'week' ? '7 jours' : '30 jours'}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="bg-ink/5 border border-line text-muted text-xs sm:text-sm rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="date" className="bg-canvas">Trier : Date</option>
            <option value="alpha" className="bg-canvas">Trier : Alphabétique</option>
            <option value="relation" className="bg-canvas">Trier : Relation</option>
          </select>

          <button
            onClick={() => setViewMode(v => (v === 'cards' ? 'compact' : 'cards'))}
            className="px-3 py-1.5 rounded-full text-xs sm:text-sm bg-ink/5 text-muted hover:bg-ink/10 transition"
          >
            {viewMode === 'cards' ? '☰ Vue compacte' : '▦ Vue cartes'}
          </button>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className={viewMode === 'cards' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : annivListTriee.length === 0 ? (
          <div className="text-center py-16 text-muted">
            Aucun anniversaire à afficher pour ce filtre.
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {annivListTriee.map(anniv => (
              <CardAnniv
                key={anniv.contact.id}
                anniv={anniv}
                onMessage={handleMessage}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {annivListTriee.map(anniv => (
              <RowAnniv
                key={anniv.contact.id}
                anniv={anniv}
                onMessage={handleMessage}
              />
            ))}
          </div>
        )}

        {/* Pied de page */}
        {annivList.length > 0 && (
          <footer className="text-center py-6 text-sm text-muted">
            {annivList.length} contact{annivList.length > 1 ? 's' : ''} avec un anniversaire référencé
          </footer>
        )}
      </main>
    </div>
  )
}

// ─── Composant Carte (vue par défaut) ────────────────────────────────────────

function CardAnniv({
  anniv,
  onMessage,
}: {
  anniv: ContactAvecAnniv
  onMessage: (id: string | number) => void
}) {
  const { ouvrirDrawer } = useDrawer()

  const badge = anniv.joursRestants === 0 ? BADGE_CONFIG.today
    : anniv.joursRestants <= 7 ? BADGE_CONFIG.soon
    : BADGE_CONFIG.later

  const dateLabel = anniv.prochainAnniv.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })

  const estAujourdhui = anniv.joursRestants === 0

  const dateNaissanceFormatee = anniv.contact.date_naissance
    ? (anniv.contact.date_naissance.startsWith('1900-') ? `${anniv.contact.date_naissance.slice(8)}/${anniv.contact.date_naissance.slice(5, 7)} (année à vérifier)` : formaterDateFR(new Date(anniv.contact.date_naissance)))
    : ''

  return (
    <div className="bg-ink/5 border border-line rounded-2xl p-4 space-y-3 hover:bg-ink/[0.07] transition">
      {/* Ligne du haut : anneau + nom + badge */}
      <div className="flex items-center gap-3">
        <ProgressRing joursRestants={anniv.joursRestants} estAujourdhui={estAujourdhui} />

        <div className="flex-1 min-w-0">
          <button
            onClick={() => ouvrirDrawer({ est_favori: null, telephone_indicatif: null, telephone_numero: null, note: null, ...anniv.contact })}
            className="font-semibold text-ink truncate hover:text-accent transition text-left block w-full"
          >
            {anniv.contact.prenom} {anniv.contact.nom}
          </button>
          <span className="text-muted text-xs">{dateLabel}</span>
        </div>
      </div>

      {/* Ligne info : date de naissance + âge */}
      <div className="text-info text-xs sm:text-sm truncate">
        🎂 Né(e) le {dateNaissanceFormatee} • {anniv.ageAVenir === null ? 'Âge inconnu' : `${anniv.ageAVenir} ans`}
      </div>

      <button
        onClick={() => onMessage(anniv.contact.id)}
        className="w-full text-xs sm:text-sm bg-action hover:bg-action text-on-action font-medium px-4 py-2.5 rounded-xl transition"
      >
        ✨ Envoyer un message
      </button>
    </div>
  )
}

// ─── Composant Ligne (vue compacte) ─────────────────────────────────────────

function RowAnniv({
  anniv,
  onMessage,
}: {
  anniv: ContactAvecAnniv
  onMessage: (id: string | number) => void
}) {
  const { ouvrirDrawer } = useDrawer()

  const badge = anniv.joursRestants === 0 ? BADGE_CONFIG.today
    : anniv.joursRestants <= 7 ? BADGE_CONFIG.soon
    : BADGE_CONFIG.later

  return (
    <div className="flex items-center justify-between gap-3 bg-ink/5 border border-line rounded-xl px-4 py-2.5 hover:bg-ink/[0.07] transition">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${badge.classe}`}>
          {anniv.joursRestants === 0 ? "J" : `J-${anniv.joursRestants}`}
        </span>

        <button
          onClick={() => ouvrirDrawer({ est_favori: null, telephone_indicatif: null, telephone_numero: null, note: null, ...anniv.contact })}
          className="text-ink text-sm truncate hover:text-accent transition text-left"
        >
          {anniv.contact.prenom} {anniv.contact.nom}
        </button>

        <span className="text-muted text-xs truncate hidden sm:inline">
          🎂 {anniv.ageAVenir === null ? 'Âge inconnu' : `${anniv.ageAVenir} ans`}
        </span>
      </div>
      <button
        onClick={() => onMessage(anniv.contact.id)}
        className="text-xs bg-action hover:bg-action text-on-action font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap"
      >
        ✨ Message
      </button>
    </div>
  )
}
