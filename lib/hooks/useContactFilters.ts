import { useMemo, useState } from 'react'

export type TriContact = 'nom' | 'prenom'

export type ContactFiltrable = {
  id: string
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
        const relation = contact.relation ?? ''

        const texte = `${prenom} ${nom} ${relation}`.toLowerCase()
        const rechercheNettoyee = recherche.trim().toLowerCase()

        const matchRecherche =
          rechercheNettoyee === '' || texte.includes(rechercheNettoyee)

        const matchRelation =
          filtreRelation === 'tous' || relation === filtreRelation

        return matchRecherche && matchRelation
      })
      .sort((a, b) => {
        if (a.est_favori && !b.est_favori) return -1
        if (!a.est_favori && b.est_favori) return 1

        const prenomA = a.prenom ?? ''
        const prenomB = b.prenom ?? ''
        const nomA = a.nom ?? ''
        const nomB = b.nom ?? ''

        if (triPar === 'nom') {
          const comparaisonNom = nomA.localeCompare(nomB, 'fr', {
            sensitivity: 'base',
          })

          if (comparaisonNom !== 0) {
            return comparaisonNom
          }

          return prenomA.localeCompare(prenomB, 'fr', {
            sensitivity: 'base',
          })
        }

        const comparaisonPrenom = prenomA.localeCompare(prenomB, 'fr', {
          sensitivity: 'base',
        })

        if (comparaisonPrenom !== 0) {
          return comparaisonPrenom
        }

        return nomA.localeCompare(nomB, 'fr', {
          sensitivity: 'base',
        })
      })
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