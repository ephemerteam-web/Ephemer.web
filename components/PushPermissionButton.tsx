"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase-browser"

// La clé VAPID est la "clé publique" de ton serveur push
// Elle doit commencer par NEXT_PUBLIC_ pour être lisible dans le navigateur
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
const supabase = getSupabaseClient()

// Les 6 états possibles du composant
type PushStatus = "idle" | "loading" | "granted" | "denied" | "unsupported" | "error"

export default function PushPermissionButton() {
  const [status, setStatus] = useState<PushStatus>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  

  // Au chargement : vérifier l'état réel
  useEffect(() => {
    checkStatus()
  }, [])

  async function checkStatus() {
    // 1. Vérifier compatibilité navigateur
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported")
      return
    }

    // 2. Vérifier la permission actuelle
    if (Notification.permission === "denied") {
      setStatus("denied")
      return
    }

    // 3. Si déjà "granted", vérifier si on a une souscription dans Supabase
    if (Notification.permission === "granted") {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: existing } = await supabase
          .from("user_push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)

        if (existing && existing.length > 0) {
          setStatus("granted")
          return
        }
      }
    }
  }

  // ── Activation des push ─────────────────────────────────────────
  async function subscribeUser() {
    setStatus("loading")
    setErrorMsg(null)

    try {
      // Vérifier que la clé est bien configurée
      if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.includes("REMPLACE")) {
        throw new Error("Clé VAPID non configurée. Contactez l'administrateur.")
      }

      // Compatibilité navigateur
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Ton navigateur ne supporte pas les notifications push.")
      }

      // Demande de permission à l'utilisateur
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setStatus("denied")
        return
      }

      // Enregistrer le Service Worker (seulement si pas déjà fait)
      // Un Service Worker, c'est un "script qui tourne en arrière-plan",
      // même quand la page est fermée — c'est lui qui reçoit les push
      let reg = await navigator.serviceWorker.getRegistration()
      if (!reg) {
        reg = await navigator.serviceWorker.register("/sw.js")
        await navigator.serviceWorker.ready
      }

      // Souscription aux notifications push avec la clé VAPID
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // Vérifier que l'utilisateur est bien connecté
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error("Tu dois être connecté pour activer les rappels.")
      }

      // Vérifier s'il y a déjà une souscription (évite les doublons)
      const { data: existing } = await supabase
        .from("user_push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)

      if (!existing || existing.length === 0) {
        const { error: dbError } = await supabase
          .from("user_push_subscriptions")
          .insert({
            user_id: user.id,
            subscription: subscription.toJSON(),
          })

        if (dbError) throw dbError
      }

      setStatus("granted")
    } catch (err) {
      console.error("Échec activation push :", err)
      const message = err instanceof Error ? err.message : "Erreur inconnue"
      setErrorMsg(message)
      setStatus("error")
    }
  }

  // ── Désactivation des push ──────────────────────────────────────
  async function unsubscribeUser() {
    setStatus("loading")
    try {
      // Se désabonner du push au niveau du navigateur
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
      }

      // Supprimer l'entrée dans Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from("user_push_subscriptions")
          .delete()
          .eq("user_id", user.id)
      }

      setStatus("idle")
    } catch (err) {
      console.error("Erreur désactivation push :", err)
      setErrorMsg("Erreur lors de la désactivation")
      setStatus("error")
    }
  }

  // ── Rendu conditionnel selon l'état ─────────────────────────────

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
        (Chrome : cadenas à gauche de l'adresse • Safari : Préférences {'>'} Sites web)
      </div>
    )
  }

  if (status === "loading") {
    return (
      <div className="mt-2 flex items-center gap-2 text-[#C8A84E]">
        <div className="w-4 h-4 border-2 border-[#C8A84E]/30 border-t-[#C8A84E] rounded-full animate-spin" />
        <span className="text-xs">Activation en cours...</span>
      </div>
    )
  }

  if (status === "granted") {
    return (
      <div className="mt-2">
        <div className="flex items-center gap-2 text-green-400 text-xs mb-2">
          <span>✅</span>
          <span>Notifications activées</span>
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