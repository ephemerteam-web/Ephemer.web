'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-browser'
import { SAINTS } from '@/lib/saints'
import { TYPES_RELATION } from '@/lib/constants'
import { useDrawer } from '@/components/DrawerContext'
import ProgressRing from '@/components/ProgressRing' // 👈 AJOUT : import de l'anneau

// ─── Types ────────────────────────────────────────────────────────────────────

type Contact = {
  id: string
  nom: string
  prenom: string
  date_naissance: string | null
  relation: string
  email: string | null
}

type FeteAvecContact = {
  nomSaint: string
  prenoms: string[]
  prochaineFete: Date
  joursRestants: number
  contact: Contact
  multipleDates?: boolean
}

type FilterMode = 'all' | 'week' | 'month' | 'today'
type SortMode = 'date' | 'alpha' | 'relation'
type ViewMode = 'cards' | 'compact'

// ─── Constantes visuelles ──────────────────────────────────────────────────────

const BADGE_CONFIG = {
  today: { label: "Aujourd'hui", classe: 'bg-[#C8A84E] text-[#0B1120]' },
  soon: { label: 'Bientôt', classe: 'bg-orange-400/20 text-orange-300 border border-orange-400/40' },
  later: { label: '', classe: 'bg-white/10 text-white/60 border border-white/10' },
}
const supabase = getSupabaseClient()
  
function normaliserPrenom(prenom: string): string {
  return prenom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function prochaineOccurrence(mois: number, jour: number): Date {
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  const annee = aujourdhui.getFullYear()
  let date = new Date(annee, mois - 1, jour)
  if (date < aujourdhui) {
    date = new Date(annee + 1, mois - 1, jour)
  }
  return date
}

function joursRestants(date: Date): number {
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  const cible = new Date(date)
  cible.setHours(0, 0, 0, 0)
  const diffMs = cible.getTime() - aujourdhui.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

// ─── Skeleton loader (carte grise qui pulse) ──────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-white/10 rounded" />
        <div className="h-5 w-16 bg-white/10 rounded-full" />
      </div>
      <div className="h-3 w-32 bg-white/10 rounded" />
      <div className="h-2 w-full bg-white/10 rounded-full" />
      <div className="h-9 w-full bg-white/10 rounded-xl" />
    </div>
  )
}

// ─── Page principale ────────────────────────────────────────────────────────

