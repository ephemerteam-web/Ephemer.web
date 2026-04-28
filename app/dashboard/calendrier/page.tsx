'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SAINTS } from '@/lib/saints'
import { supabase } from '@/lib/supabase'

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

export default function CalendrierPage() {
  const router = useRouter()
  const [moisActuel, setMoisActuel] = useState(new Date())
  const [recherche, setRecherche] = useState('')
  const [resultatsRecherche, setResultatsRecherche] = useState<any[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [jourSelectionne, setJourSelectionne] = useState<JourSelectionne>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/connexion'); return }
      const { data, error } = await supabase
        .from('contacts').select('*').eq('user_id', session.user.id)
      if (!error && data) setContacts(data as Contact[])
    }
    init()
  }, [router])

  const normaliser = (texte: string) =>
    texte.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const handleRecherche = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setRecherche(value)
    if (value.trim().length > 0) {
      const valueNorm = normaliser(value)
      setResultatsRecherche(
        SAINTS.filter((saint) =>
          saint.prenoms.some((p) => normaliser(p).includes(valueNorm))
        )
      )
    } else {
      setResultatsRecherche([])
    }
  }

  const jours = useMemo(() => {
    const mois = moisActuel.getMonth()
    const annee = moisActuel.getFullYear()
    const nbJours = new Date(annee, mois + 1, 0).getDate()
    const premierJour = new Date(annee, mois, 1).getDay()
    const list = []
    for (let i = 0; i < premierJour; i++) list.push(null)
    for (let j = 1; j <= nbJours; j++) list.push(j)
    return list
  }, [moisActuel])

  const obtenirSaintsDuJour = (jour: number, mois: number) => {
    const dateKey = `${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`
    return SAINTS.filter((s) => s.date === dateKey)
  }

  const prenomContacts = useMemo(
    () => new Set(contacts.map((c) => normaliser(c.prenom))),
    [contacts]
  )

  const saintConcerneUnContact = (saint: { prenoms: string[] }) =>
    saint.prenoms.some((p) => prenomContacts.has(normaliser(p)))

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

  const allerMoisPrecedent = () =>
    setMoisActuel(new Date(moisActuel.getFullYear(), moisActuel.getMonth() - 1))
  const allerMoisSuivant = () =>
    setMoisActuel(new Date(moisActuel.getFullYear(), moisActuel.getMonth() + 1))

  const nomsMois = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  const nomsJours = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']

  const handleClickJour = (jour: number) =>
    setJourSelectionne({ jour, mois: moisActuel.getMonth() + 1, annee: moisActuel.getFullYear() })

  const saintsJourSelectionne = jourSelectionne
    ? obtenirSaintsDuJour(jourSelectionne.jour, jourSelectionne.mois)
    : []
  const anniversairesJourSelectionne = jourSelectionne
    ? anniversairesParJour[jourSelectionne.jour] || []
    : []

  const today = new Date()
  const isToday = (jour: number) =>
    jour === today.getDate() &&
    moisActuel.getMonth() === today.getMonth() &&
    moisActuel.getFullYear() === today.getFullYear()

  const couleurRelation: Record<string, string> = {
    famille: 'text-pink-400',
    amis: 'text-blue-400',
    pro: 'text-amber-400',
  }

  return (
    <div className="max-w-6xl mx-auto">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ========== CALENDRIER ========== */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">

            {/* En-tête navigation */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={allerMoisPrecedent}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-lg"
              >
                ‹
              </button>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">
                  {nomsMois[moisActuel.getMonth()]}
                </h2>
                <p className="text-white/40 text-sm">{moisActuel.getFullYear()}</p>
              </div>
              <button
                onClick={allerMoisSuivant}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-lg"
              >
                ›
              </button>
            </div>

            {/* En-têtes jours semaine */}
            <div className="grid grid-cols-7 mb-2">
              {nomsJours.map((j) => (
                <div key={j} className="text-center text-xs font-semibold text-white/30 py-2 uppercase tracking-widest">
                  {j}
                </div>
              ))}
            </div>

            {/* Grille des jours */}
            <div className="grid grid-cols-7 gap-1.5">
              {jours.map((jour, idx) => {
                if (jour === null) {
                  return <div key={idx} className="aspect-square" />
                }

                const anniversaires = anniversairesParJour[jour] || []
                const saints = obtenirSaintsDuJour(jour, moisActuel.getMonth() + 1)
                const saintsAvecContact = saints.filter(saintConcerneUnContact)
                const isSelected = jourSelectionne?.jour === jour
                const isTodayDay = isToday(jour)
                const hasEvent = anniversaires.length > 0 || saintsAvecContact.length > 0

                return (
                  <div
                    key={idx}
                    onClick={() => handleClickJour(jour)}
                    className={`
                      aspect-square rounded-2xl p-1.5 flex flex-col items-center justify-start
                      cursor-pointer transition-all duration-200 relative group
                      ${isSelected
                        ? 'bg-purple-500/30 border border-purple-400/60 shadow-lg shadow-purple-900/30'
                        : isTodayDay
                        ? 'bg-white/10 border border-white/30'
                        : hasEvent
                        ? 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                        : 'border border-transparent hover:bg-white/5'
                      }
                    `}
                  >
                    {/* ✅ Chiffre agrandi : text-sm → text-base */}
                    <span className={`
                      text-base font-bold leading-none mt-0.5
                      ${isSelected ? 'text-purple-200'
                        : isTodayDay ? 'text-white'
                        : 'text-white/60'}
                    `}>
                      {jour}
                    </span>

                    {/* Indicateurs visuels */}
                    <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                      {saintsAvecContact.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" title="Fête prénomale d'un contact" />
                      )}
                      {anniversaires.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-400" title="Anniversaire" />
                      )}
                    </div>

                    {/* Tooltip au hover */}
                    {hasEvent && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="bg-gray-900 border border-white/20 rounded-xl p-2 text-xs whitespace-nowrap shadow-xl">
                          {anniversaires.map((c, i) => (
                            <p key={i} className={`font-semibold ${couleurRelation[c.relation] || 'text-white'}`}>
                              🎂 {c.prenom} {c.nom}
                            </p>
                          ))}
                          {saintsAvecContact.map((s, i) => (
                            <p key={i} className="text-purple-300">
                              ✨ Fête de {s.prenoms.filter(p => prenomContacts.has(normaliser(p))).join(', ')}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Légende */}
            <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-400" />
                <span className="text-xs text-white/40">Anniversaire</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-xs text-white/40">Fête prénomale</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/30" />
                <span className="text-xs text-white/40">Aujourd'hui</span>
              </div>
            </div>

          </div>
        </div>

        {/* ========== PANEL DROIT ========== */}
        <div className="flex flex-col gap-4">

          {/* Détails du jour sélectionné */}
          {jourSelectionne && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-base">
                  {jourSelectionne.jour} {nomsMois[jourSelectionne.mois - 1]}
                </h3>
                <button
                  onClick={() => setJourSelectionne(null)}
                  className="text-white/30 hover:text-white/70 transition text-lg"
                >
                  ✕
                </button>
              </div>

              {saintsJourSelectionne.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">✨ Fêtes du jour</p>
                  <div className="space-y-2">
                    {saintsJourSelectionne.map((saint, idx) => {
                      const aUnContact = saintConcerneUnContact(saint)
                      const prenomsContacts = saint.prenoms.filter(p => prenomContacts.has(normaliser(p)))
                      return (
                        <div
                          key={idx}
                          className={`rounded-2xl p-3 border ${
                            aUnContact
                              ? 'bg-purple-500/10 border-purple-500/20'
                              : 'bg-white/5 border-white/5'
                          }`}
                        >
                          <p className={`text-sm font-medium ${aUnContact ? 'text-white/80' : 'text-white/40'}`}>
                            {saint.nomSaint}
                          </p>
                          <p className={`text-xs mt-0.5 ${aUnContact ? 'text-purple-300' : 'text-white/25'}`}>
                            {saint.prenoms.join(', ')}
                          </p>
                          {aUnContact && (
                            <p className="text-xs text-purple-400 mt-1 font-semibold">
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
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">🎂 Anniversaires</p>
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
          )}

          {/* Recherche de fête */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-sm sticky top-6">
            <h3 className="text-white font-bold text-base mb-4">🔍 Chercher une fête</h3>

            <input
              type="text"
              placeholder="Tape un prénom..."
              value={recherche}
              onChange={handleRecherche}
              className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white
                placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                transition mb-4"
            />

            {resultatsRecherche.length > 0 && (
              <div>
                <p className="text-xs text-white/30 mb-3">{resultatsRecherche.length} résultat(s)</p>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                  {resultatsRecherche.map((saint, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        const [mm, dd] = saint.date.split('-').map(Number)
                        setMoisActuel(new Date(moisActuel.getFullYear(), mm - 1))
                        setJourSelectionne({ jour: dd, mois: mm, annee: moisActuel.getFullYear() })
                        setRecherche('')
                        setResultatsRecherche([])
                      }}
                      className="bg-white/5 border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/10
                        rounded-2xl p-3 cursor-pointer transition-all"
                    >
                      <p className="text-white/80 text-sm font-medium">{saint.nomSaint}</p>
                      <p className="text-purple-300 text-xs mt-0.5">{saint.prenoms.join(', ')}</p>
                      <p className="text-white/30 text-xs mt-1">
                        📅 {saint.date.split('-').reverse().join('/')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recherche.trim().length > 0 && resultatsRecherche.length === 0 && (
              <p className="text-white/30 text-sm text-center py-4">Aucun résultat pour "{recherche}"</p>
            )}

            {recherche.trim().length === 0 && (
              <p className="text-white/20 text-xs text-center py-4">Commence à taper un prénom…</p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
