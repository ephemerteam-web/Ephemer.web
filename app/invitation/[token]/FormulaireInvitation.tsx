'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { GROUPES_INTERETS, INDICATIFS } from './interets'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const RELATIONS = [
  { valeur: 'famille', emoji: '🏡', label: 'Famille',  sous: 'On partage bien plus qu\'un nom' },
  { valeur: 'amis',    emoji: '✨', label: 'Ami·e',    sous: 'Choisi·e, pas subi·e' },
  { valeur: 'pro',     emoji: '💼', label: 'Pro',      sous: 'Collègue, client, partenaire' },
  { valeur: 'autre',   emoji: '🌍', label: 'Autre',    sous: 'Voisin, prof, coéquipier…' },
]

const TOTAL_ETAPES = 4

export default function FormulaireInvitation({
  token,
  prenomHote,
}: {
  token: string
  prenomHote: string
}) {
  const [etape, setEtape] = useState(1)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [termine, setTermine] = useState(false)

  // ── Champs du formulaire
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [jour, setJour] = useState('')
  const [mois, setMois] = useState('')
  const [annee, setAnnee] = useState('')
  const [relation, setRelation] = useState('')
  const [interets, setInterets] = useState<string[]>([])
  const [noteLibre, setNoteLibre] = useState('')
  const [email, setEmail] = useState('')
  const [indicatif, setIndicatif] = useState('+33')
  const [tel, setTel] = useState('')

  // ── Bascule une bulle (ajoute ou retire)
  const toggleInteret = (item: string) => {
    setInterets((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    )
  }

  // ── Validation par étape (bouton grisé si faux)
  const etapeValide = () => {
    if (etape === 1) return prenom.trim().length >= 2
    if (etape === 2) return relation !== ''
    return true // étapes 3 et 4 entièrement optionnelles
  }

  // ── Construit la date au format attendu par Postgres (AAAA-MM-JJ)
  const construireDate = (): string | null => {
    if (!jour || !mois) return null
    const a = annee || '1900' // année inconnue → on met un repère neutre
    const j = jour.padStart(2, '0')
    const m = mois.padStart(2, '0')
    return `${a}-${m}-${j}`
  }

    // ── Envoi final
  const envoyer = async () => {
    setEnvoi(true)
    setErreur(null)

    // On fusionne les bulles cochées et le texte libre dans "note"
    const morceaux: string[] = []
    if (interets.length) morceaux.push(interets.join(', '))
    if (noteLibre.trim()) morceaux.push(noteLibre.trim())
    const note = morceaux.join(' — ') || null

    const { data, error } = await supabase.rpc('soumettre_invitation', {
      p_token: token,
      p_prenom: prenom.trim(),
      p_nom: nom.trim() || null,
      p_date_naissance: construireDate(),
      p_relation: relation || 'autre',
      p_email: email.trim() || null,
      p_telephone_indicatif: tel.trim() ? indicatif : null,
      p_telephone_numero: tel.trim() || null,
      p_note: note,
    })

    setEnvoi(false)

    const res = Array.isArray(data) ? data[0] : data

    if (error || !res?.succes) {
      setErreur(res?.message ?? "Une erreur est survenue. Réessaie dans un instant.")
      return
    }

    // ── 🆕 NOTIFIER L'HÔTE (notification + email) ──
    // Appel en arrière-plan — on ne bloque pas l'écran "Merci"
    fetch('/api/invitation-notifier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch((err) => {
      console.error('Erreur notification hôte:', err)
    })

    setTermine(true)
  }

  // ══════════════════════════════════════════
  // ÉCRAN DE REMERCIEMENT
  // ══════════════════════════════════════════
  if (termine) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0F1017] via-[#15161F] to-[#0F1017] flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-6 animate-bounce">🎉</div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-4">
            C'est noté, {prenom} !
          </h1>

          <p className="text-white/60 leading-relaxed mb-8">
            {prenomHote} a maintenant tout ce qu'il faut pour penser à toi
            au bon moment. Tu peux fermer cette page.
          </p>

          <div className="rounded-2xl border border-[#C9A961]/20 bg-[#C9A961]/[0.04] p-5 mb-8">
            <p className="text-[#C9A961] text-sm">
              🔒 Tes informations sont visibles uniquement par {prenomHote}.
            </p>
          </div>

          {/* ── Invitation à rejoindre Ephemer ── */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 mb-8">
            <p className="text-3xl mb-3">✨</p>
            <h3 className="text-white font-medium text-base sm:text-lg mb-2">
              Et si tu faisais pareil pour tes proches&nbsp;?
            </h3>
            <p className="text-sm text-white/40 leading-relaxed mb-5">
              Crée ton compte Ephemer et ne plus jamais oublier les anniversaires,
              fêtes et moments importants des gens qui comptent pour toi.
            </p>
            <a
              href="/"
              className="inline-block rounded-xl bg-[#C9A961] px-6 py-3.5 font-medium text-[#0F1017] transition hover:bg-[#D4B570] active:scale-[0.98]"
            >
              Rejoindre l'aventure →
            </a>
            <p className="text-xs text-white/25 mt-3">
              Gratuit · 30 secondes · Sans engagement
            </p>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

          <p className="text-xs tracking-[0.2em] uppercase text-white/25">Ephemer</p>
          <p className="text-white/30 text-sm mt-2">
            N'oublie plus jamais les dates qui comptent.
          </p>
        </div>
      </main>
    )
  }

  // ══════════════════════════════════════════
  // FORMULAIRE
  // ══════════════════════════════════════════
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0F1017] via-[#15161F] to-[#0F1017] px-5 py-8 sm:py-12">
      <div className="w-full max-w-lg mx-auto">

        {/* ── En-tête ── */}
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-[0.25em] uppercase text-[#C9A961]/60 mb-4">
            Ephemer
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold text-white leading-snug">
            {prenomHote} veut penser à toi
            <br />
            <span className="text-white/40 font-normal text-base sm:text-lg">
              aux bons moments
            </span>
          </h1>
        </div>

        {/* ── Barre de progression ── */}
        <div className="flex gap-1.5 mb-8">
          {Array.from({ length: TOTAL_ETAPES }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i < etape ? 'bg-[#C9A961]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* ── Carte contenant l'étape ── */}
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-6 sm:p-8">

          {/* ════════ ÉTAPE 1 : IDENTITÉ ════════ */}
          {etape === 1 && (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">
                  Étape 1 sur {TOTAL_ETAPES}
                </p>
                <h2 className="text-lg font-medium text-white">
                  On commence par toi
                </h2>
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-2">
                  Ton prénom <span className="text-[#C9A961]">*</span>
                </label>
                <input
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Camille"
                  autoFocus
                  maxLength={80}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-[#C9A961]/50 focus:bg-white/[0.06] transition"
                />
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-2">
                  Ton nom <span className="text-white/25">(optionnel)</span>
                </label>
                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Durand"
                  maxLength={80}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-[#C9A961]/50 focus:bg-white/[0.06] transition"
                />
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-2">
                  Ton anniversaire 🎂
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <input
                    value={jour}
                    onChange={(e) => setJour(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    placeholder="Jour"
                    inputMode="numeric"
                    className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-3.5 text-center text-white placeholder-white/25 outline-none focus:border-[#C9A961]/50 transition"
                  />
                  <input
                    value={mois}
                    onChange={(e) => setMois(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    placeholder="Mois"
                    inputMode="numeric"
                    className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-3.5 text-center text-white placeholder-white/25 outline-none focus:border-[#C9A961]/50 transition"
                  />
                  <input
                    value={annee}
                    onChange={(e) => setAnnee(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Année"
                    inputMode="numeric"
                    className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-3.5 text-center text-white placeholder-white/25 outline-none focus:border-[#C9A961]/50 transition"
                  />
                </div>
                <p className="text-xs text-white/25 mt-2">
                  L'année n'est pas obligatoire, on ne dira rien 🤫
                </p>
              </div>
            </div>
          )}

          {/* ════════ ÉTAPE 2 : RELATION ════════ */}
          {etape === 2 && (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">
                  Étape 2 sur {TOTAL_ETAPES}
                </p>
                <h2 className="text-lg font-medium text-white">
                  {prenomHote} et toi, c'est…
                </h2>
                <p className="text-sm text-white/40 mt-1.5">
                  Ça l'aidera à trouver le bon ton.
                </p>
              </div>

              <div className="grid gap-2.5">
                {RELATIONS.map((r) => (
                  <button
                    key={r.valeur}
                    type="button"
                    onClick={() => setRelation(r.valeur)}
                    className={`flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all ${
                      relation === r.valeur
                        ? 'border-[#C9A961] bg-[#C9A961]/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="text-2xl">{r.emoji}</span>
                    <span className="flex-1">
                      <span className="block text-white font-medium">{r.label}</span>
                      <span className="block text-xs text-white/35 mt-0.5">{r.sous}</span>
                    </span>
                    {relation === r.valeur && (
                      <span className="text-[#C9A961] text-lg">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ════════ ÉTAPE 3 : INTÉRÊTS ════════ */}
          {etape === 3 && (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">
                  Étape 3 sur {TOTAL_ETAPES}
                </p>
                <h2 className="text-lg font-medium text-white">
                  Qu'est-ce qui te fait plaisir ?
                </h2>
                <p className="text-sm text-white/40 mt-1.5">
                  Touche tout ce qui te ressemble. Zéro pression, zéro limite.
                </p>
              </div>

              <div className="space-y-5 max-h-[45vh] overflow-y-auto pr-1 -mr-1">
                {GROUPES_INTERETS.map((groupe) => (
                  <div key={groupe.titre}>
                    <p className="text-xs text-white/35 mb-2.5">
                      {groupe.emoji} {groupe.titre}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {groupe.items.map((item) => {
                        const actif = interets.includes(item)
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleInteret(item)}
                            className={`rounded-full border px-3.5 py-2 text-sm transition-all active:scale-95 ${
                              actif
                                ? 'border-[#C9A961] bg-[#C9A961] text-[#0F1017] font-medium'
                                : 'border-white/12 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white'
                            }`}
                          >
                            {item}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {interets.length > 0 && (
                <p className="text-xs text-[#C9A961]">
                  {interets.length} choix — parfait, ça donne déjà de belles idées ✨
                </p>
              )}

              <div>
                <label className="block text-sm text-white/50 mb-2">
                  Autre chose ? <span className="text-white/25">(optionnel)</span>
                </label>
                <textarea
                  value={noteLibre}
                  onChange={(e) => setNoteLibre(e.target.value)}
                  placeholder="Ma passion secrète, ma taille de pull, ce que je ne veux surtout pas…"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-[#C9A961]/50 resize-none transition"
                />
                <p className="text-right text-xs text-white/20 mt-1">
                  {noteLibre.length}/500
                </p>
              </div>
            </div>
          )}

          {/* ════════ ÉTAPE 4 : CONTACT ════════ */}
          {etape === 4 && (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">
                  Dernière étape
                </p>
                <h2 className="text-lg font-medium text-white">
                  Où te souhaiter tout ça ?
                </h2>
                <p className="text-sm text-white/40 mt-1.5">
                  Uniquement pour que {prenomHote} puisse te joindre. Rien d'autre.
                </p>
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-2">
                  Email <span className="text-white/25">(optionnel)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="camille@exemple.com"
                  maxLength={160}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-[#C9A961]/50 transition"
                />
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-2">
                  Téléphone <span className="text-white/25">(optionnel)</span>
                </label>
                <div className="flex gap-2.5">
                  <select
                    value={indicatif}
                    onChange={(e) => setIndicatif(e.target.value)}
                    className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-3.5 text-white outline-none focus:border-[#C9A961]/50 transition"
                  >
                    {INDICATIFS.map((i) => (
                      <option key={i.code} value={i.code} className="bg-[#15161F]">
                        {i.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={tel}
                    onChange={(e) => setTel(e.target.value.replace(/[^0-9\s]/g, ''))}
                    placeholder="6 12 34 56 78"
                    inputMode="tel"
                    maxLength={20}
                    className="flex-1 rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-[#C9A961]/50 transition"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="text-xs text-white/40 leading-relaxed">
                  🔒 Ces informations sont visibles <strong className="text-white/60">uniquement
                  par {prenomHote}</strong>. Jamais revendues, jamais partagées.
                  Tu peux lui demander de les supprimer à tout moment.
                </p>
              </div>

              {erreur && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3">
                  <p className="text-sm text-red-300">{erreur}</p>
                </div>
              )}
            </div>
          )}

          {/* ════════ NAVIGATION ════════ */}
          <div className="flex items-center gap-3 mt-8">
            {etape > 1 && (
              <button
                type="button"
                onClick={() => setEtape(etape - 1)}
                disabled={envoi}
                className="rounded-xl border border-white/12 px-5 py-3.5 text-sm text-white/60 hover:text-white hover:border-white/25 transition disabled:opacity-40"
              >
                ← Retour
              </button>
            )}

            {etape < TOTAL_ETAPES ? (
              <button
                type="button"
                onClick={() => setEtape(etape + 1)}
                disabled={!etapeValide()}
                className="flex-1 rounded-xl bg-[#C9A961] px-5 py-3.5 font-medium text-[#0F1017] transition hover:bg-[#D4B570] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Continuer
              </button>
            ) : (
              <button
                type="button"
                onClick={envoyer}
                disabled={envoi}
                className="flex-1 rounded-xl bg-[#C9A961] px-5 py-3.5 font-medium text-[#0F1017] transition hover:bg-[#D4B570] disabled:opacity-50"
              >
                {envoi ? 'Un instant…' : 'C\'est envoyé ✨'}
              </button>
            )}
          </div>

          {/* Lien "passer" sur les étapes optionnelles */}
          {(etape === 3) && (
            <button
              type="button"
              onClick={() => setEtape(etape + 1)}
              className="w-full text-center text-xs text-white/30 hover:text-white/50 mt-4 transition"
            >
              Passer cette étape
            </button>
          )}
        </div>

        {/* ── Pied de page ── */}
        <div className="mt-8 space-y-4 text-center">
          {/* Invitation discrète à rejoindre Ephemer */}
          <div className="rounded-2xl border border-[#C9A961]/10 bg-[#C9A961]/[0.03] px-5 py-4">
            <p className="text-sm text-white/50 leading-relaxed mb-2">
              Toi aussi, tu as des gens qui comptent&nbsp;?
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-[#C9A961] hover:text-[#D4B570] transition font-medium"
            >
              Crée ton compte Ephemer et ne les oublie plus jamais
              <span className="text-base">→</span>
            </a>
          </div>

          {/* Liens légaux et signature */}
          <div className="flex items-center justify-center gap-4 text-xs">
            <a
              href="/confidentialite"
              className="text-white/25 hover:text-white/40 transition"
            >
              Confidentialité
            </a>
            <span className="text-white/10">·</span>
            <span className="text-white/20">
              Propulsé par <span className="text-white/35">Ephemer</span>
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}