'use client'

import AppSelect from '@/components/AppSelect'
import { TYPES_RELATION } from '@/lib/constants'
import type { TriContact } from '@/lib/hooks/useContactFilters'

type Props = {
  recherche: string
  setRecherche: (value: string) => void
  triPar: TriContact
  setTriPar: (value: TriContact) => void
  filtreRelation: string
  setFiltreRelation: (value: string) => void
}

export default function ContactSearchFilters({
  recherche,
  setRecherche,
  triPar,
  setTriPar,
  filtreRelation,
  setFiltreRelation,
}: Props) {
  const triOptions = [
    { value: 'nom', label: 'Tri : Nom' },
    { value: 'prenom', label: 'Tri : Prénom' },
  ]

  const relationOptions = [
    { value: 'tous', label: 'Toutes relations' },
    ...TYPES_RELATION.map((type) => ({
      value: type.value,
      label: type.label,
    })),
  ]

  return (
    <div className="mb-4 space-y-3">
      <input
        type="text"
        placeholder="Rechercher un contact..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
      />

      <div className="flex gap-2 flex-wrap">
        <AppSelect
          options={triOptions}
          value={triPar}
          onChange={(value) => setTriPar(value as TriContact)}
        />

        <AppSelect
          options={relationOptions}
          value={filtreRelation}
          onChange={setFiltreRelation}
        />
      </div>
    </div>
  )
}
