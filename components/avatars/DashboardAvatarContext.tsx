'use client'
// Un avatar enregistré partagé dans le dashboard ; aucun choix d’éditeur ni stockage navigateur.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { loadAvatar, type ProfileAvatar } from '@/lib/avatar-data'
import { avatarRenderConfig, recoverProfileRenderAvatar, type AvatarRenderConfig } from '@/lib/avatar-render-config'

type AvatarState = { config: AvatarRenderConfig | null; savedConfig: AvatarRenderConfig | null; updateAvatar: (row: ProfileAvatar | null) => void }
const DashboardAvatarContext = createContext<AvatarState>({ config: null, savedConfig: null, updateAvatar: () => {} })
export function useDashboardAvatar() { return useContext(DashboardAvatarContext) }

export default function DashboardAvatarProvider({ ownerId, children }: { ownerId: string; children: ReactNode }) {
  // Efface immédiatement l’apparence privée lors d’un changement de compte.
  return <AccountAvatar key={ownerId} ownerId={ownerId}>{children}</AccountAvatar>
}
export function AccountAvatar({ ownerId, children }: { ownerId: string; children: ReactNode }) {
  const [config, setConfig] = useState<AvatarRenderConfig | null>(null)
  const [savedConfig, setSavedConfig] = useState<AvatarRenderConfig | null>(null)
  const generation = useRef(0)
  const updateAvatar = useCallback((row: ProfileAvatar | null) => {
    if (row && row.user_id !== ownerId) return
    generation.current++
    setConfig(recoverProfileRenderAvatar(row?.configuration).config)
    // L'univers reçoit exclusivement un avatar enregistré valide, jamais le repli.
    let saved: AvatarRenderConfig | null = null
    try { if (row) saved = avatarRenderConfig(row.configuration) } catch { /* Initiale dans l'aperçu. */ }
    setSavedConfig(saved)
  }, [ownerId])
  useEffect(() => {
    let active = true
    async function refresh() {
      if (document.visibilityState === 'hidden' || navigator.onLine === false) return
      const request = ++generation.current
      try {
        const row = await loadAvatar(ownerId)
        if (active && request === generation.current) updateAvatar(row)
      } catch { if (active && request === generation.current) setSavedConfig(null) }
    }
    const stop = () => { generation.current++; setSavedConfig(null) }
    void refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh); window.addEventListener('offline', stop)
    document.addEventListener('visibilitychange', refresh)
    const timer = window.setInterval(refresh, 60000)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); window.removeEventListener('offline', stop); document.removeEventListener('visibilitychange', refresh) }
  }, [ownerId, updateAvatar])
  return <DashboardAvatarContext.Provider value={{ config, savedConfig, updateAvatar }}>{children}</DashboardAvatarContext.Provider>
}
