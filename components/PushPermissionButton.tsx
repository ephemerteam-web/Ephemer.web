"use client";
import { useState } from "react";
// 💡 Adapte ce chemin si ton client Supabase est ailleurs (ex: "@/lib/supabase/client")
import { supabase } from "@/lib/supabase-browser"; 

// 💡 Next.js exige le préfixe NEXT_PUBLIC_ pour exposer une variable au navigateur
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "REMPLACE_PAR_TA_CLE_PUBLIQUE_ICI";

export default function PushPermissionButton() {
  const [status, setStatus] = useState<"default" | "loading" | "granted" | "denied">("default");

  const subscribeUser = async () => {
    setStatus("loading");
    try {
      // 1. Vérification de compatibilité navigateur
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Navigateur non compatible avec les push");
      }

      // 2. Demande de permission à l'utilisateur (boîte native du navigateur)
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      // 3. Attente du Service Worker prêt & génération du token de souscription
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 4. Vérification que l'utilisateur est bien connecté
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Tu dois être connecté pour activer les rappels");

      // 5. Sauvegarde sécurisée dans Supabase
      const { error: dbError } = await supabase
        .from("user_push_subscriptions")
        .insert({
          user_id: user.id,
          subscription: subscription.toJSON(),
        });

      if (dbError) throw dbError;
      setStatus("granted");
    } catch (err) {
      console.error("❌ Échec activation push :", err);
      setStatus("denied");
    }
  };

  // 📱 Rendu conditionnel avec retours visuels
  if (status === "loading") {
    return <p className="text-[#C8A84E] text-xs mt-2 animate-pulse">⏳ Activation en cours...</p>;
  }
  if (status === "granted") {
    return <p className="text-green-400 text-xs mt-2">✅ Notifications activées</p>;
  }
  if (status === "denied") {
    return <p className="text-red-400 text-xs mt-2">❌ Bloquées (vérifie tes paramètres navigateur)</p>;
  }

  return (
    <button
      onClick={subscribeUser}
      className="mt-2 w-full px-4 py-2 bg-[#C8A84E]/20 text-[#C8A84E] rounded-lg text-sm hover:bg-[#C8A84E]/30 transition active:scale-95 touch-manipulation"
    >
      🔔 Activer les rappels push
    </button>
  );
}

// 🔧 Helper technique : convertit la clé VAPID (Base64) en format binaire exigé par le navigateur
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
