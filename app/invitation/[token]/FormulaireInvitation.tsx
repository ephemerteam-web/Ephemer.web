'use client'

import { partialBirthDate } from '@/lib/contact-quality'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useBrowserValue } from '@/lib/hooks/useBrowserValue'

type InvitationProps = { token: string; prenomHote: string }
export default function FormulaireInvitation(props: InvitationProps) {
  const ready = useBrowserValue(() => true, false)
  return ready ? <InvitationForm key={props.token} {...props} /> : <p>Chargement du formulaire...</p>
}

function readDraft(token: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('invitation-' + token) || '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  } catch { return {} }
}
import { supabase } from '@/lib/supabase-browser'
import { GROUPES_INTERETS, INDICATIFS } from './interets'


const RELATIONS = [
  { valeur: 'famille', emoji: '🏡', label: 'Famille',  sous: 'On partage bien plus qu\'un nom' },
  { valeur: 'amis',    emoji: '✨', label: 'Ami·e',    sous: 'Choisi·e, pas subi·e' },
  { valeur: 'pro',     emoji: '💼', label: 'Pro',      sous: 'Collègue, client, partenaire' },
  { valeur: 'autre',   emoji: '🌍', label: 'Autre',    sous: 'Voisin, prof, coéquipier…' },
]

const TOTAL_ETAPES = 4

// Messages motivants selon l'étape
const MESSAGES_PROGRESSION = [
  'On commence !',
  'Presque !',
  'Dernière ligne droite !',
  'C\'est parti !'
]

