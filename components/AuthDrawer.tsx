"use client"

import { supabase } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import IconeLuneIA from "@/components/IconeLuneIA"

// ============================================================
// TYPES
// ============================================================
type AuthDrawerProps = {
  isOpen: boolean
  onClose: () => void
  mode: "inscription" | "connexion"
  onSwitchMode: () => void
}

// ============================================================
// ICÔNES SVG OFFICIELLES
// ============================================================

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
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
  const signInWithProvider = async (provider: "google" | "facebook") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) console.error("Erreur OAuth:", error.message)
  }

  // ---- Configuration des thèmes par mode ----
  const themeConfig = mode === "inscription" ? {
    // 🌟 INSCRIPTION : Thème Doré/Chaleureux
    bgGradient: "linear-gradient(135deg, #1a1410 0%, #0B1120 100%)",
    accentColor: "#C8A84E",
    accentGlow: "rgba(200, 168, 78, 0.2)",
    borderColor: "border-[#C8A84E]/30",
    hoverBg: "hover:bg-[#C8A84E]/10",
    tabBg: "bg-[#C8A84E]/20",
    tabActiveBg: "bg-[#C8A84E]",
    tabText: "text-[#0B1120]",
    decorEmoji: "✨",
    decorGlow: "0 0 40px rgba(200, 168, 78, 0.3)",
    subtitle: "Rejoins Ephemer.name gratuitement",
  } : {
    // 🌙 CONNEXION : Thème Lune/IA
    bgGradient: "linear-gradient(135deg, #0a0a2e 0%, #0B1120 100%)",
    accentColor: "#A5B4FC",
    accentGlow: "rgba(165, 180, 252, 0.2)",
    borderColor: "border-indigo-400/30",
    hoverBg: "hover:bg-indigo-400/10",
    tabBg: "bg-indigo-400/20",
    tabActiveBg: "bg-indigo-400",
    tabText: "text-white",
    decorGlow: "0 0 50px rgba(165, 180, 252, 0.4)",
    subtitle: "Bon retour parmi nous ✨",
  }

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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* ---- Panneau du drawer avec gradient thématique ---- */}
      <div
        className="w-full max-w-md rounded-t-3xl p-6 pb-10 animate-slideUp border-t border-white/10 relative overflow-hidden"
        style={{
          background: themeConfig.bgGradient,
          boxShadow: themeConfig.decorGlow
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Décoration de fond (effet de lueur thématique) ── */}
        <div
          className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${themeConfig.accentColor} 0%, transparent 70%)`
          }}
        />

        {/* ── Étoiles/particules décoratives (inscription seulement) ── */}
        {mode === "inscription" && (
          <>
            <div className="absolute top-12 right-16 w-1 h-1 bg-[#C8A84E]/60 rounded-full animate-pulse" />
            <div className="absolute top-32 right-8 w-1.5 h-1.5 bg-[#C8A84E]/40 rounded-full animate-pulse" style={{animationDelay: "0.5s"}} />
            <div className="absolute bottom-32 right-24 w-0.5 h-0.5 bg-[#C8A84E]/50 rounded-full animate-pulse" style={{animationDelay: "1s"}} />
          </>
        )}

        {/* ── Icône Lune + IA (connexion seulement) ── */}
        {mode === "connexion" && (
          <div className="absolute -top-8 -right-8 opacity-20 pointer-events-none animate-pulse">
            <IconeLuneIA size={200} className="text-indigo-300" />
          </div>
        )}

        {/* ── Barre de fermeture ── */}
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{background: `${themeConfig.accentColor}/30`}} />

        {/* ── Section titre ── */}
        <div className="text-center mb-6 relative z-10">
          {/* Indicateur : Icône personnalisée pour connexion, emoji pour inscription */}
          <div className="mb-4 h-16 flex items-center justify-center">
            {mode === "inscription" ? (
              <span className="text-4xl">✨</span>
            ) : (
              <IconeLuneIA size={64} className="text-indigo-300 drop-shadow-lg" />
            )}
          </div>

          {/* Onglets cliquables avec couleur thématique */}
          <div className={`flex rounded-xl p-1 mb-5 ${themeConfig.tabBg}`}>
            <button
              onClick={() => mode !== "inscription" && onSwitchMode()}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                mode === "inscription"
                  ? `${themeConfig.tabActiveBg} ${themeConfig.tabText} shadow-lg`
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              S'inscrire
            </button>
            <button
              onClick={() => mode !== "connexion" && onSwitchMode()}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                mode === "connexion"
                  ? `${themeConfig.tabActiveBg} ${themeConfig.tabText} shadow-lg`
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              Se connecter
            </button>
          </div>

          {/* Sous-titre thématique */}
          <p className="text-white/50 text-sm">
            {themeConfig.subtitle}
          </p>
        </div>

        {/* ── Boutons providers ── */}
        <div className="flex flex-col gap-3 relative z-10">
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

        {/* ── Séparateur ── */}
        <div className="flex items-center gap-3 my-5 relative z-10">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs">ou</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* ── Bouton Email avec couleur thématique ── */}
        <button
          onClick={() => {
            onClose()
            router.push(mode === "inscription" ? "/inscription" : "/connexion")
          }}
          className={`w-full py-3 rounded-xl border text-sm font-medium transition-all duration-200 relative z-10 ${themeConfig.borderColor} ${themeConfig.hoverBg}`}
          style={{color: themeConfig.accentColor}}
        >
          ✉️ Continuer avec Email
        </button>

      </div>
    </div>
  )
}