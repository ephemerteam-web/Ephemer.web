import { useMemo, useState } from 'react'

export type TriContact = 'nom' | 'prenom'

export type ContactFiltrable = {
  id: string
  nom: string
  prenom: string
  relation: string
  est_favori?: boolean | null
}

export function useContactFilters<T extends ContactFiltrable>(contacts: T[]) {
  const [recherche, setRecherche] = useState('')
  const [triPar, setTriPar] = useState<TriContact>('nom')
  const [filtreRelation, setFiltreRelation] = useState<string>('tous')

  const contactsFiltres = useMemo(() => {
    return [...contacts]
      .filter((contact) => {
        const texte = `${contact.prenom} ${contact.nom}`.toLowerCase()
        const rechercheNettoyee = recherche.trim().toLowerCase()

        const matchRecherche =
          rechercheNettoyee === '' || texte.includes(rechercheNettoyee)

        const matchRelation =
          filtreRelation === 'tous' || contact.relation === filtreRelation

        return matchRecherche && matchRelation
      })
      .sort((a, b) => {
        if (a.est_favori && !b.est_favori) return -1
        if (!a.est_favori && b.est_favori) return 1

        if (triPar === 'nom') {
          return a.nom.localeCompare(b.nom, 'fr')
        }

        return a.prenom.localeCompare(b.prenom, 'fr')
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
