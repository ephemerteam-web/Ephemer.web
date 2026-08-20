// components/EvenementsMois.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase-browser'
import { useDrawer } from '@/components/DrawerContext'

// 📐 Types
interface EvenementContact {
  id: string
  prenom: string
  nom: string
  typeEvenement: 'anniversaire' | 'fete_prenomale'
  jour: number
  dateComplete: string
  emoji: string
}

// 🎨 Bouton de navigation avec animation (optimisé mobile)
const NavButton = ({
  children,
  onClick,
  disabled = false,
  className = ''
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-xl
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
      bg-gray-800/50 backdrop-blur-sm border border-white/10
      hover:bg-white/10 transition-all duration-200 ${className}`}
  >
    {children}
  </button>
)

export default function EvenementsMois() {
  // 📅 État
  const [evenements, setEvenements] = useState<EvenementContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mois, setMois] = useState<number>(new Date().getMonth())
  const [annee, setAnnee] = useState<number>(new Date().getFullYear())
  const [filtreType, setFiltreType] = useState<'tous' | 'anniversaire' | 'fete_prenomale'>('tous')
  const supabase = getSupabaseClient()
  

  const { ouvrirDrawer } = useDrawer()
  const nomsMois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

  // 🔄 Charger les événements
  const chargerEvenements = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) throw new Error('Non connecté')

      const response = await fetch(`/api/evenements-mois?mois=${mois}&annee=${annee}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      if (!response.ok) throw new Error(`Erreur API: ${response.status}`)
      const data = await response.json()
      setEvenements(data.evenements || [])
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les événements')
    } finally {
      setLoading(false)
    }
  }, [mois, annee])

  useEffect(() => { chargerEvenements() }, [chargerEvenements])

  // 🎨 Couleurs selon le type
  const getGradient = (type: string) =>
    type === 'anniversaire' ? 'from-emerald-500/20 to-emerald-600/10' : 'from-purple-500/20 to-purple-600/10'

  // 🔽 Filtrer les événements
  const evenementsFiltres = evenements.filter(e =>
    filtreType === 'tous' || e.typeEvenement === filtreType
  )

  // 📅 Navigation mois
  const moisSuivant = () => mois === 11 ? (setMois(0), setAnnee(a => a + 1)) : setMois(m => m + 1)
  const moisPrecedent = () => mois === 0 ? (setMois(11), setAnnee(a => a - 1)) : setMois(m => m - 1)
  const allerMoisActuel = () => {
    setMois(new Date().getMonth())
    setAnnee(new Date().getFullYear())
  }

  return (
    <div className="space-y-4">
      {/* 📅 EN-TÊTE (optimisé mobile) */}
      <div className="flex flex-col gap-3">
        {/* Titre + mois/année */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-[#C8A84E] to-[#A88B3E] rounded-xl">
            <span className="text-xl">📅</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Événements</h1>
            <p className="text-sm text-gray-400">
              <span className="text-[#C8A84E]">{nomsMois[mois]}</span> {annee}
            </p>
          </div>
        </div>

        {/* Contrôles (filtre + navigation) */}
        <div className="flex flex-wrap gap-2">
          {/* 🔍 Filtre sous forme d'onglets (meilleur pour mobile) */}
          <div className="flex gap-1 bg-gray-800/50 p-1 rounded-xl">
            {[
              { id: 'tous', label: 'Tous', emoji: '📅' },
              { id: 'anniversaire', label: 'Anniv.', emoji: '🎂' },
              { id: 'fete_prenomale', label: 'Fêtes', emoji: '🎉' }
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setFiltreType(option.id as 'tous' | 'anniversaire' | 'fete_prenomale')}
                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${filtreType === option.id
                    ? 'bg-[#C8A84E]/10 text-[#C8A84E] border border-[#C8A84E]/20'
                    : 'text-gray-400 hover:bg-white/5'}`}
              >
                <span>{option.emoji}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>

          {/* 📅 Navigation mois (boutons larges pour mobile) */}
          <div className="flex gap-1">
            <NavButton onClick={moisPrecedent}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </NavButton>
            <NavButton onClick={allerMoisActuel} className="min-w-[44px]">
              <span className="text-white text-xs">Auj.</span>
            </NavButton>
            <NavButton onClick={moisSuivant}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </NavButton>
          </div>
        </div>
      </div>

      {/* ⚠️ Message d'erreur */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* 🔄 Chargement */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div
            className="w-12 h-12 rounded-full bg-gradient-to-r from-[#C8A84E] to-[#A88B3E] animate-spin"
            style={{
              maskImage: 'linear-gradient(white, transparent)',
              WebkitMaskImage: 'linear-gradient(white, transparent)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor',
            }}
          />
          <p className="mt-3 text-gray-400 text-sm">Chargement...</p>
        </div>
      ) : (
        /* 📋 Liste des événements (optimisée mobile) */
        <div className="space-y-3">
          {evenementsFiltres.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-800/50 flex items-center justify-center">
                <span className="text-3xl">📅</span>
              </div>
              <p className="text-gray-500 text-sm">Aucun événement pour ce mois</p>
            </div>
          ) : (
            evenementsFiltres.map((evenement) => (
              <div
                key={`${evenement.id}-${evenement.typeEvenement}`}
                onClick={() => ouvrirDrawer({
                    id: evenement.id,
                    prenom: null,
                    nom: null,
                    date_naissance: null,
                    relation: null,
                    email: null,
                    est_favori: null,
                    telephone_indicatif: null,
                    telephone_numero: null,
                    note: null
                })}
                className="group p-4 rounded-xl border border-white/10 bg-gray-800/30 backdrop-blur-sm
                  hover:bg-gray-700/40 transition-all duration-200 cursor-pointer
                  active:scale-[0.98] touch-action-manipulation"
              >
                <div className="flex items-center gap-3">
                  {/* Emoji avec fond gradient */}
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${getGradient(evenement.typeEvenement)}`}>
                    <span className="text-xl">{evenement.emoji}</span>
                  </div>

                  {/* Infos (empilées verticalement sur mobile) */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-base font-semibold text-white truncate">
                        {evenement.prenom} <span className="text-gray-400">{evenement.nom}</span>
                      </h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                        ${evenement.typeEvenement === 'anniversaire'
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-purple-500/10 text-purple-300'}`}>
                        {evenement.typeEvenement === 'anniversaire' ? '🎂' : '🎉'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Le {evenement.jour} {nomsMois[mois]}
                    </p>
                  </div>

                  {/* Flèche de navigation (plus grande pour mobile) */}
                  <div className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-[#C8A84E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}