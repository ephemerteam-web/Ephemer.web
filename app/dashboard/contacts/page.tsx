'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import Link from 'next/link'
import { TYPES_RELATION } from '@/lib/constants'
import { useDrawer } from '@/components/DrawerContext'
import { useContactFilters } from '@/lib/hooks/useContactFilters'
import AlphabetScrollbar from '@/components/AlphabetScrollbar'
import { useAlphabetLetters } from '@/lib/hooks/useAlphabetLetters'

type Contact = {
  id: string
  nom: string | null
  prenom: string | null
  date_naissance: string | null
  relation: string | null
  email: string | null
  telephone_indicatif: string | null
  telephone_numero: string | null
  note: string | null
  est_favori: boolean | null
}

type ContactAvecLien = Contact & {
  estLie: boolean
}

export default function ContactsPage() {
  const router = useRouter()
  const { ouvrirDrawer } = useDrawer()
  const [contacts, setContacts] = useState<ContactAvecLien[]>([])
  const [loading, setLoading] = useState(true)
  const [activeLetter, setActiveLetter] = useState<string | null>(null)

  const {
    recherche,
    setRecherche,
    triPar,
    setTriPar,
    filtreRelation,
    setFiltreRelation,
    contactsFiltres,
  } = useContactFilters(contacts)

  // Reference pour la liste de contacts (pour le scroll)
  const listRef = useRef<HTMLDivElement>(null)

  // Calcul des lettres pour la reglette alphabetique
  const { letters, scrollToLetter } = useAlphabetLetters(contactsFiltres, triPar)

  // Handler pour le clic sur une lettre de la reglette
  const handleLetterClick = useCallback((letter: string) => {
    setActiveLetter(letter)
    scrollToLetter(letter, listRef)
    // Reinitialiser apres un court delai
    setTimeout(() => setActiveLetter(null), 1500)
  }, [scrollToLetter])

  // Charger les contacts
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/connexion')
        return
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('nom', { ascending: true, nullsFirst: false })

      if (error) {
        console.error('Erreur chargement contacts :', error)
        setContacts([])
        setLoading(false)
        return
      }

      if (data) {
        const liste = data as Contact[]

        // Pour l'instant, on desactive la verification des contacts lies
        // car la RPC est_contact_lie n'est pas disponible
        // Tous les contacts sont marques comme non lies
        const avecLiens = liste.map(contact => ({
          ...contact,
          estLie: false
        }))

        setContacts(avecLiens)
      }

      setLoading(false)
    }

    init()
  }, [router])

  // Fonction pour obtenir la couleur d'un type de relation
  const couleurRelation = (relation: string | null) => {
    const relationSecurisee = relation ?? ''
    const config = TYPES_RELATION.find((t) => t.value === relationSecurisee)

    if (!config) {
      return 'bg-ink/10 text-info border border-line'
    }

    return config.couleur
  }

  // Obtenir le nom complet d'un contact
  const getNomComplet = (contact: ContactAvecLien) => {
    const prenom = contact.prenom?.trim() ?? ''
    const nom = contact.nom?.trim() ?? ''
    const nomComplet = `${prenom} ${nom}`.trim()

    return nomComplet || 'Contact sans nom'
  }

  // Obtenir les initiales pour l'avatar
  const getInitiales = (contact: ContactAvecLien) => {
    const premiereLettrePrenom = contact.prenom?.trim()?.[0] ?? ''
    const premiereLettreNom = contact.nom?.trim()?.[0] ?? ''
    const initiales = `${premiereLettrePrenom}${premiereLettreNom}`.trim()

    return initiales || '👤'
  }

  // Obtenir le label d'une relation
  const getRelationLabel = (relation: string | null) => {
    const relationSecurisee = relation?.trim()

    return relationSecurisee || 'non classée'
  }

  // Obtenir la premiere lettre pour la reglette (selon le tri)
  const getFirstLetter = (contact: ContactAvecLien) => {
    const text = triPar === 'nom' 
      ? (contact.nom ?? contact.prenom ?? '')
      : (contact.prenom ?? contact.nom ?? '')
    if (!text.trim()) return ''
    return text.trim().charAt(0).toUpperCase()
  }

  // Etat de chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <span className="text-6xl">📒</span>
          </div>
          <p className="text-info">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* EN-TETE */}
        <div className="mb-4">
          {/* Titre + compteur */}
          <h1 className="text-xl font-bold text-ink mb-3">
            📒 Mes contacts <span className="text-sm font-normal text-info">({contacts.length})</span>
          </h1>

          {/* Recherche */}
          <input
            type="text"
            placeholder="Rechercher un contact..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full rounded-xl bg-ink/5 border border-line px-4 py-2.5 text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/50 mb-3"
          />

          {/* Filtres par relation - boutons horizontaux defilants */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide mb-3">
            <button
              onClick={() => setFiltreRelation('tous')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filtreRelation === 'tous' 
                  ? 'bg-action text-on-action shadow-lg' 
                  : 'bg-ink/5 text-muted hover:bg-ink/10'
              }`}
            >
              Toutes
            </button>
            {TYPES_RELATION.map((type) => {
              // Extraire le style de couleur pour l'utiliser comme fond
              const couleurMatch = type.couleur.match(/bg-(\w+-\d+)/)
              const couleurFond = couleurMatch ? `bg-${couleurMatch[1]}` : 'bg-action'
              
              return (
                <button
                  key={type.value}
                  onClick={() => setFiltreRelation(type.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                    filtreRelation === type.value 
                      ? `${couleurFond} text-ink shadow-md` 
                      : 'bg-ink/5 text-muted hover:bg-ink/10'
                  }`}
                >
                  <span>{type.emoji}</span>
                  <span>{type.label}</span>
                </button>
              )
            })}
          </div>

          {/* Tri + Boutons d'action */}
          <div className="flex items-center justify-between gap-2">
            <select
              value={triPar}
              onChange={(e) => setTriPar(e.target.value as 'nom' | 'prenom')}
              className="bg-ink/5 border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent/50"
            >
              <option value="nom">Trier : Nom</option>
              <option value="prenom">Trier : Prénom</option>
            </select>

            <div className="flex gap-2">
              <Link
                href="/dashboard/contacts/rapide"
                className="bg-gradient-to-r from-action to-action/80 text-on-action font-bold text-xs px-3 py-2 rounded-xl transition shadow-lg hover:shadow-xl active:scale-95"
                title="Ajout rapide"
              >
                ⚡
              </Link>
              <Link
                href="/dashboard/contacts/nouveau"
                className="hidden sm:inline-block bg-ink/5 hover:bg-ink/10 border border-line text-ink font-bold text-xs px-3 py-2 rounded-xl transition"
              >
                + Nouveau
              </Link>
            </div>
          </div>
        </div>

        {/* LISTE DES CONTACTS */}
        {contacts.length === 0 ? (
          <div className="text-center mt-16">
            <span className="text-6xl mb-4 block">👥</span>
            <p className="text-info">Aucun contact pour le moment.</p>
            
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard/contacts/rapide"
                className="bg-gradient-to-r from-action to-action/80 text-on-action font-bold px-6 py-3 rounded-xl transition shadow-lg hover:shadow-xl active:scale-95"
              >
                ⚡ Ajout rapide
              </Link>
              <Link
                href="/dashboard/contacts/nouveau"
                className="bg-ink/5 hover:bg-ink/10 border border-line text-ink font-bold px-6 py-3 rounded-xl transition"
              >
                + Nouveau contact
              </Link>
            </div>
          </div>
        ) : contactsFiltres.length === 0 ? (
          <div className="text-center mt-16">
            <span className="text-6xl mb-4 block">🔍</span>
            <p className="text-info">
              Aucun contact ne correspond à ta recherche.
            </p>
          </div>
        ) : (
          <div 
            ref={listRef}
            className="relative"
          >
            <div className="grid gap-2">
              {contactsFiltres.map((contact, index) => {
                const firstLetter = getFirstLetter(contact)
                
                return (
                  <div
                    key={contact.id}
                    data-letter={firstLetter}
                    onClick={() => ouvrirDrawer(contact)}
                    className={`group bg-ink/5 border rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all ${
                      contact.est_favori 
                        ? 'border-accent/40 hover:border-accent/60' 
                        : 'border-line hover:border-line hover:bg-ink/10'
                    }`}
                  >
                    {/* Avatar avec cadre dore si favori */}
                    <div className="relative flex-shrink-0">
                      {contact.est_favori && (
                        <div className="absolute -inset-[2px] rounded-full bg-gradient-to-tr from-action via-action to-action border-2 border-canvas" />
                      )}
                      <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors z-10 ${
                        contact.est_favori 
                          ? 'bg-canvas text-accent border-canvas' 
                          : 'bg-indigo-500/20 text-ink border-indigo-400/30'
                      }`}>
                        {getInitiales(contact)}
                      </div>
                    </div>

                    {/* Infos principales */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${
                        contact.est_favori ? 'text-accent' : 'text-ink'
                      }`}>
                        {getNomComplet(contact)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${couleurRelation(contact.relation)}`}>
                          {getRelationLabel(contact.relation)}
                        </span>
                        {contact.date_naissance && (
                          <span className="text-muted text-sm" title="Anniversaire">🎂</span>
                        )}
                        {contact.estLie && (
                          <span className="text-xs bg-green-500/15 text-success border border-green-500/25 font-medium px-1.5 py-0.5 rounded-full" title="Lié">
                            🤝
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions - Visibles sur desktop, icones sur mobile */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => { 
                          e.stopPropagation()
                          router.push(`/dashboard/generate?contactId=${contact.id}`)
                        }}
                        className="hidden sm:inline-block text-xs text-info hover:text-ink font-medium border border-indigo-400/30 px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition"
                        title="Générer un message"
                      >
                        ✨
                      </button>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation()
                          router.push(`/dashboard/contacts/${contact.id}/edit`)
                        }}
                        className="hidden sm:inline-block text-xs text-accent/70 hover:text-ink font-medium border border-accent/30 px-2 py-1 rounded-lg hover:bg-action/10 transition"
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      {/* Boutons mobiles - icones seulement */}
                      <button
                        onClick={(e) => { 
                          e.stopPropagation()
                          router.push(`/dashboard/generate?contactId=${contact.id}`)
                        }}
                        className="sm:hidden p-2 rounded-lg hover:bg-ink/10 transition text-info"
                        title="Générer"
                        aria-label="Générer un message"
                      >
                        ✨
                      </button>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation()
                          router.push(`/dashboard/contacts/${contact.id}/edit`)
                        }}
                        className="sm:hidden p-2 rounded-lg hover:bg-ink/10 transition text-accent/70"
                        title="Modifier"
                        aria-label="Modifier le contact"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* REGLETTE ALPHABETIQUE */}
        {/* Afficher uniquement si tri alphabetique et assez de lettres */}
        {(triPar === 'nom' || triPar === 'prenom') && letters.length > 1 && (
          <AlphabetScrollbar
            letters={letters}
            activeLetter={activeLetter}
            onLetterClick={handleLetterClick}
            triPar={triPar}
          />
        )}
      </div>

      {/* BOUTON FLOTTANT + */}
      <Link
        href="/dashboard/contacts/nouveau"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:bottom-8 sm:left-auto sm:right-8 sm:translate-x-0 z-30"
      >
        <button 
          className="w-14 h-14 sm:w-12 sm:h-12 rounded-full bg-action text-on-action text-2xl font-bold shadow-2xl hover:shadow-action/50 transition-all active:scale-95 flex items-center justify-center"
          aria-label="Ajouter un contact"
        >
          +
        </button>
      </Link>
    </div>
  )
}
