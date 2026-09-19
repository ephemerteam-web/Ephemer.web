'use client'

import { useEffect } from 'react'

export default function PWARegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    let registration: ServiceWorkerRegistration | undefined
    let active = true
    void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(reg => { if (active) registration = reg })
      .catch(() => console.warn('Le mode hors ligne est indisponible.'))
    const check = () => {
      if (document.visibilityState === 'visible') void registration?.update().catch(() => {})
    }
    document.addEventListener('visibilitychange', check)
    return () => { active = false; document.removeEventListener('visibilitychange', check) }
  }, [])
  return null
}
