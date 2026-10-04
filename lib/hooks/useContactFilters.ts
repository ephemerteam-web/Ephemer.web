import { normalizeRelation } from '../constants'
import { useMemo, useState } from 'react'
import { compareContactNames } from '@/lib/contact-alphabet'

export type TriContact = 'nom' | 'prenom'

export type ContactFiltrable = {
  id: string | number
  nom: string | null
  prenom: string | null
  relation: string | null
  est_favori?: boolean | null
}

export function useContactFilters<T extends ContactFiltrable>(contacts: T[]) {
  const [recherche, setRecherche] = useState('')
  const [triPar, setTriPar] = useState<TriContact>('nom')
  const [filtreRelation, setFiltreRelation] = useState<string>('tous')

  const contactsFiltres = useMemo(() => {
    return [...contacts]
      .filter((contact) => {
        const prenom = contact.prenom ?? ''
        const nom = contact.nom ?? ''
        const relation = normalizeRelation(contact.relation)

        const texte = `${prenom} ${nom} ${relation}`.toLowerCase()
        const rechercheNettoyee = recherche.trim().toLowerCase()

        const matchRecherche =
          rechercheNettoyee === '' || texte.includes(rechercheNettoyee)

        const matchRelation =
          filtreRelation === 'tous' || relation === filtreRelation

        return matchRecherche && matchRelation
      })
      .sort((a, b) => compareContactNames(a, b, triPar))
  }, [contacts, recherche, triPar, filtreRelation])

  return {
    recherche,
    setRecherche,
    triPar,
    setTriPar,
    filtreRelation,
    setFiltreRelation,
    contactsFiltres,
  }
}