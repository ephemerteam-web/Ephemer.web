'use client'

import { useMemo, useCallback, RefObject } from 'react'
import type { TriContact } from './useContactFilters'

// Type générique pour un contact avec nom et prénom
type ContactWithName = {
  nom: string | null
  prenom: string | null
}

export function useAlphabetLetters(contacts: ContactWithName[], triPar: TriContact) {
  // Calculer les lettres présentes dans la liste filtrée
  const letters = useMemo(() => {
    const lettersSet = new Set<string>()
    
    contacts.forEach(contact => {
      // Déterminer le champ à utiliser selon le tri
      const text = triPar === 'nom' 
        ? (contact.nom ?? contact.prenom ?? '')
        : (contact.prenom ?? contact.nom ?? '')
      
      if (text.trim()) {
        // Récupérer la première lettre, majuscule
        const firstChar = text.trim().charAt(0).toUpperCase()
        // Normaliser : É → E, È → E, etc. (NFD décompose les accents)
        const normalized = firstChar.normalize('NFD').charAt(0)
        lettersSet.add(normalized)
      }
    })
    
    // Trier les lettres alphabétiquement
    return Array.from(lettersSet).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [contacts, triPar])
  
  // Fonction pour scroller vers la première occurrence d'une lettre
  const scrollToLetter = useCallback((letter: string, listRef: RefObject<HTMLDivElement | null>) => {
    if (!listRef.current) return
    
    const listElement = listRef.current
    // Trouver tous les éléments avec un attribut data-letter
    const contactElements = listElement.querySelectorAll('[data-letter]')
    
    const targetLetter = letter.normalize('NFD').charAt(0).toUpperCase()
    
    for (let element of contactElements) {
      const elementLetter = element.getAttribute('data-letter')?.normalize('NFD').charAt(0).toUpperCase()
      if (elementLetter === targetLetter) {
        // Scroll avec un petit offset pour éviter que l'en-tête ne cache le contact
        const offset = 20
        const elementPosition = element.getBoundingClientRect().top + window.scrollY - offset
        window.scrollTo({ top: elementPosition, behavior: 'smooth' })
        return
      }
    }
  }, [])
  
  return { letters, scrollToLetter }
}
