'use client'
import { useContacts } from '@/lib/hooks/useContacts'
import LoadFailure from '@/components/LoadFailure'
import { usePrivateLists } from '@/lib/hooks/usePrivateLists'
import { ListSelector, ManageLists } from '@/components/PrivateLists'
import PersonalDates from '@/components/PersonalDates'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TYPES_RELATION } from '@/lib/constants'
import { useDrawer } from '@/components/DrawerContext'
import { useContactFilters } from '@/lib/hooks/useContactFilters'
import AlphabetScrollbar from '@/components/AlphabetScrollbar'
import { contactsScrollOffset, useAlphabetLetters } from '@/lib/hooks/useAlphabetLetters'
import { contactLetter } from '@/lib/contact-alphabet'

type Contact = import('@/types/database').Contact

type ContactAvecLien = Contact & {
  estLie: boolean
}

export default function ContactsPage() {
  const router = useRouter()
  const { contacts: rows, loading, error: listError, retry } = useContacts()
  const lists = usePrivateLists()
  const contacts = useMemo(() => rows.map(contact => ({ ...contact, estLie: false })), [rows])
  const { ouvrirDrawer } = useDrawer()
  const [activeLetter, setActiveLetter] = useState<string | null>(null)

  const {
    recherche,
    setRecherche,
    triPar,
    setTriPar,
    filtreRelation,
    setFiltreRelation,
    favorisUniquement,
    setFavorisUniquement,
    contactsFiltres,
  } = useContactFilters(lists.filter(contacts))

  // Reference pour la liste de contacts (pour le scroll)
  const listRef = useRef<HTMLDivElement>(null)

  // Calcul des lettres pour la reglette alphabetique
  const { letters, scrollToLetter } = useAlphabetLetters(contactsFiltres, triPar)

  // Appui ou glissement sur la réglette.
  const handleLetterClick = useCallback((letter: string, behavior: ScrollBehavior = 'smooth') => {
    setActiveLetter(letter)
    scrollToLetter(letter, listRef, behavior)
  }, [scrollToLetter])

  // Garder la lettre active en phase avec le défilement manuel et les filtres.
  useEffect(() => {
    if (loading) return
    const elements = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-letter]') ?? [])
    let frame = 0
    const update = () => {
      frame = 0
      const offset = contactsScrollOffset()
      let current: string | null = null
      for (const element of elements) {
        if (element.getBoundingClientRect().top > offset + 1) break
        current = element.dataset.letter || null
      }
      if (!current) current = elements[0]?.dataset.letter || null
      // En bas de page, la dernière carte ne peut pas toujours atteindre l'en-tête.
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        current = elements.at(-1)?.dataset.letter || null
      }
      setActiveLetter(current)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [contactsFiltres, loading, triPar])

  // Charger les contacts


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

  if (listError) return <LoadFailure message={listError} retry={retry} />
  if (lists.error) return <LoadFailure message={lists.error} retry={lists.retry} />

  // Etat de chargement
  if (loading || lists.loading) {
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
    <div className="min-h-screen w-full min-w-0 max-w-full overflow-x-clip px-3 pt-4 pb-28 sm:px-4 md:px-8 md:pt-8">

      <div className={`mx-auto w-full min-w-0 max-w-2xl ${letters.length > 1 ? 'pr-11' : ''}`}>
        {/* EN-TETE */}
        <div className="mb-4">
          {/* Titre + compteur */}
          <h1 className="text-xl font-bold text-ink mb-3">
            📒 Mes contacts <span className="text-sm font-normal text-info">({contacts.length})</span>
          </h1>

          {/* Recherche discrète, avec un fond transparent. */}
          <div className="relative mb-2 w-full max-w-xs">
            <svg aria-hidden="true" className="pointer-events-none absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" />
            </svg>
            <input
              type="search"
              aria-label="Rechercher un contact"
              placeholder="Rechercher…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="h-9 w-full rounded-none border-0 border-b border-line/60 bg-transparent py-1 pl-7 pr-2 text-base text-ink placeholder-muted focus:border-accent focus:outline-none"
            />
          </div>

          {/* Filtres par relation - boutons horizontaux defilants */}
          <div className="flex w-full min-w-0 max-w-full gap-2 overflow-x-auto pb-1 scrollbar-hide mb-3">
            <button
              onClick={() => setFiltreRelation('tous')}
              className={`min-h-11 shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
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
                  className={`min-h-11 shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
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

          <label className="mb-3 flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={favorisUniquement}
              onChange={(event) => setFavorisUniquement(event.target.checked)}
              className="h-5 w-5 accent-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            Favoris uniquement
          </label>
          <div className="mb-3 flex flex-wrap items-end gap-3"><ListSelector state={lists} /><ManageLists state={lists} contacts={rows} /><PersonalDates contacts={rows} onSaved={retry} /></div>

          {/* Tri + Boutons d'action */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative min-w-0 max-w-full">
              <svg aria-hidden="true" className="pointer-events-none absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5v14m-3-3 3 3 3-3M10 6h11M10 12h8M10 18h5" />
              </svg>
              <select
                value={triPar}
                onChange={(e) => setTriPar(e.target.value as 'nom' | 'prenom')}
                aria-label="Trier les contacts"
                title={`Trier par ${triPar === 'nom' ? 'nom' : 'prénom'}`}
                className="min-h-11 min-w-0 max-w-full appearance-none rounded-lg border-0 bg-transparent py-1 pl-7 pr-6 text-base text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                <option value="nom">Nom</option>
                <option value="prenom">Prénom</option>
              </select>
              <svg aria-hidden="true" className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>

            <div className="flex gap-2">
              <Link
                href="/dashboard/contacts/nouveau"
                className="flex min-h-11 min-w-11 items-center justify-center bg-gradient-to-r from-action to-action/80 text-on-action font-bold text-xs px-3 py-2 rounded-xl transition shadow-lg hover:shadow-xl active:scale-95"
                title="Ajout rapide"
                aria-label="Ajouter rapidement des contacts"
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
                href="/dashboard/contacts/nouveau"
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
              Aucun contact ne correspond à tes filtres.
            </p>
          </div>
        ) : (
          <div 
            ref={listRef}
            className="relative w-full min-w-0 max-w-full"
          >
            <div className="grid min-w-0 grid-cols-1 gap-2">
              {contactsFiltres.map((contact) => {
                const firstLetter = contactLetter(contact, triPar)
                
                return (
                  <div
                    key={contact.id}
                    data-letter={firstLetter}
                    onClick={() => ouvrirDrawer(contact)}
                    className={`group flex w-full min-w-0 max-w-full items-center gap-1.5 rounded-xl border bg-ink/5 px-2 py-1.5 sm:gap-3 sm:px-3 sm:py-2 cursor-pointer transition-colors ${
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
                      <div className={`relative h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors z-10 ${
                        contact.est_favori 
                          ? 'bg-canvas text-accent border-canvas' 
                          : 'bg-indigo-500/20 text-ink border-indigo-400/30'
                      }`}>
                        {getInitiales(contact)}
                      </div>
                    </div>

                    {/* Infos principales */}
                    <div className="flex-1 min-w-0">
                      <p title={getNomComplet(contact)} className={`truncate text-sm font-semibold leading-5 ${
                        contact.est_favori ? 'text-accent' : 'text-ink'
                      }`}>
                        {getNomComplet(contact)}
                      </p>
                      <div className="mt-0.5 flex min-w-0 items-center gap-1">
                        <span title={getRelationLabel(contact.relation)} className={`min-w-0 truncate rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-4 capitalize ${couleurRelation(contact.relation)}`}>
                          {getRelationLabel(contact.relation)}
                        </span>
                        {contact.date_naissance && (
                          <span className="shrink-0 text-info" title="Anniversaire" aria-label="Anniversaire renseigné" role="img">
                            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 21v-9h14v9M3 21h18M5 16c2 2 3-2 5 0s3-2 5 0 3-2 4 0M8 12V8m4 4V8m4 4V8M8 5V3m4 2V3m4 2V3" />
                            </svg>
                          </span>
                        )}
                        {contact.estLie && (
                          <span className="shrink-0 text-success" title="Contact lié" aria-label="Contact lié" role="img">
                            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                              <path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Icônes contrastées ; cibles tactiles de 44 px sur tous les écrans. */}
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        onClick={(e) => { 
                          e.stopPropagation()
                          router.push(`/dashboard/generate?contactId=${contact.id}`)
                        }}
                        type="button"
                        aria-label={`Générer un message pour ${getNomComplet(contact)}`}
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-canvas text-info transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                        title="Générer un message"
                      >
                        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 3v4m-2-2h4" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation()
                          router.push(`/dashboard/contacts/${contact.id}/edit`)
                        }}
                        type="button"
                        aria-label={`Modifier ${getNomComplet(contact)}`}
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-canvas text-accent transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                        title="Modifier"
                      >
                        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z" />
                        </svg>
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
            key={`${triPar}:${letters.join('')}`}
            listRef={listRef}
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
        aria-label="Ajouter un contact"
        className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 sm:bottom-8 sm:left-auto sm:right-8 sm:translate-x-0 z-30"
      >
        <span
          className="w-14 h-14 sm:w-12 sm:h-12 rounded-full bg-action text-on-action text-2xl font-bold shadow-2xl hover:shadow-action/50 transition-all active:scale-95 flex items-center justify-center"
          aria-hidden="true"
        >
          +
        </span>
      </Link>
    </div>
  )
}
