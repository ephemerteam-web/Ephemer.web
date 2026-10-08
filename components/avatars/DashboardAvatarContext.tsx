'use client'
// Un avatar enregistré partagé dans le dashboard ; aucun choix d’éditeur ni stockage navigateur.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { loadAvatar, type ProfileAvatar } from '@/lib/avatar-data'
import { recoverProfileRenderAvatar, type AvatarRenderConfig } from '@/lib/avatar-render-config'

type AvatarState = { config: AvatarRenderConfig | null; updateAvatar: (row: ProfileAvatar | null) => void }
const DashboardAvatarContext = createContext<AvatarState>({ config: null, updateAvatar: () => {} })
export function useDashboardAvatar() { return useContext(DashboardAvatarContext) }

export default function DashboardAvatarProvider({ ownerId, children }: { ownerId: string; children: ReactNode }) {
  // Efface immédiatement l’apparence privée lors d’un changement de compte.
  return <AccountAvatar key={ownerId} ownerId={ownerId}>{children}</AccountAvatar>
}
export function AccountAvatar({ ownerId, children }: { ownerId: string; children: ReactNode }) {
  const [config, setConfig] = useState<AvatarRenderConfig | null>(null)
  const generation = useRef(0)
  const updateAvatar = useCallback((row: ProfileAvatar | null) => {
    if (row && row.user_id !== ownerId) return
    generation.current++
    setConfig(recoverProfileRenderAvatar(row?.configuration).config)
  }, [ownerId])
  useEffect(() => {
    let active = true
    async function refresh() {
      const request = ++generation.current
      try {
        const row = await loadAvatar(ownerId)
        if (active && request === generation.current) updateAvatar(row)
      } catch { /* L’initiale reste disponible si la lecture échoue. Le profil propose une relecture. */ }
    }
    void refresh()
    window.addEventListener('focus', refresh)
    return () => { active = false; window.removeEventListener('focus', refresh) }
  }, [ownerId, updateAvatar])
  return <DashboardAvatarContext.Provider value={{ config, updateAvatar }}>{children}</DashboardAvatarContext.Provider>
}
