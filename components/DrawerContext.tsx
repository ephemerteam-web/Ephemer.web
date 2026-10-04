'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// Type correspondant à une ligne de la table "contacts"
// On rend optionnelles les colonnes non affichées pour faciliter l'usage
export type ContactDrawer = Omit<import('@/types/database').Contact, 'id' | 'created_at' | 'user_id' | 'invitation_id'> & {
  id: string | number
  created_at?: string
  user_id?: string | null
  estLie?: boolean
}


// Type du contexte partagé
type DrawerContextType = {
  contactAffiche: ContactDrawer | null
  ouvrirDrawer: (contact: ContactDrawer) => void
  fermerDrawer: () => void
}

// Contexte (vide au départ, rempli par le Provider)
const DrawerContext = createContext<DrawerContextType | undefined>(undefined)

// Provider : rend l'état accessible à tous les composants enfants
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

// Hook custom pour utiliser le contexte facilement
export function useDrawer() {
  const context = useContext(DrawerContext)
  if (!context) {
    throw new Error('useDrawer doit être utilisé dans un <DrawerProvider>')
  }
  return context
}
