'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// Type d'un contact (on reprend la même structure que dans ContactsPage)
export type ContactDrawer = {
  id: string
  nom: string
  prenom: string
  date_naissance: string | null
  relation: string
  email: string | null
  telephone_indicatif: string | null
  telephone_numero: string | null
  note: string | null
  est_favori: boolean | null
  estLie: boolean
  // Ajoute ici tous les champs que tu veux afficher dans le drawer
}

// Type du contexte (ce qu'on partage)
type DrawerContextType = {
  contactAffiche: ContactDrawer | null
  ouvrirDrawer: (contact: ContactDrawer) => void
  fermerDrawer: () => void
}

// On crée le contexte (vide au départ)
const DrawerContext = createContext<DrawerContextType | undefined>(undefined)

// Le Provider : c'est lui qui "fournit" le state à toute l'app
export function DrawerProvider({ children }: { children: ReactNode }) {
  const [contactAffiche, setContactAffiche] = useState<ContactDrawer | null>(null)

  const ouvrirDrawer = (contact: ContactDrawer) => setContactAffiche(contact)
  const fermerDrawer = () => setContactAffiche(null)

  return (
    <DrawerContext.Provider value={{ contactAffiche, ouvrirDrawer, fermerDrawer }}>
      {children}
    </DrawerContext.Provider>
  )
}

// Hook custom : pour utiliser le contexte facilement dans n'importe quel composant
export function useDrawer() {
  const context = useContext(DrawerContext)
  if (!context) {
    throw new Error('useDrawer doit être utilisé dans un <DrawerProvider>')
  }
  return context
}
