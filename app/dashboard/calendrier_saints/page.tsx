'use client'
import { useContacts } from '@/lib/hooks/useContacts'
import LoadFailure from '@/components/LoadFailure'
import MissingContactBanner from '@/components/MissingContactBanner'
import DatesNav from '@/components/DatesNav'
import { usePersonalEvents } from '@/lib/hooks/usePersonalEvents'
import { usePrivateLists } from '@/lib/hooks/usePrivateLists'
import { ListSelector } from '@/components/PrivateLists'
import { daysBetween, parisDay, parseLocalDay } from '@/lib/calendar-day'
import { shiftDay } from '@/lib/personal-events'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SAINTS_PAR_DATE } from '@/lib/saints'
import { useDrawer } from '@/components/DrawerContext'
import ProgressRing from '@/components/ProgressRing' // 👈 AJOUT : import de l'anneau

// ─── Types ────────────────────────────────────────────────────────────────────

type Contact = Pick<import('@/types/database').Contact, 'id' | 'nom' | 'prenom' | 'date_naissance' | 'relation' | 'email'>

type FeteAvecContact = {
  nomSaint: string
  prochaineFete: Date
  joursRestants: number
  contact: Contact
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

export default function CalendrierSaintsPage() {
  const router = useRouter()
  const { contacts: allContacts, loading, error: listError, retry } = useContacts()
  const lists = usePrivateLists()
  const contacts = lists.filter(allContacts)
  const [today, setToday] = useState(parisDay)
  const dates = usePersonalEvents(today, shiftDay(today, 399))
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [sortMode, setSortMode] = useState<SortMode>('date')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [copiedSaint, setCopiedSaint] = useState<string | null>(null)
  useEffect(() => {
    const timer = window.setInterval(() => setToday(parisDay()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  // ── Chargement des contacts ──


  // Même prochaine occurrence que le calendrier, y compris la date confirmée.
  const { fetelist, contactsSansFete } = useMemo(() => {
    const resultats: FeteAvecContact[] = []
    const sansFete: Contact[] = []

    for (const contact of contacts) {
      const next = dates.views.find(view => view.contact?.id === contact.id && view.kind === 'fete_prenomale')
      if (!next) {
        sansFete.push(contact)
        continue
      }
      const saint = SAINTS_PAR_DATE.get(next.date.slice(5))
      resultats.push({
        nomSaint: saint?.nomSaint ?? next.title,
        prochaineFete: parseLocalDay(next.date),
        joursRestants: daysBetween(today, next.date),
        contact,
      })
    }

    return { fetelist: resultats, contactsSansFete: sansFete }
  }, [contacts, dates.views, today])

  // ── Filtrage ──
  const fetelistFiltree = useMemo(() => {
    return fetelist.filter(f => {
      if (filterMode === 'today') return f.joursRestants === 0
      if (filterMode === 'week') return f.joursRestants >= 0 && f.joursRestants <= 7
      if (filterMode === 'month') return f.joursRestants >= 0 && f.joursRestants <= 30
      return true
    })
  }, [fetelist, filterMode])

  // ── Tri ──
  const fetelistTriee = useMemo(() => {
    const copie = [...fetelistFiltree]
    if (sortMode === 'date') {
      copie.sort((a, b) => a.joursRestants - b.joursRestants)
    } else if (sortMode === 'alpha') {
      copie.sort((a, b) => (a.contact.prenom ?? '').localeCompare(b.contact.prenom ?? ''))
    } else if (sortMode === 'relation') {
      copie.sort((a, b) => (a.contact.relation ?? '').localeCompare(b.contact.relation ?? ''))
    }
    return copie
  }, [fetelistFiltree, sortMode])

  // ── Compteurs pour l'en-tête ──
  const counts = useMemo(() => ({
    all: fetelist.length,
    today: fetelist.filter(f => f.joursRestants === 0).length,
  }), [fetelist])

  // ── Actions ──
  const handleMessage = useCallback((contactId: string | number) => {
    router.push(`/dashboard/generate?contactId=${contactId}&eventType=fete_prenomale`)
  }, [router])

  const handleCopySaint = useCallback((nomSaint: string) => {
    navigator.clipboard.writeText(nomSaint)
    setCopiedSaint(nomSaint)
    setTimeout(() => setCopiedSaint(null), 2000)
  }, [])

  // ── Rendu ──
  if (dates.error || lists.error) return <LoadFailure message={dates.error || lists.error} retry={() => { dates.retry(); void lists.retry() }} />
  if (dates.loading || lists.loading) return <p role="status">Chargement des fêtes…</p>
  if (listError) return <LoadFailure message={listError} retry={retry} />
  return (
    <div className="min-h-screen bg-canvas px-4 py-6 sm:px-6 sm:py-10">

      <main className="max-w-5xl mx-auto space-y-6">
        <DatesNav />
        <ListSelector state={lists} />

        {/* En-tête */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌸</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-ink">Fêtes des saints</h1>
              <p className="text-xs sm:text-sm text-muted">
                {counts.today > 0
                  ? `${counts.today} fête${counts.today > 1 ? 's' : ''} aujourd'hui !`
                  : `${counts.all} contacts référencés`}
              </p>
            </div>
          </div>
        </header>

       {/* ⚠️ Section contacts sans fête référencée */}
        <MissingContactBanner contacts={contactsSansFete} reason="sans fête visible à venir" actionLabel="Vérifier les fêtes" />

        {/* Barre de filtres + tri + vue */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'today', 'week', 'month'] as FilterMode[]).map(mode => (
              <button
                key={mode}
                aria-pressed={filterMode === mode}
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
            aria-label="Trier les fêtes"
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
        ) : fetelistTriee.length === 0 ? (
          <div className="text-center py-16 text-muted">
            Aucune fête à afficher pour ce filtre.
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fetelistTriee.map(fete => (
              <CardSaint
                key={fete.contact.id}
                fete={fete}
                onMessage={handleMessage}
                onCopySaint={handleCopySaint}
                copied={copiedSaint === fete.nomSaint}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {fetelistTriee.map(fete => (
              <RowSaint
                key={fete.contact.id}
                fete={fete}
                onMessage={handleMessage}
              />
            ))}
          </div>
        )}

        {/* Pied de page */}
        {fetelist.length > 0 && (
          <footer className="text-center py-6 text-sm text-muted">
            {fetelist.length} contact{fetelist.length > 1 ? 's' : ''} avec une fête référencée
          </footer>
        )}
      </main>
    </div>
  )
}

// ─── Composant Carte (vue par défaut) ────────────────────────────────────────

function CardSaint({
  fete,
  onMessage,
  onCopySaint,
  copied,
}: {
  fete: FeteAvecContact
  onMessage: (id: string | number) => void
  onCopySaint: (nom: string) => void
  copied: boolean
}) {
  const { ouvrirDrawer } = useDrawer()

  const dateLabel = fete.prochaineFete.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })

  const estAujourdhui = fete.joursRestants === 0

  return (
    <div className="bg-ink/5 border border-line rounded-2xl p-4 space-y-3 hover:bg-ink/[0.07] transition">
      {/* Ligne du haut : anneau + nom + badge */}
      <div className="flex items-center gap-3">
        {/* 👇 Anneau avec logique de progression sur 365 jours */}
        <ProgressRing joursRestants={fete.joursRestants} estAujourdhui={estAujourdhui} />

        <div className="flex-1 min-w-0">
          <button
            onClick={() => ouvrirDrawer({ est_favori: null, telephone_indicatif: null, telephone_numero: null, note: null, ...fete.contact })}
            className="font-semibold text-ink truncate hover:text-accent transition text-left block w-full"
          >
            {fete.contact.prenom} {fete.contact.nom}
          </button>
          <span className="text-muted text-xs">{dateLabel}</span>
        </div>

        </div>

      {/* Ligne du saint (copier) */}
      <button
        onClick={() => onCopySaint(fete.nomSaint)}
        className="flex items-center gap-1 text-info hover:text-info transition truncate text-xs sm:text-sm w-full"
        title="Copier le nom du saint"
      >
        🕊️ {fete.nomSaint}
        {copied ? ' ✓' : ' 📋'}
      </button>

      <button
        onClick={() => onMessage(fete.contact.id)}
        className="w-full text-xs sm:text-sm bg-action hover:bg-action text-on-action font-medium px-4 py-2.5 rounded-xl transition"
      >
        ✨ Envoyer un message
      </button>
    </div>
  )
}

// ─── Composant Ligne (vue compacte) — INCHANGÉ ─────────────────────────────────

function RowSaint({
  fete,
  onMessage,
}: {
  fete: FeteAvecContact
  onMessage: (id: string | number) => void
}) {
  const { ouvrirDrawer } = useDrawer()

  const badge = fete.joursRestants === 0 ? BADGE_CONFIG.today
    : fete.joursRestants <= 7 ? BADGE_CONFIG.soon
    : BADGE_CONFIG.later

  return (
    <div className="flex items-center justify-between gap-3 bg-ink/5 border border-line rounded-xl px-4 py-2.5 hover:bg-ink/[0.07] transition">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${badge.classe}`}>
          {fete.joursRestants === 0 ? "J" : `J-${fete.joursRestants}`}
        </span>

        <button
          onClick={() => ouvrirDrawer({ est_favori: null, telephone_indicatif: null, telephone_numero: null, note: null, ...fete.contact })}
          className="text-ink text-sm truncate hover:text-accent transition text-left"
        >
          {fete.contact.prenom} {fete.contact.nom}
        </button>

        <span className="text-muted text-xs truncate hidden sm:inline">🕊️ {fete.nomSaint}</span>
      </div>
      <button
        onClick={() => onMessage(fete.contact.id)}
        className="text-xs bg-action hover:bg-action text-on-action font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap"
      >
        ✨ Message
      </button>
    </div>
  )
}
