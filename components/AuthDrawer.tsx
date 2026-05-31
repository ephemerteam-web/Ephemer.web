"use client"

import { supabase } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

// ============================================================
// TYPES — On définit ce que ce composant attend comme infos
// ============================================================
type AuthDrawerProps = {
  isOpen: boolean           // Le drawer est-il ouvert ?
  onClose: () => void       // Fonction pour le fermer
  mode: "inscription" | "connexion"  // Quel mode afficher
  onSwitchMode: () => void  // Basculer entre les deux modes
}

// ============================================================
// ICÔNES SVG OFFICIELLES
// On les intègre directement pour éviter des dépendances
// ============================================================

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function AuthDrawer({ isOpen, onClose, mode, onSwitchMode }: AuthDrawerProps) {
  const router = useRouter()

  // Bloque le scroll du body quand le drawer est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  // ---- Connexion via provider OAuth ----
  // provider = "google" | "apple" | "facebook" | "linkedin_oidc" | "twitter"
  const signInWithProvider = async (provider: "google" | "apple" | "facebook" | "linkedin_oidc" | "twitter") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
        // ↑ Après connexion, l'utilisateur sera renvoyé ici
      }
    })
    if (error) console.error("Erreur OAuth:", error.message)
  }

  // ---- Providers à afficher ----
  const providers = [
    {
      id: "google" as const,
      label: "Continuer avec Google",
      icon: <GoogleIcon />,
      className: "bg-white text-[#1a1a1a] hover:bg-gray-100 border border-gray-200"
    },
      {
      id: "facebook" as const,
      label: "Continuer avec Facebook",
      icon: <FacebookIcon />,
      className: "bg-[#1877F2] text-white hover:bg-[#1565D8]"
    },
  
  ]

  if (!isOpen) return null

  return (
    // ---- Fond semi-transparent (ferme le drawer si on clique dessus) ----
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* ---- Panneau du drawer ---- */}
      {/* stopPropagation = empêche le clic sur le panneau de fermer le drawer */}
      <div
        className="w-full max-w-md bg-[#0F1A2E] border border-white/10 rounded-t-3xl p-6 pb-10 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Barre de fermeture (trait gris) */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

        {/* Titre */}
<div className="text-center mb-6">

  {/* Onglets cliquables */}
  <div className="flex bg-white/5 rounded-xl p-1 mb-5">
    <button
      onClick={() => mode !== "inscription" && onSwitchMode()}
      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
        mode === "inscription"
          ? "bg-[#C8A84E] text-[#0B1120]"
          : "text-white/40 hover:text-white/70"
      }`}
    >
      S'inscrire
    </button>
    <button
      onClick={() => mode !== "connexion" && onSwitchMode()}
      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
        mode === "connexion"
          ? "bg-[#C8A84E] text-[#0B1120]"
          : "text-white/40 hover:text-white/70"
      }`}
    >
      Se connecter
    </button>
  </div>

  <p className="text-white/40 text-sm">
    {mode === "inscription"
      ? "Rejoins Ephemer.name gratuitement"
      : "Bon retour parmi nous ✨"}
  </p>

</div>


        {/* Boutons providers */}
        <div className="flex flex-col gap-3">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => signInWithProvider(p.id)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${p.className}`}
            >
              {p.icon}
              {p.label}
            </button>
          ))}
        </div>

        {/* Séparateur */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs">ou</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Lien vers page email classique */}
        <button
          onClick={() => {
            onClose()
            router.push(mode === "inscription" ? "/inscription" : "/connexion")
          }}
          className="w-full py-3 rounded-xl border border-[#C8A84E]/30 text-[#C8A84E] text-sm font-medium hover:bg-[#C8A84E]/10 transition-all duration-200"
        >
          ✉️ Continuer avec Email
        </button>

        

      </div>
    </div>
  )
}