export default function CalendrierSaintsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [sortMode, setSortMode] = useState<SortMode>('date')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [copiedSaint, setCopiedSaint] = useState<string | null>(null)
  const { ouvrirDrawer } = useDrawer()

  // ── Chargement des contacts ──
  useEffect(() => {
    async function loadContacts() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('id, nom, prenom, date_naissance, relation, email')
        .eq('user_id', session.user.id)
        .order('prenom')

      if (!error && data) {
        setContacts(data as Contact[])
      }
      setLoading(false)
    }
    loadContacts()
  }, [router])

  // ── Calcul des fêtes (avec gestion prénom vide) ──
  const { fetelist, contactsSansFete } = useMemo(() => {
    const resultats: FeteAvecContact[] = []
    const sansFete: Contact[] = []

    for (const contact of contacts) {
      if (!contact.prenom || contact.prenom.trim() === '') {
        sansFete.push(contact)
        continue
      }

      const prenomNormalise = normaliserPrenom(contact.prenom)
      const saint = SAINTS.find(s => s.prenoms.includes(prenomNormalise))

      if (!saint) {
        sansFete.push(contact)
        continue
      }

      const [mois, jour] = saint.date.split('-').map(Number)
      const prochaineFete = prochaineOccurrence(mois, jour)

      resultats.push({
        nomSaint: saint.nomSaint,
        prenoms: saint.prenoms,
        prochaineFete,
        joursRestants: joursRestants(prochaineFete),
        contact,
        multipleDates: saint.prenoms.length > 1,
      })
    }

    return { fetelist: resultats, contactsSansFete: sansFete }
  }, [contacts])

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
      copie.sort((a, b) => a.contact.prenom.localeCompare(b.contact.prenom))
    } else if (sortMode === 'relation') {
      copie.sort((a, b) => a.contact.relation.localeCompare(b.contact.relation))
    }
    return copie
  }, [fetelistFiltree, sortMode])

  // ── Compteurs pour l'en-tête ──
  const counts = useMemo(() => ({
    all: fetelist.length,
    today: fetelist.filter(f => f.joursRestants === 0).length,
  }), [fetelist])

  // ── Actions ──
  const handleMessage = useCallback((contactId: string) => {
    router.push(`/dashboard/generate?contactId=${contactId}&eventType=fete_prenomale`)
  }, [router])

  const handleCopySaint = useCallback((nomSaint: string) => {
    navigator.clipboard.writeText(nomSaint)
    setCopiedSaint(nomSaint)
    setTimeout(() => setCopiedSaint(null), 2000)
  }, [])

  // ── Rendu ──
  return (
    <div className="min-h-screen bg-[#0B1120] px-4 py-6 sm:px-6 sm:py-10">
      <main className="max-w-5xl mx-auto space-y-6">

        {/* En-tête */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎂</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Fêtes des Saints</h1>
              <p className="text-xs sm:text-sm text-white/50">
                {counts.today > 0
                  ? `${counts.today} fête${counts.today > 1 ? 's' : ''} aujourd'hui !`
                  : `${counts.all} contacts référencés`}
              </p>
            </div>
          </div>
        </header>

       {/* ⚠️ Section contacts sans fête référencée */}
{contactsSansFete.length > 0 && (
  <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 text-sm text-orange-200">
    <div className="flex items-start gap-4">
      {/* Texte à gauche */}
      <div className="flex-1 min-w-0">
        <p className="font-medium">
          ⚠️ <strong>{contactsSansFete.length}</strong> contact{contactsSansFete.length > 1 ? 's' : ''} sans fête référencée
        </p>
        <p className="text-xs text-orange-200/70 mt-1 break-words">
          {contactsSansFete
            .slice(0, 5)
            .map(c => (c.prenom && c.prenom.trim() !== '' ? c.prenom : '(sans prénom)'))
            .join(', ')}
          {contactsSansFete.length > 5 ? `, +${contactsSansFete.length - 5} autre(s)` : ''}
        </p>
      </div>

      {/* Bouton à droite */}
      <button
        onClick={() => router.push('/dashboard/contacts')}
        className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl
                   bg-white/5 hover:bg-white/10
                   border border-orange-500/40 hover:border-orange-400
                   text-orange-100 text-xs sm:text-sm font-medium
                   transition"
      >
        ✏️ Compléter les prénoms
      </button>
    </div>
  </div>
)}

        {/* Barre de filtres + tri + vue */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'today', 'week', 'month'] as FilterMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm transition ${
                  filterMode === mode
                    ? 'bg-[#C8A84E] text-[#0B1120] font-semibold'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
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
            className="bg-white/5 border border-white/10 text-white/80 text-xs sm:text-sm rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
          >
            <option value="date" className="bg-[#0B1120]">Trier : Date</option>
            <option value="alpha" className="bg-[#0B1120]">Trier : Alphabétique</option>
            <option value="relation" className="bg-[#0B1120]">Trier : Relation</option>
          </select>

          <button
            onClick={() => setViewMode(v => (v === 'cards' ? 'compact' : 'cards'))}
            className="px-3 py-1.5 rounded-full text-xs sm:text-sm bg-white/5 text-white/60 hover:bg-white/10 transition"
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
          <div className="text-center py-16 text-white/40">
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
          <footer className="text-center py-6 text-sm text-white/30">
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
  onMessage: (id: string) => void
  onCopySaint: (nom: string) => void
  copied: boolean
}) {
  const { ouvrirDrawer } = useDrawer()

  const badge = fete.joursRestants === 0 ? BADGE_CONFIG.today
    : fete.joursRestants <= 7 ? BADGE_CONFIG.soon
    : BADGE_CONFIG.later

  const dateLabel = fete.prochaineFete.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })

  const estAujourdhui = fete.joursRestants === 0

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 hover:bg-white/[0.07] transition">
      {/* Ligne du haut : anneau + nom + badge */}
      <div className="flex items-center gap-3">
        {/* 👇 Anneau avec logique de progression sur 365 jours */}
        <ProgressRing joursRestants={fete.joursRestants} estAujourdhui={estAujourdhui} />

        <div className="flex-1 min-w-0">
          <button
            onClick={() => ouvrirDrawer(fete.contact as any)}
            className="font-semibold text-white truncate hover:text-[#C8A84E] transition text-left block w-full"
          >
            {fete.contact.prenom} {fete.contact.nom}
          </button>
          <span className="text-white/40 text-xs">{dateLabel}</span>
        </div>

        </div>

      {/* Ligne du saint (copier) */}
      <button
        onClick={() => onCopySaint(fete.nomSaint)}
        className="flex items-center gap-1 text-indigo-300/80 hover:text-indigo-200 transition truncate text-xs sm:text-sm w-full"
        title="Copier le nom du saint"
      >
        🕊️ {fete.nomSaint}
        {copied ? ' ✓' : ' 📋'}
      </button>

      <button
        onClick={() => onMessage(fete.contact.id)}
        className="w-full text-xs sm:text-sm bg-[#C8A84E] hover:bg-[#D4B85C] text-[#0B1120] font-medium px-4 py-2.5 rounded-xl transition"
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
  onMessage: (id: string) => void
}) {
  const { ouvrirDrawer } = useDrawer()

  const badge = fete.joursRestants === 0 ? BADGE_CONFIG.today
    : fete.joursRestants <= 7 ? BADGE_CONFIG.soon
    : BADGE_CONFIG.later

  return (
    <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 hover:bg-white/[0.07] transition">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${badge.classe}`}>
          {fete.joursRestants === 0 ? "J" : `J-${fete.joursRestants}`}
        </span>

        <button
          onClick={() => ouvrirDrawer(fete.contact as any)}
          className="text-white text-sm truncate hover:text-[#C8A84E] transition text-left"
        >
          {fete.contact.prenom} {fete.contact.nom}
        </button>

        <span className="text-white/30 text-xs truncate hidden sm:inline">🕊️ {fete.nomSaint}</span>
      </div>
      <button
        onClick={() => onMessage(fete.contact.id)}
        className="text-xs bg-[#C8A84E] hover:bg-[#D4B85C] text-[#0B1120] font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap"
      >
        ✨ Message
      </button>
    </div>
  )
}