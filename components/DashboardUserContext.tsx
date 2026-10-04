'use client'
// 👤 Identité vérifiée une fois par le layout. Ce contexte ne remplace pas les contrôles serveur.
import { createContext, useContext } from 'react'
export type DashboardUser = { id: string; email: string; prenom?: string }
export const DashboardUserContext = createContext<DashboardUser | null>(null)
export function useDashboardUser() {
  const user = useContext(DashboardUserContext)
  if (!user) throw new Error('Identité indisponible hors du dashboard')
  return user
}
