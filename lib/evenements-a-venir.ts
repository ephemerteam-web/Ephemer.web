// lib/evenements-a-venir.ts
// ============================================
// 🎯 FICHIER LOGIQUE COMMUN
// Utilisé par la cloche (NotificationBell) ET la ligne des favoris (FavorisRow)
// But : calculer les événements à venir dans les N prochains jours
// ============================================

import { calculerDateEvenement, TypeEvenement } from './dates-evenements'

// 📋 Le "contact minimal" dont on a besoin pour calculer un événement
// (on ne demande que ces 3 champs, pas tout le contact)
export type ContactMinimal = {
  id: number
  prenom: string | null
  nom?: string | null
  date_naissance?: string | null
}

// 📦 Le résultat renvoyé pour chaque événement trouvé
export type EvenementAVenir = {
  contactId: number
  prenom: string
  nom: string
  type: 'anniversaire' | 'fete_prenomale'  // les 2 types qu'on gère ici
  date: Date          // la date exacte de l'événement
  jours: number       // dans combien de jours (0 = aujourd'hui)
}

// 🧮 Petite fonction : combien de jours entre aujourd'hui et une date ?
// Renvoie 0 si c'est aujourd'hui, 1 si demain, etc.
function joursRestants(date: Date): number {
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0) // on ignore l'heure

  const cible = new Date(date)
  cible.setHours(0, 0, 0, 0)

  const differenceMs = cible.getTime() - aujourdhui.getTime()
  return Math.round(differenceMs / (1000 * 60 * 60 * 24)) // ms → jours
}

// 🎯 FONCTION PRINCIPALE
// Donne la liste de TOUS les événements (anniversaire + fête) qui tombent
// entre aujourd'hui et "fenetreJours" jours plus tard.
//
// Exemple : evenementsAVenir(mesContacts, 7)
//   → tous les événements des 7 prochains jours (donc J0 à J7)
export function evenementsAVenir(
  contacts: ContactMinimal[],
  fenetreJours: number = 7
): EvenementAVenir[] {
  const resultats: EvenementAVenir[] = []

  // Les 2 types d'événements liés à un contact
  const typesAChercher: TypeEvenement[] = ['anniversaire', 'fete_prenomale']

  for (const contact of contacts) {
    // On ignore un contact sans prénom (impossible de calculer)
    if (!contact.prenom) continue

    for (const type of typesAChercher) {
      // On réutilise TA fonction existante (elle gère déjà les accents !)
      const date = calculerDateEvenement(type, {
        prenom: contact.prenom,
        date_naissance: contact.date_naissance,
      })

      // Pas de date trouvée (ex: prénom absent de saints.ts) → on saute
      if (!date) continue

      const jours = joursRestants(date)

      // ✅ On garde SEULEMENT si c'est entre aujourd'hui (0) et la fenêtre (7)
      if (jours >= 0 && jours <= fenetreJours) {
        resultats.push({
          contactId: contact.id,
          prenom: contact.prenom,
          nom: contact.nom ?? '',
          type: type as 'anniversaire' | 'fete_prenomale',
          date,
          jours,
        })
      }
    }
  }

  // On trie du plus proche au plus lointain (J0 en premier)
  resultats.sort((a, b) => a.jours - b.jours)

  return resultats
}

// 🎯 VARIANTE PRATIQUE : le PROCHAIN événement d'UN SEUL contact
// (utile pour FavorisRow qui affiche 1 badge par favori)
// Ici on regarde plus loin (365 jours) car on veut toujours afficher qqchose.
export function prochainEvenementContact(
  contact: ContactMinimal
): EvenementAVenir | null {
  const events = evenementsAVenir([contact], 365)
  return events.length > 0 ? events[0] : null
}