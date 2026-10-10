"use client"

import { useEffect, useState, useContext, useRef } from 'react'
import { DashboardUserContext } from '@/components/DashboardUserContext'
import { supabase } from '@/lib/supabase-browser'
import { useBrowserValue } from '@/lib/hooks/useBrowserValue'
import { findPushDevice, savePushDevice, removePushDevice, readPushSaints } from '@/lib/push-device'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
type PushStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported' | 'error'

export default function PushPermissionButton() {
  const dashboardUser = useContext(DashboardUserContext)
  return <AccountPushPermissionButton key={dashboardUser?.id ?? 'guide'} ownerId={dashboardUser?.id} />
}
function AccountPushPermissionButton({ ownerId }: { ownerId?: string }) {
  const alive = useRef(true), saintsLock = useRef(false)
  const [savingSaints, setSavingSaints] = useState(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const [savedStatus, setStatus] = useState<PushStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [serverReady, setServerReady] = useState(false), [saints, setSaints] = useState(false)
  const supported = useBrowserValue(() => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window, false)
  const ready = useBrowserValue(() => true, false)
  const status = !ready ? 'loading' : !supported ? 'unsupported' : savedStatus

  useEffect(() => {
    if (!supported) return
    let active = true
    const check = async () => {
      const reg = await navigator.serviceWorker.getRegistration('/')
      const sub = await reg?.pushManager.getSubscription()
      let checkedOwnerId = ownerId
      if (sub && !checkedOwnerId) {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        checkedOwnerId = user?.id
      }
      const rows = checkedOwnerId && sub ? await findPushDevice(checkedOwnerId, sub.endpoint) : []
      if (checkedOwnerId) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user.id === checkedOwnerId) {
          const response = await fetch('/api/push/status', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' })
          const state = response.ok ? await response.json() : null
          if (active) setServerReady(state?.ready === true)
        }
      }
      if (checkedOwnerId && sub && rows.length) { const value = await readPushSaints(checkedOwnerId, sub.endpoint); if (active) setSaints(value) }
      if (active) setStatus(Notification.permission === 'denied' ? 'denied' : sub && rows.length ? 'granted' : 'idle')
    }
    void check().catch(() => { if (active) { setStatus('error'); setErrorMsg('Impossible de vérifier cet appareil.') } })
    return () => { active = false }
  }, [supported, ownerId])

  async function subscribeUser() {
    if (!supported) return
    setStatus('loading'); setErrorMsg(null)
    try {
      if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.includes('REMPLACE')) throw new Error('Activation indisponible : configuration push manquante.')
      // La demande de permission reste directement liée au clic sur iOS.
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus(permission === 'denied' ? 'denied' : 'idle'); return }
      const { data: { user }, error } = await supabase.auth.getUser()
      if (!alive.current || error || !user || (ownerId && ownerId !== user.id)) throw new Error('Reconnecte-toi pour enregistrer cet appareil.')
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
      const { data: current } = await supabase.auth.getUser()
      if (!alive.current || current.user?.id !== user.id) throw new Error('Compte changé. Réessaie depuis le compte actuel.')
      await savePushDevice(user.id, sub)
      if (alive.current) setStatus('granted')
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Activation impossible. Réessaie.')
      setStatus('error')
    }
  }

  async function changeSaints(value: boolean) {
    if (saintsLock.current) return
    saintsLock.current = true; setSavingSaints(true)
    setErrorMsg(null)
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      const sub = await (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription()
      if (!alive.current || error || !user || (ownerId && user.id !== ownerId) || !sub || !(await findPushDevice(user.id, sub.endpoint)).length) throw new Error('Reconnecte-toi et vérifie cet appareil.')
      await savePushDevice(user.id, sub, value); if (alive.current) setSaints(value)
    } catch { if (alive.current) setErrorMsg('Préférence non enregistrée. Réessaie.') }
    finally { saintsLock.current = false; if (alive.current) setSavingSaints(false) }
  }

  async function unsubscribeUser() {
    setStatus('loading'); setErrorMsg(null)
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (!alive.current || error || !user || (ownerId && user.id !== ownerId)) throw new Error('Reconnecte-toi pour désactiver cet appareil.')
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
      <div role="status" className="mt-2 p-3 bg-gray-700/30 rounded-lg">
        <p className="text-muted text-xs">
          ⚠️ Ton navigateur ne supporte pas les notifications push
        </p>
      </div>
    )
  }

  if (status === "denied") {
    return (
      <div role="status" className="mt-2 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
        <p className="text-danger text-xs font-medium">❌ Notifications bloquées</p>
        (Chrome : cadenas à gauche de l&apos;adresse • Safari : Préférences {'>'} Sites web)
      </div>
    )
  }

  if (status === "loading") {
    return (
      <div role="status" className="mt-2 flex items-center gap-2 text-accent">
        <div className="w-4 h-4 border-2 border-accent/30 border-t-[#C8A84E] rounded-full animate-spin" />
        <span className="text-xs">Vérification en cours...</span>
      </div>
    )
  }

  if (status === "granted") {
    return (
      <div role="status" className="mt-2">
        <div className="flex items-center gap-2 text-success text-xs mb-2">
          <span>✅</span>
          <span>{serverReady ? 'Appareil prêt pour le résumé quotidien' : 'Appareil préparé — envoi push indisponible actuellement'}</span>
        </div>
        <p className="mb-2 text-xs text-muted">Une notification au maximum par jour, si le canal push est activé dans tes paramètres.</p>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" disabled={savingSaints} checked={saints} onChange={event => void changeSaints(event.target.checked)} />Inclure les saints du jour sur cet appareil</label>
        <p className="text-xs text-muted">Cette option peut envoyer un résumé même sans date personnelle.</p>
        {errorMsg && <p role="alert" className="text-xs text-danger">{errorMsg}</p>}
        <button
          onClick={unsubscribeUser}
          className="w-full px-4 py-2 bg-gray-700/50 text-muted rounded-lg text-sm hover:bg-gray-700 transition active:scale-95 touch-manipulation focus:outline-none focus:ring-2 focus:ring-gray-500/50"
          aria-label="Retirer cet appareil"
        >
          🔕 Retirer cet appareil
        </button>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div role="status" className="mt-2">
        <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
          <p className="text-danger text-xs">❌ {errorMsg || "Une erreur est survenue"}</p>
        </div>
        <button
          onClick={() => { setStatus("idle"); setErrorMsg(null) }}
          className="mt-2 w-full px-4 py-2 bg-action/20 text-accent rounded-lg text-sm hover:bg-action/30 transition active:scale-95 touch-manipulation"
        >
          🔄 Réessayer
        </button>
      </div>
    )
  }

  // État par défaut : bouton d'activation
  return (
    <div><p role="status" className="text-sm text-muted">{serverReady ? 'Un résumé quotidien des dates à célébrer. Sur iPhone, ouvre Ephemer depuis l’écran d’accueil pour l’activer.' : 'Envoi push indisponible actuellement.'}</p><button
      onClick={subscribeUser}
      className="mt-2 w-full px-4 py-3 bg-action/20 text-accent rounded-lg text-sm font-medium hover:bg-action/30 transition active:scale-95 touch-manipulation focus:outline-none focus:ring-2 focus:ring-accent/50"
      aria-label="Préparer cet appareil"
    >
      🔔 Préparer cet appareil
    </button></div>
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
