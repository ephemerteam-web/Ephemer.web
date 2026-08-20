'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-browser'
import { calculerProchainAnniversaire, formaterDateFR } from '@/lib/date-utils'
import { useDrawer } from '@/components/DrawerContext'
import ProgressRing from '@/components/ProgressRing'

// ─── Types ────────────────────────────────────────────────────────────────────

type Contact = {
  id: string
  nom: string
  prenom: string
  date_naissance: string | null
  relation: string
  email: string | null
}

type ContactAvecAnniv = {
  contact: Contact
  joursRestants: number
  ageAVenir: number
  prochainAnniv: Date
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

export default function AnniversairesPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [sortMode, setSortMode] = useState<SortMode>('date')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const { ouvrirDrawer } = useDrawer()
  const supabase = getSupabaseClient()
    

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

  // ── Calcul des anniversaires (avec gestion date manquante) ──
  const { annivList, contactsSansDate } = useMemo(() => {
    const resultats: ContactAvecAnniv[] = []
    const sansDate: Contact[] = []

    for (const contact of contacts) {
      if (!contact.date_naissance) {
        sansDate.push(contact)
        continue
      }

      const { joursRestants, ageAVenir, date: prochainAnniv } =
        calculerProchainAnniversaire(contact.date_naissance)

      resultats.push({
        contact,
        joursRestants,
        ageAVenir,
        prochainAnniv,
      })
    }

    return { annivList: resultats, contactsSansDate: sansDate }
  }, [contacts])

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
      copie.sort((a, b) => a.contact.prenom.localeCompare(b.contact.prenom))
    } else if (sortMode === 'relation') {
      copie.sort((a, b) => a.contact.relation.localeCompare(b.contact.relation))
    }
    return copie
  }, [annivListFiltree, sortMode])

  // ── Compteurs pour l'en-tête ──
  const counts = useMemo(() => ({
    all: annivList.length,
    today: annivList.filter(a => a.joursRestants === 0).length,
  }), [annivList])

  // ── Actions ──
  const handleMessage = useCallback((contactId: string) => {
    router.push(`/dashboard/generate?contactId=${contactId}&eventType=anniversaire`)
  }, [router])

  // ── Rendu ──
  return (
    <div className="min-h-screen bg-[#0B1120] px-4 py-6 sm:px-6 sm:py-10">
      <main className="max-w-5xl mx-auto space-y-6">

        {/* En-tête */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎂</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Anniversaires</h1>
              <p className="text-xs sm:text-sm text-white/50">
                {counts.today > 0
                  ? `${counts.today} anniversaire${counts.today > 1 ? 's' : ''} aujourd'hui !`
                  : `${counts.all} contacts référencés`}
              </p>
            </div>
          </div>
        </header>

        {/* ⚠️ Section contacts sans date de naissance */}
{contactsSansDate.length > 0 && (
  <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 text-sm text-orange-200">
    <div className="flex items-start gap-4">
      {/* Texte à gauche */}
      <div className="flex-1 min-w-0">
        <p className="font-medium">
          ⚠️ <strong>{contactsSansDate.length}</strong> contact{contactsSansDate.length > 1 ? 's' : ''} sans date de naissance
        </p>
        <p className="text-xs text-orange-200/70 mt-1 break-words">
          {contactsSansDate
            .slice(0, 5)
            .map(c => (c.prenom && c.prenom.trim() !== '' ? c.prenom : '(sans prénom)'))
            .join(', ')}
          {contactsSansDate.length > 5 ? `, +${contactsSansDate.length - 5} autre(s)` : ''}
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
        ✏️ Compléter les dates
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
        ) : annivListTriee.length === 0 ? (
          <div className="text-center py-16 text-white/40">
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
          <footer className="text-center py-6 text-sm text-white/30">
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
  onMessage: (id: string) => void
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
    ? formaterDateFR(new Date(anniv.contact.date_naissance))
    : ''

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 hover:bg-white/[0.07] transition">
      {/* Ligne du haut : anneau + nom + badge */}
      <div className="flex items-center gap-3">
        <ProgressRing joursRestants={anniv.joursRestants} estAujourdhui={estAujourdhui} />

        <div className="flex-1 min-w-0">
          <button
            onClick={() => ouvrirDrawer(anniv.contact as any)}
            className="font-semibold text-white truncate hover:text-[#C8A84E] transition text-left block w-full"
          >
            {anniv.contact.prenom} {anniv.contact.nom}
          </button>
          <span className="text-white/40 text-xs">{dateLabel}</span>
        </div>
      </div>

      {/* Ligne info : date de naissance + âge */}
      <div className="text-indigo-300/80 text-xs sm:text-sm truncate">
        🎂 Né(e) le {dateNaissanceFormatee} • {anniv.ageAVenir} ans
      </div>

      <button
        onClick={() => onMessage(anniv.contact.id)}
        className="w-full text-xs sm:text-sm bg-[#C8A84E] hover:bg-[#D4B85C] text-[#0B1120] font-medium px-4 py-2.5 rounded-xl transition"
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
  onMessage: (id: string) => void
}) {
  const { ouvrirDrawer } = useDrawer()

  const badge = anniv.joursRestants === 0 ? BADGE_CONFIG.today
    : anniv.joursRestants <= 7 ? BADGE_CONFIG.soon
    : BADGE_CONFIG.later

  return (
    <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 hover:bg-white/[0.07] transition">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${badge.classe}`}>
          {anniv.joursRestants === 0 ? "J" : `J-${anniv.joursRestants}`}
        </span>

        <button
          onClick={() => ouvrirDrawer(anniv.contact as any)}
          className="text-white text-sm truncate hover:text-[#C8A84E] transition text-left"
        >
          {anniv.contact.prenom} {anniv.contact.nom}
        </button>

        <span className="text-white/30 text-xs truncate hidden sm:inline">
          🎂 {anniv.ageAVenir} ans
        </span>
      </div>
      <button
        onClick={() => onMessage(anniv.contact.id)}
        className="text-xs bg-[#C8A84E] hover:bg-[#D4B85C] text-[#0B1120] font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap"
      >
        ✨ Message
      </button>
    </div>
  )
}