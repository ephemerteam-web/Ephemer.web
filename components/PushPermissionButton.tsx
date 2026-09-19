"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { useBrowserValue } from '@/lib/hooks/useBrowserValue'
import { findPushDevice, savePushDevice, removePushDevice } from '@/lib/push-device'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
type PushStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported' | 'error'

export default function PushPermissionButton() {
  const [savedStatus, setStatus] = useState<PushStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const supported = useBrowserValue(() => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window, false)
  const ready = useBrowserValue(() => true, false)
  const status = !ready ? 'loading' : !supported ? 'unsupported' : savedStatus

  useEffect(() => {
    if (!supported) return
    let active = true
    const check = async () => {
      const reg = await navigator.serviceWorker.getRegistration('/')
      const sub = await reg?.pushManager.getSubscription()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      const rows = user && sub ? await findPushDevice(user.id, sub.endpoint) : []
      if (active) setStatus(Notification.permission === 'denied' ? 'denied' : sub && rows.length ? 'granted' : 'idle')
    }
    void check().catch(() => { if (active) { setStatus('error'); setErrorMsg('Impossible de vérifier cet appareil.') } })
    return () => { active = false }
  }, [supported])

  async function subscribeUser() {
    if (!supported) return
    setStatus('loading'); setErrorMsg(null)
    try {
      if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.includes('REMPLACE')) throw new Error('Activation indisponible : configuration push manquante.')
      // La demande de permission reste directement liée au clic sur iOS.
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus(permission === 'denied' ? 'denied' : 'idle'); return }
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw new Error('Reconnecte-toi pour enregistrer cet appareil.')
      await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      const reg = await new Promise<ServiceWorkerRegistration>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Le mode application ne répond pas. Recharge la page puis réessaie.')), 15_000)
        navigator.serviceWorker.ready.then(
          registration => { clearTimeout(timer); resolve(registration) },
          error => { clearTimeout(timer); reject(error) }
        )
      })
      let sub = await reg.pushManager.getSubscription()
      // Une ancienne liaison non accessible par RLS peut appartenir à un autre compte.
      // Invalider cet endpoint avant d'en créer un pour le compte courant.
      if (sub && !(await findPushDevice(user.id, sub.endpoint)).length) {
        if (!await sub.unsubscribe()) throw new Error('Impossible de renouveler cet appareil.')
        sub = null
      }
      sub = sub || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) })
      await savePushDevice(user.id, sub)
      setStatus('granted')
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Activation impossible. Réessaie.')
      setStatus('error')
    }
  }

  async function unsubscribeUser() {
    setStatus('loading'); setErrorMsg(null)
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw new Error('Reconnecte-toi pour désactiver cet appareil.')
      const reg = await navigator.serviceWorker.getRegistration('/')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) await removePushDevice(user.id, sub)
      setStatus('idle')
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Désactivation impossible.')
      setStatus('error')
    }
  }

  if (status === "unsupported") {
    return (
      <div className="mt-2 p-3 bg-gray-700/30 rounded-lg">
        <p className="text-gray-400 text-xs">
          ⚠️ Ton navigateur ne supporte pas les notifications push
        </p>
      </div>
    )
  }

  if (status === "denied") {
    return (
      <div className="mt-2 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
        <p className="text-red-300 text-xs font-medium">❌ Notifications bloquées</p>
        (Chrome : cadenas à gauche de l&apos;adresse • Safari : Préférences {'>'} Sites web)
      </div>
    )
  }

  if (status === "loading") {
    return (
      <div className="mt-2 flex items-center gap-2 text-[#C8A84E]">
        <div className="w-4 h-4 border-2 border-[#C8A84E]/30 border-t-[#C8A84E] rounded-full animate-spin" />
        <span className="text-xs">Vérification en cours...</span>
      </div>
    )
  }

  if (status === "granted") {
    return (
      <div className="mt-2">
        <div className="flex items-center gap-2 text-green-400 text-xs mb-2">
          <span>✅</span>
          <span>Appareil enregistré</span>
        </div>
        <button
          onClick={unsubscribeUser}
          className="w-full px-4 py-2 bg-gray-700/50 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition active:scale-95 touch-manipulation focus:outline-none focus:ring-2 focus:ring-gray-500/50"
          aria-label="Désactiver les notifications push"
        >
          🔕 Désactiver les notifications
        </button>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="mt-2">
        <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
          <p className="text-red-300 text-xs">❌ {errorMsg || "Une erreur est survenue"}</p>
        </div>
        <button
          onClick={() => { setStatus("idle"); setErrorMsg(null) }}
          className="mt-2 w-full px-4 py-2 bg-[#C8A84E]/20 text-[#C8A84E] rounded-lg text-sm hover:bg-[#C8A84E]/30 transition active:scale-95 touch-manipulation"
        >
          🔄 Réessayer
        </button>
      </div>
    )
  }

  // État par défaut : bouton d'activation
  return (
    <button
      onClick={subscribeUser}
      className="mt-2 w-full px-4 py-3 bg-[#C8A84E]/20 text-[#C8A84E] rounded-lg text-sm font-medium hover:bg-[#C8A84E]/30 transition active:scale-95 touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
      aria-label="Activer les notifications push"
    >
      🔔 Activer les rappels push
    </button>
  )
}

// Fonction utilitaire technique
// Elle convertit la clé VAPID (format Base64) en format binaire
// exigé par le navigateur (Uint8Array = tableau de nombres binaires)
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}
