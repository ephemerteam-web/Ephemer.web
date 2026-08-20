'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SAINTS, SAINTS_PAR_DATE } from '@/lib/saints'
import { getSupabaseClient } from '@/lib/supabase-browser'

// ── Types ────────────────────────────────────────────────────────────────────
type Contact = {
  id: string
  nom: string
  prenom: string
  date_naissance: string | null
  relation: string
}

type JourSelectionne = {
  jour: number
  mois: number
  annee: number
} | null

type Saint = {
  nomSaint: string
  prenoms: string[]
  date: string
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function CalendrierPage() {
  const router = useRouter()
  const [moisActuel, setMoisActuel] = useState(new Date())
  const [recherche, setRecherche] = useState('')
  const [resultatsRecherche, setResultatsRecherche] = useState<Saint[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [jourSelectionne, setJourSelectionne] = useState<JourSelectionne>(null)
  const [showBottomSheet, setShowBottomSheet] = useState(false) // ✅ Pour mobile
  const calendrierRef = useRef<HTMLDivElement>(null)
  const supabase = getSupabaseClient()
  

  // ── Chargement initial ─────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/connexion')
        return
      }
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id)
      if (!error && data) setContacts(data as Contact[])
    }
    init()
  }, [router])

  // ── Utilitaires ────────────────────────────────────────────────────────────
  const normaliser = useCallback((texte: string) =>
    texte.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    []
  )

  // ✅ Mémoïsation des prénoms des contacts
  const prenomContacts = useMemo(
    () => new Set(contacts.map((c) => normaliser(c.prenom))),
    [contacts, normaliser]
  )

  // ✅ Mémoïsation : saints qui concernent un contact
  const saintConcerneUnContact = useCallback(
    (saint: Saint) => saint.prenoms.some((p) => prenomContacts.has(normaliser(p))),
    [prenomContacts, normaliser]
  )

  // ✅ Mémoïsation : Map des saints par date (optimisation majeure)
  const saintsParJourMap = useMemo(() => {
    const map = new Map<string, Saint>()
    SAINTS_PAR_DATE.forEach((saint, dateKey) => {
      map.set(dateKey, saint)
    })
    return map
  }, [])

  // ✅ Fonction optimisée pour obtenir les saints d'un jour
  const obtenirSaintsDuJour = useCallback(
    (jour: number, mois: number) => {
      const dateKey = `${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`
      const saint = saintsParJourMap.get(dateKey)
      return saint ? [saint] : []
    },
    [saintsParJourMap]
  )

  // ── Recherche avec debounce ────────────────────────────────────────────────
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const handleRecherche = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setRecherche(value)

    // ✅ Debounce : attend 300ms avant de chercher
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length === 0) {
      setResultatsRecherche([])
      return
    }

    debounceRef.current = setTimeout(() => {
      const valueNorm = normaliser(value)
      const resultats: Saint[] = []
      SAINTS.forEach((saint) => {
        if (saint.prenoms.some((p) => normaliser(p).includes(valueNorm))) {
          resultats.push(saint)
        }
      })
      setResultatsRecherche(resultats.slice(0, 20)) // ✅ Limite à 20 résultats
    }, 300)
  }

  // ── Calcul des jours du mois ───────────────────────────────────────────────
  const jours = useMemo(() => {
    const mois = moisActuel.getMonth()
    const annee = moisActuel.getFullYear()
    const nbJours = new Date(annee, mois + 1, 0).getDate()
    const premierJour = new Date(annee, mois, 1).getDay()
    const list: (number | null)[] = []
    for (let i = 0; i < premierJour; i++) list.push(null)
    for (let j = 1; j <= nbJours; j++) list.push(j)
    return list
  }, [moisActuel])

  // ── Anniversaires par jour ─────────────────────────────────────────────────
  const anniversairesParJour: Record<number, Contact[]> = useMemo(() => {
    const map: Record<number, Contact[]> = {}
    contacts.forEach((contact) => {
      if (contact.date_naissance) {
        const naissance = new Date(contact.date_naissance)
        const jour = naissance.getDate()
        const mois = naissance.getMonth()
        if (mois === moisActuel.getMonth()) {
          if (!map[jour]) map[jour] = []
          map[jour].push(contact)
        }
      }
    })
    return map
  }, [contacts, moisActuel])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const allerMoisPrecedent = () =>
    setMoisActuel(new Date(moisActuel.getFullYear(), moisActuel.getMonth() - 1))
  const allerMoisSuivant = () =>
    setMoisActuel(new Date(moisActuel.getFullYear(), moisActuel.getMonth() + 1))
  const allerAujourdhui = () => setMoisActuel(new Date()) // ✅ NOUVEAU

  const nomsMois = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]
  const nomsJours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

  // ── Sélection d'un jour ────────────────────────────────────────────────────
  const handleClickJour = (jour: number) => {
    setJourSelectionne({
      jour,
      mois: moisActuel.getMonth() + 1,
      annee: moisActuel.getFullYear()
    })
    setShowBottomSheet(true) // ✅ Ouvre le bottom sheet sur mobile
  }

  // ── Données du jour sélectionné ────────────────────────────────────────────
  const saintsJourSelectionne = useMemo(() =>
    jourSelectionne ? obtenirSaintsDuJour(jourSelectionne.jour, jourSelectionne.mois) : [],
    [jourSelectionne, obtenirSaintsDuJour]
  )

  const anniversairesJourSelectionne = useMemo(() =>
    jourSelectionne ? anniversairesParJour[jourSelectionne.jour] || [] : [],
    [jourSelectionne, anniversairesParJour]
  )

  // ── Vérifier si c'est aujourd'hui ──────────────────────────────────────────
  const today = new Date()
  const isToday = (jour: number) =>
    jour === today.getDate() &&
    moisActuel.getMonth() === today.getMonth() &&
    moisActuel.getFullYear() === today.getFullYear()

  // ── Couleurs par relation ──────────────────────────────────────────────────
  const couleurRelation: Record<string, string> = {
    famille: 'text-pink-400',
    amis: 'text-blue-400',
    pro: 'text-amber-400',
  }

  // ── Calcul des événements par jour (pour la grille) ────────────────────────
  const evenementsParJour = useMemo(() => {
    const map = new Map<number, { anniversaires: Contact[]; saintsAvecContact: Saint[] }>()
    jours.forEach((jour) => {
      if (jour === null) return
      const anniversaires = anniversairesParJour[jour] || []
      const saints = obtenirSaintsDuJour(jour, moisActuel.getMonth() + 1)
      const saintsAvecContact = saints.filter(saintConcerneUnContact)
      map.set(jour, { anniversaires, saintsAvecContact })
    })
    return map
  }, [jours, anniversairesParJour, obtenirSaintsDuJour, moisActuel, saintConcerneUnContact])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ========== CALENDRIER ========== */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-6 backdrop-blur-sm">

            {/* En-tête navigation */}
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <button
                onClick={allerMoisPrecedent}
                className="w-12 h-12 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center transition text-xl sm:text-lg touch-manipulation"
                aria-label="Mois précédent"
              >
                ‹
              </button>
              <div className="text-center flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {nomsMois[moisActuel.getMonth()]}
                </h2>
                <p className="text-white/40 text-xs sm:text-sm">{moisActuel.getFullYear()}</p>
              </div>
              <button
                onClick={allerMoisSuivant}
                className="w-12 h-12 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center transition text-xl sm:text-lg touch-manipulation"
                aria-label="Mois suivant"
              >
                ›
              </button>
            </div>

            {/* ✅ Bouton "Aujourd'hui" */}
            <div className="flex justify-center mb-4">
              <button
                onClick={allerAujourdhui}
                className="px-4 py-2 rounded-full bg-[#C8A84E]/20 hover:bg-[#C8A84E]/30 active:bg-[#C8A84E]/40 text-[#C8A84E] text-xs sm:text-sm font-medium transition touch-manipulation"
              >
                📅 Aujourd'hui
              </button>
            </div>

            {/* En-têtes jours semaine */}
            <div className="grid grid-cols-7 mb-2">
              {nomsJours.map((j) => (
                <div
                  key={j}
                  className="text-center text-[10px] sm:text-xs font-semibold text-white/30 py-2 uppercase tracking-widest"
                >
                  {j}
                </div>
              ))}
            </div>

            {/* Grille des jours */}
            <div ref={calendrierRef} className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {jours.map((jour, idx) => {
                if (jour === null) {
                  return <div key={idx} className="aspect-square" />
                }

                const { anniversaires, saintsAvecContact } = evenementsParJour.get(jour) || {
                  anniversaires: [],
                  saintsAvecContact: []
                }
                const isSelected = jourSelectionne?.jour === jour
                const isTodayDay = isToday(jour)
                const hasEvent = anniversaires.length > 0 || saintsAvecContact.length > 0

                return (
                  <button
                    key={idx}
                    onClick={() => handleClickJour(jour)}
                    className={`
                      aspect-square rounded-xl sm:rounded-2xl p-1 sm:p-1.5 flex flex-col items-center justify-start
                      transition-all duration-200 relative touch-manipulation
                      ${isSelected
                        ? 'bg-[#C8A84E]/30 border-2 border-[#C8A84E]/60 shadow-lg shadow-[#C8A84E]/20'
                        : isTodayDay
                        ? 'bg-white/10 border-2 border-white/30'
                        : hasEvent
                        ? 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:bg-white/15'
                        : 'border border-transparent hover:bg-white/5 active:bg-white/10'
                      }
                    `}
                    aria-label={`${jour} ${nomsMois[moisActuel.getMonth()]}${hasEvent ? ', événements' : ''}`}
                  >
                    {/* Numéro du jour */}
                    <span className={`
                      text-sm sm:text-base font-bold leading-none
                      ${isSelected ? 'text-[#C8A84E]'
                        : isTodayDay ? 'text-white'
                        : 'text-white/60'}
                    `}>
                      {jour}
                    </span>

                    {/* Indicateurs visuels */}
                    <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                      {saintsAvecContact.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C8A84E]" />
                      )}
                      {anniversaires.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Légende */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-400" />
                <span className="text-xs text-white/40">Anniversaire</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C8A84E]" />
                <span className="text-xs text-white/40">Fête prénomale</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/30" />
                <span className="text-xs text-white/40">Aujourd'hui</span>
              </div>
            </div>

          </div>
        </div>

        {/* ========== PANEL DROIT (Desktop) / BOTTOM SHEET (Mobile) ========== */}
        <>
          {/* Desktop : panel droit */}
          <div className="hidden lg:flex flex-col gap-4">
            {jourSelectionne && (
              <PanelDetailsJour
                jourSelectionne={jourSelectionne}
                saintsJourSelectionne={saintsJourSelectionne}
                anniversairesJourSelectionne={anniversairesJourSelectionne}
                saintsParJourMap={saintsParJourMap}
                prenomContacts={prenomContacts}
                saintConcerneUnContact={saintConcerneUnContact}
                normaliser={normaliser}
                couleurRelation={couleurRelation}
                nomsMois={nomsMois}
                onClose={() => setJourSelectionne(null)}
              />
            )}

            <PanelRecherche
              recherche={recherche}
              resultatsRecherche={resultatsRecherche}
              handleRecherche={handleRecherche}
              setMoisActuel={setMoisActuel}
              setJourSelectionne={setJourSelectionne}
              setRecherche={setRecherche}
              setResultatsRecherche={setResultatsRecherche}
              moisActuel={moisActuel}
            />
          </div>

          {/* Mobile : bottom sheet */}
          {jourSelectionne && showBottomSheet && (
            <div className="lg:hidden fixed inset-0 z-50 flex items-end">
              {/* Fond semi-transparent */}
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setShowBottomSheet(false)}
              />

              {/* Contenu du bottom sheet */}
              <div className="relative w-full bg-gray-900 rounded-t-3xl max-h-[80vh] overflow-y-auto animate-slide-up">
                <PanelDetailsJour
                  jourSelectionne={jourSelectionne}
                  saintsJourSelectionne={saintsJourSelectionne}
                  anniversairesJourSelectionne={anniversairesJourSelectionne}
                  saintsParJourMap={saintsParJourMap}
                  prenomContacts={prenomContacts}
                  saintConcerneUnContact={saintConcerneUnContact}
                  normaliser={normaliser}
                  couleurRelation={couleurRelation}
                  nomsMois={nomsMois}
                  onClose={() => {
                    setShowBottomSheet(false)
                    setJourSelectionne(null)
                  }}
                />
              </div>
            </div>
          )}
        </>

        {/* Recherche (toujours visible sur mobile) */}
        <div className="lg:hidden">
          <PanelRecherche
            recherche={recherche}
            resultatsRecherche={resultatsRecherche}
            handleRecherche={handleRecherche}
            setMoisActuel={setMoisActuel}
            setJourSelectionne={setJourSelectionne}
            setRecherche={setRecherche}
            setResultatsRecherche={setResultatsRecherche}
            moisActuel={moisActuel}
          />
        </div>
      </div>

      {/* ✅ Animation CSS pour le bottom sheet */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

// ── Composant : Panel Détails du Jour ────────────────────────────────────────
function PanelDetailsJour({
  jourSelectionne,
  saintsJourSelectionne,
  anniversairesJourSelectionne,
  saintsParJourMap,
  prenomContacts,
  saintConcerneUnContact,
  normaliser,
  couleurRelation,
  nomsMois,
  onClose,
}: {
  jourSelectionne: NonNullable<JourSelectionne>
  saintsJourSelectionne: Saint[]
  anniversairesJourSelectionne: Contact[]
  saintsParJourMap: Map<string, Saint>
  prenomContacts: Set<string>
  saintConcerneUnContact: (saint: Saint) => boolean
  normaliser: (texte: string) => string
  couleurRelation: Record<string, string>
  nomsMois: string[]
  onClose: () => void
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-base">
          {jourSelectionne.jour} {nomsMois[jourSelectionne.mois - 1]}
        </h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white/50 hover:text-white flex items-center justify-center transition touch-manipulation"
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>

      {saintsJourSelectionne.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
            ✨ Fêtes du jour
          </p>
          <div className="space-y-2">
            {saintsJourSelectionne.map((saint, idx) => {
              const aUnContact = saintConcerneUnContact(saint)
              const prenomsContacts = saint.prenoms.filter(p =>
                prenomContacts.has(normaliser(p))
              )
              return (
                <div
                  key={idx}
                  className={`rounded-2xl p-3 border ${
                    aUnContact
                      ? 'bg-[#C8A84E]/10 border-[#C8A84E]/20'
                      : 'bg-white/5 border-white/5'
                  }`}
                >
                  <p className={`text-sm font-medium ${aUnContact ? 'text-white/80' : 'text-white/40'}`}>
                    {saint.nomSaint}
                  </p>
                  <p className={`text-xs mt-0.5 ${aUnContact ? 'text-[#C8A84E]' : 'text-white/25'}`}>
                    {saint.prenoms.join(', ')}
                  </p>
                  {aUnContact && (
                    <p className="text-xs text-[#C8A84E] mt-1 font-semibold">
                      👤 {prenomsContacts.join(', ')} dans vos contacts
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {anniversairesJourSelectionne.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
            🎂 Anniversaires
          </p>
          <div className="space-y-2">
            {anniversairesJourSelectionne.map((contact, idx) => (
              <div key={idx} className="bg-pink-500/10 border border-pink-500/20 rounded-2xl p-3">
                <p className="text-white/80 text-sm font-medium">
                  {contact.prenom} {contact.nom}
                </p>
                <p className={`text-xs mt-0.5 capitalize ${couleurRelation[contact.relation] || 'text-white/40'}`}>
                  {contact.relation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {saintsJourSelectionne.filter(saintConcerneUnContact).length === 0 &&
       anniversairesJourSelectionne.length === 0 && (
        <p className="text-white/30 text-sm text-center py-4">Aucun événement ce jour</p>
      )}
    </div>
  )
}

// ── Composant : Panel Recherche ──────────────────────────────────────────────
function PanelRecherche({
  recherche,
  resultatsRecherche,
  handleRecherche,
  setMoisActuel,
  setJourSelectionne,
  setRecherche,
  setResultatsRecherche,
  moisActuel,
}: {
  recherche: string
  resultatsRecherche: Saint[]
  handleRecherche: (e: React.ChangeEvent<HTMLInputElement>) => void
  setMoisActuel: (date: Date) => void
  setJourSelectionne: (jour: JourSelectionne) => void
  setRecherche: (value: string) => void
  setResultatsRecherche: (value: Saint[]) => void
  moisActuel: Date
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-sm">
      <h3 className="text-white font-bold text-base mb-4">🔍 Chercher une fête</h3>

      <input
        type="text"
        placeholder="Tape un prénom..."
        value={recherche}
        onChange={handleRecherche}
        className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white
          placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-transparent
          transition"
        aria-label="Rechercher une fête par prénom"
      />

      {resultatsRecherche.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-white/30 mb-3">
            {resultatsRecherche.length} résultat{resultatsRecherche.length > 1 ? 's' : ''}
          </p>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
            {resultatsRecherche.map((saint, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const [mm, dd] = saint.date.split('-').map(Number)
                  setMoisActuel(new Date(moisActuel.getFullYear(), mm - 1))
                  setJourSelectionne({
                    jour: dd,
                    mois: mm,
                    annee: moisActuel.getFullYear()
                  })
                  setRecherche('')
                  setResultatsRecherche([])
                }}
                className="w-full text-left bg-white/5 border border-white/10 hover:border-[#C8A84E]/40 hover:bg-[#C8A84E]/10
                  active:bg-[#C8A84E]/20 rounded-2xl p-3 transition-all touch-manipulation"
              >
                <p className="text-white/80 text-sm font-medium">{saint.nomSaint}</p>
                <p className="text-purple-300 text-xs mt-0.5">{saint.prenoms.join(', ')}</p>
                <p className="text-white/30 text-xs mt-1">
                  📅 {saint.date.split('-').reverse().join('/')}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {recherche.trim().length > 0 && resultatsRecherche.length === 0 && (
        <p className="text-white/30 text-sm text-center py-4">
          Aucun résultat pour "{recherche}"
        </p>
      )}

      {recherche.trim().length === 0 && (
        <p className="text-white/20 text-xs text-center py-4">
          Commence à taper un prénom…
        </p>
      )}
    </div>
  )
}