function InvitationForm({
  token,
  prenomHote,
}: {
  token: string
  prenomHote: string
}) {
  const [draft] = useState(() => readDraft(token))
  const texte = (key: string, fallback = '') => typeof draft[key] === 'string' ? draft[key] as string : fallback
  const [etape, setEtape] = useState(1)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [termine, setTermine] = useState(false)

  // ── Champs du formulaire
  const [prenom, setPrenom] = useState(() => texte('prenom'))
  const [nom, setNom] = useState(() => texte('nom'))
  const [jour, setJour] = useState(() => texte('jour'))
  const [mois, setMois] = useState(() => texte('mois'))
  const [annee, setAnnee] = useState(() => texte('annee'))
  const [relation, setRelation] = useState(() => texte('relation'))
  const [interets, setInterets] = useState<string[]>(() => Array.isArray(draft.interets) ? draft.interets.filter((v): v is string => typeof v === 'string') : [])
  const [noteLibre, setNoteLibre] = useState(() => texte('noteLibre'))
  const [email, setEmail] = useState(() => texte('email'))
  const [indicatif, setIndicatif] = useState(() => texte('indicatif', '+33'))
  const [tel, setTel] = useState(() => texte('tel'))
  const [modalInteretsOuvert, setModalInteretsOuvert] = useState(false)

  // ── 💾 Sauvegarde automatique (localStorage)
  // Sauvegarder à chaque changement
  useEffect(() => {
    const data = {
      prenom, nom, jour, mois, annee, relation,
      interets, noteLibre, email, indicatif, tel
    }
    if (termine) return
    try { localStorage.setItem(`invitation-${token}`, JSON.stringify(data)) } catch { /* Stockage indisponible : le formulaire reste utilisable. */ }
  }, [prenom, nom, jour, mois, annee, relation, interets, noteLibre, email, indicatif, tel, token, termine])

  // Nettoyer après succès
  useEffect(() => {
    if (termine) {
      try { localStorage.removeItem(`invitation-${token}`) } catch { /* Stockage indisponible. */ }
    }
  }, [termine, token])

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
    const date = partialBirthDate(jour, mois, annee)
    if (!date) return null
    if (date.year === null) throw new Error('Une date sans année ne peut pas encore être enregistrée. Laisse les trois champs vides pour continuer sans date, ou renseigne une date complète connue.')
    return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
  }

  // ── Envoi final
  const envoyer = async () => {
    setErreur(null)
    let birth: string | null
    try { birth = construireDate() } catch (error) { setErreur(error instanceof Error ? error.message : 'Date invalide'); return }
    setEnvoi(true)

    // On fusionne les bulles cochées et le texte libre dans "note"
    const morceaux: string[] = []
    if (interets.length) morceaux.push(interets.join(', '))
    if (noteLibre.trim()) morceaux.push(noteLibre.trim())
    const note = morceaux.join(' — ') || null

    const { data, error } = await supabase.rpc('soumettre_invitation', {
      p_token: token,
      p_prenom: prenom.trim(),
      p_nom: nom.trim() || null,
      p_date_naissance: birth,
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

    // Le contact est enregistré par la RPC. Les alertes à l’hôte sont
    // suspendues tant qu’une soumission ne peut pas être identifiée sûrement.

    setTermine(true)
  }

  // ══════════════════════════════════════════
  // ÉCRAN DE REMERCIEMENT
  // ══════════════════════════════════════════
  if (termine) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-canvas via-surface to-canvas flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-6 animate-bounce">🎉</div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-ink mb-4">
            C&apos;est noté, {prenom} !
          </h1>

          <p className="text-muted leading-relaxed mb-8">
            {prenomHote} a maintenant tout ce qu&apos;il faut pour penser à toi
            au bon moment. Tu peux fermer cette page.
          </p>

          <div className="rounded-2xl border border-accent/20 bg-action/[0.04] p-5 mb-8">
            <p className="text-accent text-sm">
              🔒 Tes informations sont visibles uniquement par {prenomHote}.
            </p>
          </div>

          {/* ── Invitation à rejoindre Ephemer ── */}
          <div className="rounded-2xl border border-line bg-ink/[0.03] p-6 mb-8">
            <p className="text-3xl mb-3">✨</p>
            <h3 className="text-ink font-medium text-base sm:text-lg mb-2">
              Et si tu faisais pareil pour tes proches&nbsp;?
            </h3>
            <p className="text-sm text-muted leading-relaxed mb-5">
              Crée ton compte Ephemer et ne plus jamais oublier les anniversaires,
              fêtes et moments importants des gens qui comptent pour toi.
            </p>
            <Link
              href="/"
              className="inline-block rounded-xl bg-action px-6 py-3.5 font-medium text-on-action transition hover:bg-action active:scale-[0.98]"
            >
              Rejoindre l&apos;aventure →
            </Link>
            <p className="text-xs text-muted mt-3">
              Gratuit · 30 secondes · Sans engagement
            </p>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-ink/10 to-transparent mb-8" />

          <p className="text-xs tracking-[0.2em] uppercase text-muted">Ephemer</p>
          <p className="text-muted text-sm mt-2">
            N&apos;oublie plus jamais les dates qui comptent.
          </p>
        </div>
      </main>
    )
  }

  // ══════════════════════════════════════════
  // FORMULAIRE
  // ══════════════════════════════════════════
  return (
    <main className="min-h-screen bg-gradient-to-b from-canvas via-surface to-canvas px-5 py-8 sm:py-12">
      <div className="w-full max-w-lg mx-auto">

        {/* ── En-tête ── */}
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-[0.25em] uppercase text-accent/60 mb-4">
            Ephemer
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold text-ink leading-snug">
            {prenomHote} veut penser à toi
            <br />
            <span className="text-muted font-normal text-base sm:text-lg">
              aux bons moments
            </span>
          </h1>
        </div>

        {/* ── Barre de progression + message motivant ── */}
        <div className="mb-8">
          <div className="flex gap-1.5 mb-2">
            {Array.from({ length: TOTAL_ETAPES }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i < etape ? 'bg-action' : 'bg-ink/10'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs text-accent/70 font-medium">
            {MESSAGES_PROGRESSION[etape - 1]}
          </p>
        </div>

        {/* ── Carte contenant l'étape ── */}
        <div className="rounded-3xl border border-line bg-ink/[0.03] backdrop-blur-sm p-6 sm:p-8">

          {/* ════════ ÉTAPE 1 : IDENTITÉ ════════ */}
          {etape === 1 && (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted mb-2">
                  Étape 1 sur {TOTAL_ETAPES}
                </p>
                <h2 className="text-lg font-medium text-ink">
                  On commence par toi
                </h2>
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">
                  Ton prénom <span className="text-accent">*</span>
                </label>
                <input
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Camille"
                  autoFocus
                  maxLength={80}
                  className="w-full rounded-xl bg-ink/[0.04] border border-line px-4 py-3.5 text-ink placeholder-muted outline-none focus:border-accent/50 focus:bg-ink/[0.06] transition"
                />
                {prenom.trim().length === 0 && (
                  <p className="text-xs text-muted mt-2">
                    💡 Commence par ton prénom pour continuer
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">
                  Ton nom <span className="text-muted">(optionnel)</span>
                </label>
                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Durand"
                  maxLength={80}
                  className="w-full rounded-xl bg-ink/[0.04] border border-line px-4 py-3.5 text-ink placeholder-muted outline-none focus:border-accent/50 focus:bg-ink/[0.06] transition"
                />
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">
                  Ton anniversaire 🎂
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <input
                    value={jour}
                    onChange={(e) => setJour(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    placeholder="Jour"
                    inputMode="numeric"
                    className="rounded-xl bg-ink/[0.04] border border-line px-3 py-3.5 text-center text-ink placeholder-muted outline-none focus:border-accent/50 transition"
                  />
                  <input
                    value={mois}
                    onChange={(e) => setMois(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    placeholder="Mois"
                    inputMode="numeric"
                    className="rounded-xl bg-ink/[0.04] border border-line px-3 py-3.5 text-center text-ink placeholder-muted outline-none focus:border-accent/50 transition"
                  />
                  <input
                    value={annee}
                    onChange={(e) => setAnnee(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Année"
                    inputMode="numeric"
                    className="rounded-xl bg-ink/[0.04] border border-line px-3 py-3.5 text-center text-ink placeholder-muted outline-none focus:border-accent/50 transition"
                  />
                </div>
                <p className="text-xs text-muted mt-2">
                  Date complète facultative. Si tu ignores l’année, laisse les trois champs vides : aucune année fictive ne sera enregistrée.
                </p>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEtape(etape + 1)}
                  disabled={!etapeValide()}
                  className="flex-1 rounded-xl bg-action px-5 py-3.5 font-medium text-on-action transition hover:bg-action disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* ════════ ÉTAPE 2 : RELATION ════════ */}
          {etape === 2 && (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted mb-2">
                  Étape 2 sur {TOTAL_ETAPES}
                </p>
                <h2 className="text-lg font-medium text-ink">
                  {prenomHote} et toi, c&apos;est…
                </h2>
                <p className="text-sm text-muted mt-1.5">
                  Ça l&apos;aidera à trouver le bon ton.
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
                        ? 'border-accent bg-action/10'
                        : 'border-line bg-ink/[0.02] hover:border-line hover:bg-ink/[0.05]'
                    }`}
                  >
                    <span className="text-2xl">{r.emoji}</span>
                    <span className="flex-1">
                      <span className="block text-ink font-medium">{r.label}</span>
                      <span className="block text-xs text-muted mt-0.5">{r.sous}</span>
                    </span>
                    {relation === r.valeur && (
                      <span className="text-accent text-lg">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEtape(etape - 1)}
                  disabled={envoi}
                  className="rounded-xl border border-line px-5 py-3.5 text-sm text-muted hover:text-ink hover:border-line transition disabled:opacity-40"
                >
                  ← Retour
                </button>
                <button
                  type="button"
                  onClick={() => setEtape(etape + 1)}
                  disabled={!etapeValide()}
                  className="flex-1 rounded-xl bg-action px-5 py-3.5 font-medium text-on-action transition hover:bg-action disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

                           {/* ════════ ÉTAPE 3 : INTÉRÊTS ════════ */}
          {etape === 3 && (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted mb-2">
                  Étape 3 sur {TOTAL_ETAPES}
                </p>
                <h2 className="text-lg font-medium text-ink">
                  Qu&apos;est-ce qui te fait plaisir ?
                </h2>
                <p className="text-sm text-muted mt-1.5">
                  Choisis tes centres d&apos;intérêt pour aider {prenomHote} à trouver de bonnes idées.
                </p>
              </div>

              {/* ── Bouton pour ouvrir le sélecteur plein écran ── */}
              {interets.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setModalInteretsOuvert(true)}
                  className="w-full rounded-2xl border-2 border-dashed border-accent/30 bg-action/[0.04] px-6 py-5 text-left transition hover:border-accent/50 hover:bg-action/[0.08] active:scale-[0.99]"
                >
                  <span className="text-2xl block mb-2">🎯</span>
                  <span className="text-ink font-medium block">
                    Choisir mes centres d&apos;intérêt
                  </span>
                  <span className="text-sm text-muted mt-1 block">
                    Touche ce qui te ressemble — c&apos;est rapide !
                  </span>
                </button>
              ) : (
                <div className="rounded-2xl border border-accent/20 bg-action/[0.06] px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-action text-on-action flex items-center justify-center text-xs font-bold">
                        {interets.length}
                      </span>
                      <span className="text-ink font-medium text-sm">
                        centre{interets.length > 1 ? 's' : ''} d&apos;intérêt choisi{interets.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalInteretsOuvert(true)}
                      className="text-xs text-accent hover:text-accent transition flex items-center gap-1"
                    >
                      ✏️ Modifier
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {interets.slice(0, 8).map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-action/15 border border-accent/25 px-2.5 py-1 text-xs text-accent"
                      >
                        {item}
                      </span>
                    ))}
                    {interets.length > 8 && (
                      <span className="rounded-full bg-ink/[0.05] border border-line px-2.5 py-1 text-xs text-muted">
                        +{interets.length - 8} autres
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Champ "Autre chose" ── */}
              <div>
                <label className="block text-sm text-muted mb-2">
                  Autre chose à ajouter ? <span className="text-muted">(optionnel)</span>
                </label>
                <textarea
                  value={noteLibre}
                  onChange={(e) => setNoteLibre(e.target.value)}
                  placeholder="Ma passion secrète, ma taille de pull, ce que je ne veux surtout pas…"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-xl bg-ink/[0.04] border border-line px-4 py-3.5 text-ink placeholder-muted outline-none focus:border-accent/50 resize-none transition"
                />
                <p className="text-right text-xs text-muted mt-1">
                  {noteLibre.length}/500
                </p>
              </div>

              {/* ── Navigation ── */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEtape(etape - 1)}
                  disabled={envoi}
                  className="rounded-xl border border-line px-5 py-3.5 text-sm text-muted hover:text-ink hover:border-line transition disabled:opacity-40"
                >
                  ← Retour
                </button>
                <button
                  type="button"
                  onClick={() => setEtape(etape + 1)}
                  className="flex-1 rounded-xl bg-action px-5 py-3.5 font-medium text-on-action transition hover:bg-action"
                >
                  Continuer
                </button>
              </div>
              <button
                type="button"
                onClick={() => setEtape(etape + 1)}
                className="w-full text-center text-xs text-muted hover:text-muted transition"
              >
                Passer cette étape
              </button>
            </div>
          )}

          {/* ════════ MODAL PLEIN ÉCRAN : SÉLECTEUR D'INTÉRÊTS ════════ */}
          {modalInteretsOuvert && (
            <div className="fixed inset-0 z-50 flex flex-col bg-canvas">
              {/* ── Barre du haut ── */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-line">
                <button
                  type="button"
                  onClick={() => setModalInteretsOuvert(false)}
                  className="text-muted hover:text-ink transition text-sm flex items-center gap-1"
                >
                  ✕ Fermer
                </button>
                <div className="flex items-center gap-2">
                  {interets.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-action/15 border border-accent/30 text-accent text-xs font-medium">
                      {interets.length} choisi{interets.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Titre + suggestions ── */}
              <div className="flex-shrink-0 px-5 pt-5 pb-3">
                <h2 className="text-xl font-semibold text-ink mb-1">
                  Qu&apos;est-ce qui te fait plaisir ?
                </h2>
                <p className="text-sm text-muted">
                  Touche tout ce qui te ressemble.
                </p>
                {interets.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const populaires = ['Cinéma', 'Musique', 'Voyage', 'Cuisine', 'Lecture', 'Nature', 'Photographie', 'Jeux vidéo']
                      const aCocher = populaires.filter(p =>
                        GROUPES_INTERETS.some(g => g.items.includes(p))
                      )
                      setInterets(aCocher)
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-action/10 border border-accent/25 px-4 py-2 text-sm text-accent hover:bg-action/20 transition"
                  >
                    ⚡ Suggestions populaires
                  </button>
                )}
              </div>

              {/* ── Zone scrollable (tout l'espace restant) ── */}
              <div className="flex-1 overflow-y-auto px-5 py-3 -webkit-overflow-scrolling-touch">
                <div className="space-y-6 pb-6">
                  {GROUPES_INTERETS.map((groupe) => (
                    <div key={groupe.titre}>
                      <p className="text-xs text-muted mb-2.5 uppercase tracking-wider">
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
                              className={`rounded-full border px-4 py-2.5 text-sm transition-all active:scale-95 min-h-[44px] ${
                                actif
                                  ? 'border-accent bg-action text-on-action font-medium'
                                  : 'border-line bg-ink/[0.03] text-muted hover:border-line hover:text-ink hover:bg-ink/[0.06]'
                              }`}
                            >
                              {actif && <span className="mr-1">✓</span>}
                              {item}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Bouton valider en bas (fixe) ── */}
              <div className="flex-shrink-0 px-5 py-4 border-t border-line bg-canvas">
                <button
                  type="button"
                  onClick={() => setModalInteretsOuvert(false)}
                  className="w-full rounded-xl bg-action px-5 py-4 font-medium text-on-action transition hover:bg-action active:scale-[0.98] text-base"
                >
                  {interets.length > 0
                    ? `Valider mes ${interets.length} choix ✨`
                    : 'Valider (aucun choix)'}
                </button>
              </div>
            </div>
          )}

          {/* ════════ ÉTAPE 4 : CONTACT ════════ */}
          {etape === 4 && (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted mb-2">
                  Dernière étape
                </p>
                <h2 className="text-lg font-medium text-ink">
                  Où te souhaiter tout ça ?
                </h2>
                <p className="text-sm text-muted mt-1.5">
                  Uniquement pour que {prenomHote} puisse te joindre. Rien d&apos;autre.
                </p>
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">
                  Email <span className="text-muted">(optionnel)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="camille@exemple.com"
                  maxLength={160}
                  className="w-full rounded-xl bg-ink/[0.04] border border-line px-4 py-3.5 text-ink placeholder-muted outline-none focus:border-accent/50 transition"
                />
              </div>

                            <div>
                <label className="block text-sm text-muted mb-2">
                  Téléphone <span className="text-muted">(optionnel)</span>
                </label>
                <div className="flex gap-2.5">
                  <select
                    value={indicatif}
                    onChange={(e) => setIndicatif(e.target.value)}
                    className="w-[110px] flex-shrink-0 rounded-xl bg-ink/[0.04] border border-line px-3 py-3.5 text-ink outline-none focus:border-accent/50 transition appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23ffffff80%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8"
                  >
                    {INDICATIFS.map((i) => (
                      <option key={i.code} value={i.code} className="bg-surface">
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
                    maxLength={15}
                    className="flex-1 min-w-0 rounded-xl bg-ink/[0.04] border border-line px-4 py-3.5 text-ink placeholder-muted outline-none focus:border-accent/50 transition"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-ink/[0.02] p-4">
                <p className="text-xs text-muted leading-relaxed">
                  🔒 Ces informations sont visibles <strong className="text-muted">uniquement
                  par {prenomHote}</strong>. Jamais revendues, jamais partagées.
                  Tu peux lui demander de les supprimer à tout moment.
                </p>
              </div>

              {erreur && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3">
                  <p className="text-sm text-danger">{erreur}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEtape(etape - 1)}
                  disabled={envoi}
                  className="rounded-xl border border-line px-5 py-3.5 text-sm text-muted hover:text-ink hover:border-line transition disabled:opacity-40"
                >
                  ← Retour
                </button>
                <button
                  type="button"
                  onClick={envoyer}
                  disabled={envoi}
                  className="flex-1 rounded-xl bg-action px-5 py-3.5 font-medium text-on-action transition hover:bg-action disabled:opacity-50"
                >
                  {envoi ? 'Un instant…' : 'C\'est envoyé ✨'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Pied de page ── */}
        <div className="mt-8 space-y-4 text-center">
          <div className="rounded-2xl border border-accent/10 bg-action/[0.03] px-5 py-4">
            <p className="text-sm text-muted leading-relaxed mb-2">
              Toi aussi, tu as des gens qui comptent&nbsp;?
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent transition font-medium"
            >
              Crée ton compte Ephemer et ne les oublie plus jamais
              <span className="text-base">→</span>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs">
            <a
              href="/confidentialite"
              className="text-muted hover:text-muted transition"
            >
              Confidentialité
            </a>
            <span className="text-muted">·</span>
            <span className="text-muted">
              Propulsé par <span className="text-muted">Ephemer</span>
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
