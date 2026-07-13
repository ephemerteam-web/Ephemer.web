'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { SAINTS } from '@/lib/saints'
import { trouverFete, calculerProchaineFete, formaterDateFR } from '@/lib/anniversaires'
import { TYPES_RELATION } from '@/lib/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

type Contact = {
  id: string
  nom: string
  prenom: string
  date_naissance: string | null
  relation: string
  email: string | null
}

type Sainte = {
  date: string
  nomSaint: string
  prenoms: string[]
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

// ─── Constantes visuelles ──────────────────────────────────────────────────────

const BADGE_CONFIG = {
  today:    { label: '🎉 Aujourd\'hui',        bg: 'bg-red-500/20', text: 'text-red-600', border: 'border-red-400' },
  urgent:   { label: 'J-7',                     bg: 'bg-amber-500/20', text: 'text-amber-600', border: 'border-amber-400' },
  soon:     { label: 'J-30',                    bg: 'bg-blue-500/20', text: 'text-blue-600', border: 'border-blue-400' },
  relaxed:  { label: null,                      bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-300' },
}

const RELATION_EMOJI: Record<string, string> = {
  famille:    '👨‍👩‍👧‍👦',
  ami:        '🤝',
  collegue:   '💼',
  amour:      '❤️',
  autre:      '⭐',
}

// ─── Fonction utilitaire ───────────────────────────────────────────────────────

function getBadge(joursRestants: number) {
  if (joursRestants === 0) return BADGE_CONFIG.today
  if (joursRestants <= 7)  return BADGE_CONFIG.urgent
  if (joursRestants <= 30) return BADGE_CONFIG.soon
  return BADGE_CONFIG.relaxed
}

function calculerProchaine(dateMMJJ: string): { date: Date; jours: number } {
  const [mois, jour] = dateMMJJ.split('-').map(Number)
  const maintenant = new Date()
  const cetteAnnee = new Date(maintenant.getFullYear(), mois - 1, jour)
  const anSuivant  = new Date(maintenant.getFullYear() + 1, mois - 1, jour)
  const candidate  = cetteAnnee >= maintenant ? cetteAnnee : anSuivant
  const diffMs     = candidate.getTime() - maintenant.getTime()
  const diffJours  = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return { date: candidate, jours: diffJours }
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function CalendrierSaintsPage() {
  const [fetelist, setFetelist] = useState<FeteAvecContact[]>([])
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [filtreRelation, setFiltreRelation] = useState<string>('tous')
  const [filtreMode, setFiltreMode] = useState<FilterMode>('all')
  const [showTodayOnly, setShowTodayOnly] = useState(false)
  const [contactQuantities, setContactQuantities] = useState<Record<string, number>>({})
  const topRef = useRef<HTMLDivElement>(null)

  // ── Chargement des données ──────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, nom, prenom, date_naissance, relation, email')

      if (!contacts) return

      // Grouper les contacts par prénom normalisé
      const parPrenom: Record<string, Contact[]> = {}
      for (const c of contacts) {
        const key = c.prenom?.toLowerCase().trim() || ''
        if (!key) continue
        if (!parPrenom[key]) parPrenom[key] = []
        parPrenom[key].push(c as Contact)
      }

      // Construire la liste des fêtes avec contacts
      const liste: FeteAvecContact[] = []
      for (const contact of contacts as Contact[]) {
        const p = contact.prenom?.toLowerCase().trim()
        if (!p) continue

        // Trouver le saint correspondant
        const saint = SAINTS.find((s) =>
          s.prenoms.some((np) => np.toLowerCase() === p)
        )
        if (!saint) continue

        const { date, jours } = calculerProchaine(saint.date)
        liste.push({
          nomSaint:      saint.nomSaint,
          prenoms:       saint.prenoms,
          prochaineFete: date,
          joursRestants: jours,
          contact,
          multipleDates: (parPrenom[p]?.length ?? 1) > 1,
        })
      }

      // Tri : aujourd'hui d'abord, puis par joursRestants
      liste.sort((a, b) => a.joursRestants - b.joursRestants)
      setFetelist(liste)

      // Compter les contacts par prénom
      const qty: Record<string, number> = {}
      for (const p of Object.keys(parPrenom)) {
        qty[p] = parPrenom[p].length
      }
      setContactQuantities(qty)
      setLoading(false)
    }

    init()
  }, [])

  // ── Filtrage ────────────────────────────────────────────────────────────────

  const filtered = useCallback(() => {
    return fetelist.filter((f) => {
      // Recherche par nom / prénom
      if (recherche) {
        const r = recherche.toLowerCase()
        const matchNom    = f.contact.nom?.toLowerCase().includes(r)
        const matchPrenom = f.contact.prenom?.toLowerCase().includes(r)
        const matchSaint  = f.nomSaint.toLowerCase().includes(r)
        if (!matchNom && !matchPrenom && !matchSaint) return false
      }

      // Filtre par relation
      if (filtreRelation !== 'tous' && f.contact.relation !== filtreRelation) {
        return false
      }

      // Filtre par mode temporal
      if (filtreMode === 'today') {
        return f.joursRestants === 0
      }
      if (filtreMode === 'week') {
        return f.joursRestants <= 7
      }
      if (filtreMode === 'month') {
        return f.joursRestants <= 30
      }

      return true
    })
  }, [fetelist, recherche, filtreRelation, filtreMode])

  const visible = filtered()
  const todayList   = fetelist.filter((f) => f.joursRestants === 0)
  const weekList    = fetelist.filter((f) => f.joursRestants > 0 && f.joursRestants <= 7)
  const monthList   = fetelist.filter((f) => f.joursRestants > 7 && f.joursRestants <= 30)
  const laterList   = fetelist.filter((f) => f.joursRestants > 30)

  // ── Scroll smooth vers le haut ──────────────────────────────────────────────

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // ── Notification "envoyer un message" ──────────────────────────────────────

  const envoyerMessage = (email: string | null, nom: string, prenom: string) => {
    if (!email) {
      alert(`${prenom} ${nom} n'a pas d'adresse e-mail enregistrée.`)
      return
    }
    window.location.href = `mailto:${email}?subject=Fête de ${prenom}&body=Bonjour ${prenom},%0A%0AJoyeuse fête ! 🎉`
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Chargement des fêtes…</p>
        </div>
      </div>
    )
  }

  const counts = {
    all:   fetelist.length,
    today: todayList.length,
    week:  weekList.length,
    month: monthList.length,
  }

  return (
    <div
      ref={topRef}
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50"
    >
      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          {/* Titre */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎂</span>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Fêtes des Saints</h1>
                <p className="text-sm text-slate-500">
                  {counts.today > 0
                    ? `${counts.today} fête${counts.today > 1 ? 's' : ''} aujourd'hui !`
                    : `${counts.all} contacts référencés`}
                </p>
              </div>
            </div>
            {/* Bouton retour */}
            <button
              onClick={scrollToTop}
              className="text-sm text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              ↑ Haut de page
            </button>
          </div>

          {/* Barre de recherche */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher par nom, prénom ou saint…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white
                         text-slate-700 placeholder-slate-400 text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                         transition-shadow"
            />
            {recherche && (
              <button
                onClick={() => setRecherche('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtres : relation + mode temporal */}
          <div className="flex flex-wrap gap-2">
            {/* Filtre relation */}
            <select
              value={filtreRelation}
              onChange={(e) => setFiltreRelation(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
            >
              <option value="tous">Toutes relations</option>
              {TYPES_RELATION.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Séparateur vertical */}
            <div className="w-px h-8 bg-slate-200 self-center hidden sm:block" />

            {/* Filtres temporels avec badges de compteur */}
            {[
              { key: 'all',   label: 'Tous' },
              { key: 'today', label: '🎉 Aujourd\'hui',   badge: counts.today },
              { key: 'week',  label: '📅 Cette semaine',  badge: counts.week },
              { key: 'month', label: '🗓️ Ce mois',        badge: counts.month },
            ].map(({ key, label, badge }) => {
              const active = filtreMode === key
              return (
                <button
                  key={key}
                  onClick={() => setFiltreMode(key as FilterMode)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                              border transition-all duration-200 ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {label}
                  {badge !== undefined && badge > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-indigo-400 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── Contenu principal ────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">

        {/* ── Section « Aujourd'hui » (highlightée) ─────────────────────────── */}
        {todayList.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🎉</span>
              <h2 className="text-lg font-bold text-slate-800">Fêtes du jour</h2>
              <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-1 rounded-full">
                {todayList.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayList.map((f) => (
                <CardSaint
                  key={f.contact.id}
                  fete={f}
                  isToday
                  onMessage={envoyerMessage}
                  hasMultipleDates={contactQuantities[f.contact.prenom?.toLowerCase()] > 1}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Section « Cette semaine » ──────────────────────────────────────── */}
        {weekList.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📅</span>
              <h2 className="text-lg font-bold text-slate-800">Cette semaine</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {weekList.map((f) => (
                <CardSaint
                  key={f.contact.id}
                  fete={f}
                  onMessage={envoyerMessage}
                  hasMultipleDates={contactQuantities[f.contact.prenom?.toLowerCase()] > 1}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Section « Ce mois » ─────────────────────────────────────────────── */}
        {monthList.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🗓️</span>
              <h2 className="text-lg font-bold text-slate-800">Dans le mois</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthList.map((f) => (
                <CardSaint
                  key={f.contact.id}
                  fete={f}
                  onMessage={envoyerMessage}
                  hasMultipleDates={contactQuantities[f.contact.prenom?.toLowerCase()] > 1}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Section « Plus tard » (résultats filtrés ou tous) ──────────────── */}
        {(filtreMode === 'all' ? laterList : visible).length > 0 && (
          <section>
            {filtreMode === 'all' && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🌿</span>
                <h2 className="text-lg font-bold text-slate-800">Bientôt</h2>
              </div>
            )}
            {filtreMode !== 'all' && (
              <p className="text-sm text-slate-500 mb-3">
                {visible.length} résultat{visible.length > 1 ? 's' : ''}
                {recherche ? ` pour "${recherche}"` : ''}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(filtreMode === 'all' ? laterList : visible).map((f) => (
                <CardSaint
                  key={f.contact.id}
                  fete={f}
                  onMessage={envoyerMessage}
                  hasMultipleDates={contactQuantities[f.contact.prenom?.toLowerCase()] > 1}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── État vide ─────────────────────────────────────────────────────── */}
        {visible.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-slate-700">Aucun résultat</h3>
            <p className="text-slate-500 mt-1">
              Aucun contact ne correspond à ta recherche ou à tes filtres.
            </p>
            <button
              onClick={() => { setRecherche(''); setFiltreRelation('tous'); setFiltreMode('all') }}
              className="mt-4 text-indigo-600 hover:text-indigo-800 text-sm font-medium underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}

        {/* ── Pied de page : compteur ───────────────────────────────────────── */}
        {fetelist.length > 0 && (
          <footer className="text-center py-6 text-sm text-slate-400">
            {fetelist.length} contact{fetelist.length > 1 ? 's' : ''} avec une fête référencée
            {' · '}
            {todayList.length > 0 ? `${todayList.length} fête${todayList.length > 1 ? 's' : ''} aujourd'hui` : 'Aucune fête aujourd\'hui'}
          </footer>
        )}
      </main>
    </div>
  )
}

// ─── Composant CardSaint ────────────────────────────────────────────────────────

type CardProps = {
  fete: FeteAvecContact
  isToday?: boolean
  onMessage: (email: string | null, nom: string, prenom: string) => void
  hasMultipleDates?: boolean
}

function CardSaint({ fete, isToday, onMessage, hasMultipleDates }: CardProps) {
  const badge = getBadge(fete.joursRestants)

  const dateLabel =
    fete.joursRestants === 0
      ? 'Aujourd\'hui !'
      : fete.joursRestants === 1
      ? 'Demain'
      : `Dans ${fete.joursRestants} jours`

  const relConfig = TYPES_RELATION.find((t) => t.value === fete.contact.relation)
  const emoji    = RELATION_EMOJI[fete.contact.relation] ?? '⭐'

  return (
    <div
      className={`relative rounded-2xl border p-4 flex flex-col gap-3
                  transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
                  ${isToday
                    ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200 shadow-sm'
                    : 'bg-white border-slate-200 shadow-sm'
                  }`}
    >
      {/* Badge en haut à droite */}
      <div className="absolute top-3 right-3">
        <span
          className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border
                       ${badge.bg} ${badge.text} ${badge.border}`}
          title={dateLabel}
        >
          {badge.label ?? `J-${fete.joursRestants}`}
        </span>
      </div>

      {/* Prénom + saint */}
      <div>
        <p className="text-xs text-slate-400 mb-0.5">{emoji} {relConfig?.label ?? fete.contact.relation}</p>
        <h3 className="text-lg font-bold text-slate-800 leading-tight">
          {fete.contact.prenom} {fete.contact.nom}
        </h3>
        <p className="text-sm text-indigo-600 font-medium">{fete.nomSaint}</p>
        {hasMultipleDates && (
          <p className="text-xs text-slate-400 mt-0.5">📌 {fete.prenoms.length} saints possibles</p>
        )}
      </div>

      {/* Date de la fête */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="font-medium">
          {fete.prochaineFete.toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
          })}
        </span>
        {fete.joursRestants > 0 && (
          <span className="text-slate-400">· {dateLabel}</span>
        )}
      </div>

      {/* Bouton Envoyer un message */}
      <button
        onClick={() => onMessage(fete.contact.email, fete.contact.nom, fete.contact.prenom)}
        className={`mt-auto w-full py-2.5 px-4 rounded-xl text-sm font-semibold
                    transition-all duration-200 flex items-center justify-center gap-2
                    ${isToday
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'
                    }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Envoyer un message
      </button>
    </div>
  )
}
