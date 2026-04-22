"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function ProfilPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [prenom, setPrenom] = useState("")
  const [nom, setNom] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  // Au chargement, on récupère les infos de l'utilisateur connecté
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

  // Sauvegarde les modifications
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.updateUser({
      data: { prenom, nom }
    })

    if (error) {
      setMessage("❌ Erreur : " + error.message)
    } else {
      setMessage("✅ Profil mis à jour avec succès !")
    }
    setLoading(false)
  }

  // Déconnexion
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/connexion")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-lg mx-auto">

        {/* Bouton retour */}
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 text-sm text-gray-500 hover:text-purple-600 flex items-center gap-2 transition"
        >
          ← Retour au dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* Avatar avec initiales */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-2xl font-bold mb-3">
              {prenom ? prenom[0].toUpperCase() : "?"}
            </div>
            <h1 className="text-xl font-bold text-gray-800">Mon Profil</h1>
            <p className="text-sm text-gray-400">{email}</p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSave} className="flex flex-col gap-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom
              </label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="Ton prénom"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="Ton nom"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2 border border-gray-100 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié</p>
            </div>

            {/* Message succès ou erreur */}
            {message && (
              <p className="text-sm text-center py-2 px-4 rounded-xl bg-purple-50 text-purple-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Sauvegarde..." : "💾 Sauvegarder"}
            </button>

          </form>

          {/* Déconnexion */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full py-3 border border-red-200 text-red-400 rounded-xl hover:bg-red-50 transition text-sm font-medium"
            >
              🚪 Se déconnecter
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
