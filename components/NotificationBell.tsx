'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { calculerDateEvenement, TypeEvenement } from '@/lib/dates-evenements'
import { TYPES_EVENEMENT } from '@/lib/constants'

// --- Définition d'une notification en mémoire
type Notification = {
  id: string
  message: string
  lue: boolean
  created_at: string
}

// --- Liste des types d'événements qu'on veut surveiller
const EVENT_TYPES: TypeEvenement[] = ['anniversaire', 'fete_prenomale']

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [ouvert, setOuvert] = useState(false)
  const [loading, setLoading] = useState(true)

  // --- Fonction de génération des notifications
  const genererNotifications = useCallback(async () => {
    // 1. Vérifier la session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const userId = session.user.id

    // 2. Récupérer les contacts de l'utilisateur
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, prenom, nom, date_naissance')
      .eq('user_id', userId)

    if (error || !contacts) return

    const aujourdHui = new Date()
    aujourdHui.setHours(0, 0, 0, 0)

    // 3. Parcourir chaque contact
    for (const contact of contacts) {
      // On boucle sur les types d'événements qu'on gère
      for (const typeEvt of EVENT_TYPES) {
        // Calcul de la prochaine date de l'événement
        // On passe les infos nécessaires (prenom, date_naissance)
        const dateEvenement = calculerDateEvenement(typeEvt, {
          prenom: contact.prenom,
          date_naissance: contact.date_naissance,
        })

        // Si la fonction ne peut pas calculer (ex: date_naissance absente), on ignore
        if (!dateEvenement) continue

        // Vérifier si l'événement est aujourd'hui, demain ou dans 7 jours
        const dateJ = new Date(dateEvenement)
        dateJ.setHours(0, 0, 0, 0)

        const demain = new Date(aujourdHui)
        demain.setDate(demain.getDate() + 1)

        const j7 = new Date(aujourdHui)
        j7.setDate(j7.getDate() + 7)

        // Déterminer le type de notification à créer
        let typeNotification = ''
        let emoji = ''
        if (dateJ.getTime() === aujourdHui.getTime()) {
          typeNotification = `${typeEvt}_j0`
          emoji = '🎂'
        } else if (dateJ.getTime() === demain.getTime()) {
          typeNotification = `${typeEvt}_j1`
          emoji = '📅'
        } else if (dateJ.getTime() === j7.getTime()) {
          typeNotification = `${typeEvt}_j7`
          emoji = '⏰'
        } else {
          // Si l'événement n'est pas dans cette fenêtre, on passe
          continue
        }

        // 4. Vérifier si une notification existe déjà pour ce contact + type + date
        const { data: existantes } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('contact_id', contact.id)
          .eq('type', typeNotification)
          .eq('event_date', dateJ.toISOString().split('T')[0])
          .limit(1)

        if (existantes && existantes.length > 0) continue // déjà envoyé

        // 5. Construire un message adapté
        const nomComplet = `${contact.prenom} ${contact.nom}`
        let messageTexte = ''
        switch (typeNotification) {
          case 'anniversaire_j0':
            messageTexte = `${emoji} C'est l'anniversaire de ${nomComplet} aujourd'hui !`
            break
          case 'anniversaire_j1':
            messageTexte = `${emoji} L'anniversaire de ${nomComplet} est demain !`
            break
          case 'anniversaire_j7':
            messageTexte = `${emoji} L'anniversaire de ${nomComplet} est dans 7 jours.`
            break
          case 'fete_prenomale_j0':
            messageTexte = `${emoji} C'est la fête de ${contact.prenom} aujourd'hui !`
            break
          case 'fete_prenomale_j1':
            messageTexte = `${emoji} La fête de ${contact.prenom} est demain !`
            break
          case 'fete_prenomale_j7':
            messageTexte = `${emoji} La fête de ${contact.prenom} est dans 7 jours.`
            break
          default:
            messageTexte = `🔔 ${nomComplet} a un événement.`
        }

        // 6. Insérer la notification
        const { error: insertError } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            contact_id: contact.id,
            type: typeNotification,
            message: messageTexte,
            event_date: dateJ.toISOString().split('T')[0],
            lue: false,
          })

        if (insertError) {
          console.error('Erreur insertion notification :', insertError)
        }
      }
    } // fin for contact
  }, [])

  // --- Charger les notifications existantes
  const chargerNotifications = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from('notifications')
      .select('id, message, lue, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Erreur chargement notifications :', error)
      return
    }
    setNotifications(data as Notification[])
    setLoading(false)
  }, [])

  // --- À chaque montage du composant : générer + charger
  useEffect(() => {
    async function init() {
      setLoading(true)
      await genererNotifications()
      await chargerNotifications()
    }
    init()
  }, [genererNotifications, chargerNotifications])

  // --- Marquer une notification comme lue
  async function marquerLue(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ lue: true })
      .eq('id', id)

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lue: true } : n))
      )
    }
  }

  // --- Nombre de notifications non lues
  const nbNonLues = notifications.filter((n) => !n.lue).length

  return (
    <div className="relative">
      {/* Icone cloche */}
      <button
        onClick={() => setOuvert(!ouvert)}
        className="relative p-2 rounded-full hover:bg-white/10 transition"
        title="Notifications"
      >
        <span className="text-xl">🔔</span>
        {nbNonLues > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {nbNonLues}
          </span>
        )}
      </button>

      {/* Panneau déroulant */}
      {ouvert && (
        <>
          {/* Fond sombre pour fermer en cliquant à l'extérieur */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOuvert(false)}
          />

          <div className="absolute right-0 top-12 w-80 max-h-96 bg-gray-900 text-white rounded-xl shadow-2xl z-40 overflow-y-auto border border-gray-700">
            <div className="p-3 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-sm">📬 Notifications</h3>
              <button
                onClick={() => setOuvert(false)}
                className="text-gray-400 hover:text-white text-xs"
              >
                Fermer ✕
              </button>
            </div>

            {loading ? (
              <p className="p-4 text-sm text-gray-400">Chargement...</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">Aucune notification</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => marquerLue(notif.id)}
                    className={`p-3 cursor-pointer transition-colors ${
                      notif.lue
                        ? 'bg-transparent hover:bg-gray-800/50'
                        : 'bg-purple-900/20 hover:bg-purple-900/30'
                    }`}
                  >
                    <p className="text-sm pr-2">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notif.created_at).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
