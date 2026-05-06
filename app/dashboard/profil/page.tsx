"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function ProfilPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [nouvelEmail, setNouvelEmail] = useState("")
  const [prenom, setPrenom] = useState("")
  const [nom, setNom] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [modifierEmail, setModifierEmail] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/connexion"); return }

      setEmail(user.email || "")
      setPrenom(user.user_metadata?.prenom || "")
      setNom(user.user_metadata?.nom || "")
    }
    getUser()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const updateData: { data: { prenom: string; nom: string }; email?: string } = {
      data: { prenom, nom }
    }

    if (modifierEmail && nouvelEmail && nouvelEmail !== email) {
      updateData.email = nouvelEmail
    }

    const { error } = await supabase.auth.updateUser(updateData)

    if (error) {
      setMessage("❌ Erreur : " + error.message)
    } else {
      if (modifierEmail && nouvelEmail && nouvelEmail !== email) {
        setMessage("✅ Un email de confirmation a été envoyé à " + nouvelEmail + ". Clique sur le lien pour valider le changement.")
        setModifierEmail(false)
        setNouvelEmail("")
      } else {
        setMessage("✅ Profil mis à jour avec succès !")
      }
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/connexion")
  }

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">

          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C8A84E] to-[#D4B85C] flex items-center justify-center text-[#0B1120] text-2xl font-bold mb-3">
              {prenom ? prenom[0].toUpperCase() : "?"}
            </div>
            <h1 className="text-xl font-bold text-white">Mon Profil</h1>
            <p className="text-sm text-white/40">{email}</p>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-5">

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Prénom</label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="w-full px-4 py-2 border border-white/10 bg-white/5 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
                placeholder="Ton prénom"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Nom</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full px-4 py-2 border border-white/10 bg-white/5 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
                placeholder="Ton nom"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Email actuel</label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-2 border border-white/10 bg-white/5 text-white/40 rounded-xl cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setModifierEmail(!modifierEmail)}
                  className="text-xs text-[#C8A84E] hover:text-white whitespace-nowrap underline"
                >
                  {modifierEmail ? "Annuler" : "Modifier"}
                </button>
              </div>
            </div>

            {modifierEmail && (
              <div className="bg-[#C8A84E]/10 p-4 rounded-xl border border-[#C8A84E]/20">
                <label className="block text-sm font-medium text-[#C8A84E] mb-1">
                  Nouvel email
                </label>
                <input
                  type="email"
                  value={nouvelEmail}
                  onChange={(e) => setNouvelEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-[#C8A84E]/30 bg-white/5 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
                  placeholder="nouveau@email.com"
                  required
                />
                <p className="text-xs text-[#C8A84E]/70 mt-2">
                  📬 Un email de confirmation sera envoyé à cette adresse. Ton email actuel reste actif jusqu'à confirmation.
                </p>
              </div>
            )}

            {message && (
              <p className="text-sm text-center py-2 px-4 rounded-xl bg-[#C8A84E]/10 text-[#C8A84E]">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold rounded-xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition disabled:opacity-50"
            >
              {loading ? "Sauvegarde..." : "💾 Sauvegarder"}
            </button>

          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full py-3 border border-red-500/30 text-red-300 rounded-xl hover:bg-red-500/10 transition text-sm font-medium"
            >
              🚪 Se déconnecter
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}