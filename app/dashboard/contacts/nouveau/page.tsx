'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { INDICATIFS_PAYS, TYPES_RELATION, MESSAGES_UI } from '@/lib/constants' // ✨ Nouveau !

export default function NouveauContact() {
  const router = useRouter()

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [relation, setRelation] = useState('ami')
  const [email, setEmail] = useState('')
  const [telephoneIndicatif, setTelephoneIndicatif] = useState('+33')
  const [telephoneNumero, setTelephoneNumero] = useState('')
  const [note, setNote] = useState('')
  const [estFavori, setEstFavori] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setChargement(true)
    setErreur('')

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push('/connexion')
      return
    }

    const { error } = await supabase
      .from('contacts')
      .insert({
        user_id: userData.user.id,
        prenom,
        nom,
        date_naissance: dateNaissance || null,
        relation,
        email: email || null,
        telephone_indicatif: telephoneNumero ? telephoneIndicatif : null,
        telephone_numero: telephoneNumero || null,
        note: note || null,
        est_favori: estFavori,
      })

    if (error) {
      setErreur('Une erreur est survenue. Réessaie !')
      console.log(error)
    } else {
      router.push('/dashboard/contacts')
      router.refresh()
    }

    setChargement(false)
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-2xl mx-auto">

        <h1 className="text-2xl font-bold text-white mb-6">
          👤 Nouveau contact
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div>
            <label className="text-sm font-semibold text-indigo-300">Prénom *</label>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
              placeholder="ex: Marie"
              className="mt-1 w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-indigo-300">Nom</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="ex: Dupont"
              className="mt-1 w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-indigo-300">Date de naissance</label>
            <input
              type="date"
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-indigo-300">Type de relation</label>
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="ami" className="bg-gray-800">👫 Ami(e)</option>
              <option value="famille" className="bg-gray-800">👨‍👩‍👧 Famille</option>
              <option value="pro" className="bg-gray-800">💼 Professionnel</option>
              <option value="autre" className="bg-gray-800">✨ Autre</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-indigo-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@email.com"
              className="mt-1 w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Téléphone : indicatif + numéro */}
          <div>
            <label className="text-sm font-semibold text-indigo-300">Téléphone</label>
            <div className="mt-1 flex gap-2">
              <select
                value={telephoneIndicatif}
                onChange={(e) => setTelephoneIndicatif(e.target.value)}
                className="bg-white/5 border border-white/10 text-white rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {INDICATIFS_PAYS.map((i) => (
                  <option key={i.code} value={i.code} className="bg-gray-800">
                    {i.pays} ({i.code})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={telephoneNumero}
                onChange={(e) => setTelephoneNumero(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="612345678"
                className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <p className="text-xs text-indigo-400 mt-1">
              Sans le 0 du début (ex : 612345678 pour 06 12 34 56 78)
            </p>
          </div>

          {/* Note / Description */}
          <div>
            <label className="text-sm font-semibold text-indigo-300">
              Note / À propos de ce contact
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex : aime le foot, fan de cuisine italienne, vit à Paris, deux enfants..."
              rows={4}
              className="mt-1 w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
            <p className="text-xs text-indigo-400 mt-1">
              💡 Plus tu en mets, plus les suggestions de cadeaux seront pertinentes.
            </p>
          </div>

          {/* Favori */}
          <div
            onClick={() => setEstFavori(!estFavori)}
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
              estFavori
                ? 'border-yellow-400 bg-yellow-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-white">⭐ Contact favori</p>
              <p className="text-xs text-indigo-400 mt-0.5">Apparaîtra en priorité</p>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors ${estFavori ? 'bg-yellow-400' : 'bg-gray-500'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${estFavori ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </div>

          {erreur && <p className="text-red-400 text-sm">{erreur || MESSAGES_UI.erreur_genérique}</p>}

          <button
            type="submit"
            disabled={chargement}
            className="bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-500 transition disabled:opacity-50"
          >
            {chargement ? 'Enregistrement...' : '💾 Enregistrer le contact'}
          </button>

        </form>
      </div>
    </div>
  )
}
