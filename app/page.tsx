"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient  } from "@/lib/supabase-browser"
import AuthDrawer from "@/components/AuthDrawer"
import HeroSection from "@/components/HeroSection"

const supabase = getSupabaseClient()

export default function Accueil() {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<"inscription" | "connexion">("inscription")

  // Vérifier si déjà connecté → redirection dashboard
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.push("/dashboard")
      }
    }
    checkUser()
  }, [])

  // Fonctions passées au composant Hero
  const openInscription = () => {
    setDrawerMode("inscription")
    setDrawerOpen(true)
  }

  const openConnexion = () => {
    setDrawerMode("connexion")
    setDrawerOpen(true)
  }

  return (
    <>
      <HeroSection
        onOpenInscription={openInscription}
        onOpenConnexion={openConnexion}
      />

      <AuthDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode}
        onSwitchMode={() => setDrawerMode(m => m === "inscription" ? "connexion" : "inscription")}
      />
    </>
  )
}
