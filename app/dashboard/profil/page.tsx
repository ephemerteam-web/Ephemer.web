"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function ProfilPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [nouvelEmail, setNouvelEmail] = useState("") // 👈 Nouveau champ
  const [prenom, setPrenom] = useState("")
  const [nom, setNom] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [modifierEmail, setModifierEmail] = useState(false) // 👈 Affiche/cache le champ

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

    // On prépare l'objet de mise à jour
    // "updateData" contiendra soit juste les métadonnées, soit aussi le nouvel email
    const updateData: { data: { prenom: string; nom: string }; email?: string } = {
      data: { prenom, nom }
    }

    // Si l'utilisateur a rempli le champ nouvel email, on l'ajoute
    if (modifierEmail && nouvelEmail && nouvelEmail !== email) {
      updateData.email = nouvelEmail
    }

    const { error } = await supabase.auth.updateUser(updateData)

    if (error) {
      setMessage("❌ Erreur : " + error.message)
    } else {
      // Si l'email a été changé, on affiche un message spécifique
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-lg mx-auto">

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-2xl font-bold mb-3">
              {prenom ? prenom[0].toUpperCase() : "?"}
            </div>
            <h1 className="text-xl font-bold text-gray-800">Mon Profil</h1>
            <p className="text-sm text-gray-400">{email}</p>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="Ton prénom"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="Ton nom"
              />
            </div>

            {/* Section email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email actuel</label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-100 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed"
                />
                {/* Bouton pour afficher le champ de changement */}
                <button
                  type="button"
                  onClick={() => setModifierEmail(!modifierEmail)}
                  className="text-xs text-purple-500 hover:text-purple-700 whitespace-nowrap underline"
                >
                  {modifierEmail ? "Annuler" : "Modifier"}
                </button>
              </div>
            </div>

            {/* Champ nouvel email — visible seulement si modifierEmail = true */}
            {modifierEmail && (
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <label className="block text-sm font-medium text-purple-700 mb-1">
                  Nouvel email
                </label>
                <input
                  type="email"
                  value={nouvelEmail}
                  onChange={(e) => setNouvelEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                  placeholder="nouveau@email.com"
                  required
                />
                <p className="text-xs text-purple-500 mt-2">
                  📬 Un email de confirmation sera envoyé à cette adresse. Ton email actuel reste actif jusqu'à confirmation.
                </p>
              </div>
            )}

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
