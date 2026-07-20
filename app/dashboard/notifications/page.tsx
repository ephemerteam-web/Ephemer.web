'use client'
// "use client" = ce composant tourne dans le NAVIGATEUR
// (il a besoin des clics, du state React, etc.)

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

// ─── Types ──────────────────────────────────────────────────────────────────

// Une notification telle qu'elle existe dans la table Supabase
type Notification = {
  id: string
  user_id: string
  contact_id: number
  type: string
  message: string
  lue: boolean
  event_date: string
  created_at: string
  event_description: string | null
}

// Les préférences de notification (1 ligne par utilisateur)
type Preferences = {
  canal_email: boolean
  canal_push: boolean
  rappel_j7: boolean
  rappel_j1: boolean
  rappel_jourj: boolean
  newsletter_mensuelle: boolean
}

// Valeurs par défaut si l'utilisateur n'a pas encore de préférences enregistrées
const PREFS_DEFAUT: Preferences = {
  canal_email: true,
  canal_push: false,
  rappel_j7: true,
  rappel_j1: false,
  rappel_jourj: true,
  newsletter_mensuelle: false,
}

// ─── Petit composant "interrupteur" (toggle) réutilisable ─────────────────────

function Toggle({
  actif,
  onChange,
  titre,
  description,
  emoji,
}: {
  actif: boolean
  onChange: (v: boolean) => void
  titre: string
  description: string
  emoji: string
}) {
  return (
    <button
      onClick={() => onChange(!actif)}
      className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition text-left"
    >
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-2xl flex-shrink-0">{emoji}</span>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm">{titre}</p>
          <p className="text-white/40 text-xs mt-0.5">{description}</p>
        </div>
      </div>

      {/* L'interrupteur visuel */}
      <div
        className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors ${
          actif ? 'bg-indigo-500' : 'bg-white/15'
        }`}
      >
        <div
          className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            actif ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
    </button>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CentreNotifications() {
  const router = useRouter()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [prefs, setPrefs] = useState<Preferences>(PREFS_DEFAUT)
  const [chargement, setChargement] = useState(true)
  const [sauvegardePrefs, setSauvegardePrefs] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Onglet actif : "liste" ou "parametres"
  const [onglet, setOnglet] = useState<'liste' | 'parametres'>('liste')

  // ─── Chargement initial (notifications + préférences) ───────────────────────
  const chargerTout = useCallback(async () => {
    setChargement(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/connexion')
      return
    }
    setUserId(user.id)

    // 1) Les notifications (les plus récentes en premier)
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('event_date', { ascending: true })

    setNotifications(notifs || [])

    // 2) Les préférences
    const { data: pref } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle() // maybeSingle = 0 ou 1 ligne (ne plante pas si vide)

    if (pref) {
      setPrefs({
        canal_email: pref.canal_email,
        canal_push: pref.canal_push,
        rappel_j7: pref.rappel_j7,
        rappel_j1: pref.rappel_j1,
        rappel_jourj: pref.rappel_jourj,
        newsletter_mensuelle: pref.newsletter_mensuelle,
      })
    }

    setChargement(false)
  }, [router])

  useEffect(() => {
    chargerTout()
  }, [chargerTout])

  // ─── Actions sur les notifications ──────────────────────────────────────────

  // Marquer une notif comme lue
  async function marquerLue(id: string) {
    // Mise à jour visuelle immédiate (optimiste)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lue: true } : n))
    )
    await supabase.from('notifications').update({ lue: true }).eq('id', id)
  }

  // Tout marquer comme lu
  async function toutMarquerLu() {
    if (!userId) return
    setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })))
    await supabase
      .from('notifications')
      .update({ lue: true })
      .eq('user_id', userId)
      .eq('lue', false)
  }

  // Supprimer une notif
  async function supprimer(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  // ─── Sauvegarde des préférences ─────────────────────────────────────────────

  // On change une préférence ET on sauvegarde immédiatement
  async function changerPref(cle: keyof Preferences, valeur: boolean) {
    if (!userId) return

    const nouvellesPrefs = { ...prefs, [cle]: valeur }
    setPrefs(nouvellesPrefs) // mise à jour visuelle immédiate
    setSauvegardePrefs(true)

    // upsert = insère la ligne si elle n'existe pas, sinon la met à jour
    await supabase.from('notification_preferences').upsert({
      user_id: userId,
      ...nouvellesPrefs,
      updated_at: new Date().toISOString(),
    })

    setSauvegardePrefs(false)
  }

  // ─── Helper d'affichage d'une date en français ──────────────────────────────
  function formaterDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Compteur de notifications non lues
  const nonLues = notifications.filter((n) => !n.lue).length

  // ─── Affichage ──────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">

        {/* ===== EN-TÊTE ===== */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">🔔 Centre de notifications</h1>
          <p className="text-white/40 mt-1">
            Consulte tes alertes et règle tes préférences.
          </p>
        </div>

        {/* ===== ONGLETS ===== */}
        <div className="flex gap-2 mb-6 bg-white/[0.03] p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => setOnglet('liste')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
              onglet === 'liste'
                ? 'bg-indigo-500 text-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            📬 Mes notifications
            {nonLues > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold bg-rose-500 text-white rounded-full">
                {nonLues}
              </span>
            )}
          </button>
          <button
            onClick={() => setOnglet('parametres')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
              onglet === 'parametres'
                ? 'bg-indigo-500 text-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            ⚙️ Paramètres
          </button>
        </div>

        {/* ===== CHARGEMENT (skeleton) ===== */}
        {chargement ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-white/[0.03] border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {/* ================= ONGLET LISTE ================= */}
            {onglet === 'liste' && (
              <div>
                {/* Bouton "tout marquer lu" */}
                {nonLues > 0 && (
                  <div className="flex justify-end mb-3">
                    <button
                      onClick={toutMarquerLu}
                      className="text-xs text-indigo-300 hover:text-indigo-200 font-semibold transition"
                    >
                      ✓ Tout marquer comme lu
                    </button>
                  </div>
                )}

                {/* Liste vide */}
                {notifications.length === 0 ? (
                  <div className="text-center py-16 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <span className="text-5xl">📭</span>
                    <p className="text-white font-semibold mt-4">
                      Aucune notification
                    </p>
                    <p className="text-white/40 text-sm mt-1">
                      Tes prochains événements apparaîtront ici.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 rounded-2xl border transition ${
                          notif.lue
                            ? 'bg-white/[0.02] border-white/5'
                            : 'bg-indigo-500/10 border-indigo-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm ${
                                notif.lue ? 'text-white/60' : 'text-white font-medium'
                              }`}
                            >
                              {/* Pastille "non lu" */}
                              {!notif.lue && (
                                <span className="inline-block w-2 h-2 bg-indigo-400 rounded-full mr-2" />
                              )}
                              {notif.message}
                            </p>
                            <p className="text-white/30 text-xs mt-1.5">
                              📅 {formaterDate(notif.event_date)}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            {!notif.lue && (
                              <button
                                onClick={() => marquerLue(notif.id)}
                                className="text-xs text-indigo-300 hover:text-indigo-200 font-semibold whitespace-nowrap"
                                title="Marquer comme lu"
                              >
                                ✓ Lu
                              </button>
                            )}
                            <button
                              onClick={() => supprimer(notif.id)}
                              className="text-xs text-rose-400/70 hover:text-rose-400 font-semibold"
                              title="Supprimer"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ================= ONGLET PARAMÈTRES ================= */}
            {onglet === 'parametres' && (
              <div className="space-y-6">
                {/* Petit indicateur de sauvegarde */}
                {sauvegardePrefs && (
                  <p className="text-xs text-emerald-400 text-right">
                    💾 Sauvegarde…
                  </p>
                )}

                {/* --- Bloc : Canaux --- */}
                <div>
                  <h2 className="text-white font-bold text-lg mb-3">
                    📡 Comment être prévenu ?
                  </h2>
                  <div className="space-y-3">
                    <Toggle
                      emoji="📧"
                      titre="Par email"
                      description="Recevoir les alertes dans ta boîte mail."
                      actif={prefs.canal_email}
                      onChange={(v) => changerPref('canal_email', v)}
                    />
                    <Toggle
                      emoji="🔔"
                      titre="Notifications push"
                      description="Recevoir une alerte sur ton appareil."
                      actif={prefs.canal_push}
                      onChange={(v) => changerPref('canal_push', v)}
                    />
                  </div>
                </div>

                {/* --- Bloc : Quand --- */}
                <div>
                  <h2 className="text-white font-bold text-lg mb-3">
                    ⏰ Quand être prévenu ?
                  </h2>
                  <div className="space-y-3">
                    <Toggle
                      emoji="7️⃣"
                      titre="7 jours avant"
                      description="Un rappel une semaine à l'avance."
                      actif={prefs.rappel_j7}
                      onChange={(v) => changerPref('rappel_j7', v)}
                    />
                    <Toggle
                      emoji="1️⃣"
                      titre="1 jour avant"
                      description="Un rappel la veille de l'événement."
                      actif={prefs.rappel_j1}
                      onChange={(v) => changerPref('rappel_j1', v)}
                    />
                    <Toggle
                      emoji="🎯"
                      titre="Le jour J"
                      description="Un rappel le jour même."
                      actif={prefs.rappel_jourj}
                      onChange={(v) => changerPref('rappel_jourj', v)}
                    />
                  </div>
                </div>

                {/* --- Bloc : Newsletter --- */}
                <div>
                  <h2 className="text-white font-bold text-lg mb-3">
                    📰 Résumé mensuel
                  </h2>
                  <Toggle
                    emoji="🗓"
                    titre="Newsletter du mois"
                    description="Recevoir la liste des événements du mois à venir."
                    actif={prefs.newsletter_mensuelle}
                    onChange={(v) => changerPref('newsletter_mensuelle', v)}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}