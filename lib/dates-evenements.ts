// lib/dates-evenements.ts
// Ce fichier sait calculer la date d'envoi d'un message
// selon le type d'événement choisi.

import { SAINTS } from './saints'

// 📋 Liste des types d'événements gérés
export type TypeEvenement =
  | 'anniversaire'
  | 'fete_prenomale'
  | 'nouvel_an'
  | 'noel'
  | 'saint_valentin'
  | 'fete_des_meres'
  | 'fete_des_peres'
  | 'paques'

// 🛠️ Petite fonction utilitaire : nettoie un prénom
// "Hélène" → "helene" (pour comparer avec saints.ts)
function normaliserPrenom(prenom: string): string {
  return prenom
    .toLowerCase()
    .normalize('NFD')              // sépare les accents des lettres
    .replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .trim()
}

// 📅 Renvoie la prochaine occurrence d'une date "MM-JJ"
// Ex: si on est le 15 nov 2025 et qu'on cherche "12-25" → 25 déc 2025
//     si on est le 30 déc 2025 et qu'on cherche "01-01" → 1er janv 2026
function prochaineOccurrence(mois: number, jour: number): Date {
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0) // on ignore l'heure

  const annee = aujourdhui.getFullYear()
  let date = new Date(annee, mois - 1, jour) // attention: mois commence à 0

  if (date < aujourdhui) {
    date = new Date(annee + 1, mois - 1, jour)
  }

  return date
}

// 🎂 Calcule la prochaine date d'anniversaire à partir d'une date de naissance
function prochainAnniversaire(dateNaissance: string): Date {
  const naissance = new Date(dateNaissance)
  return prochaineOccurrence(naissance.getMonth() + 1, naissance.getDate())
}

// 🌟 Trouve la fête prénomale d'un contact dans saints.ts
function prochaineFetePrenomale(prenom: string): Date | null {
  const prenomNormalise = normaliserPrenom(prenom)

  // On cherche un saint dont la liste de prénoms contient le nôtre
  const saint = SAINTS.find(s => s.prenoms.includes(prenomNormalise))

  if (!saint) return null // pas trouvé

  // saint.date est au format "MM-JJ"
  const [mois, jour] = saint.date.split('-').map(Number)
  return prochaineOccurrence(mois, jour)
}

// 🎯 FONCTION PRINCIPALE : calcule la date d'envoi
// selon le type d'événement et les infos du contact
export function calculerDateEvenement(
  typeEvenement: TypeEvenement,
  contact: { prenom: string; date_naissance?: string | null }
): Date | null {
  switch (typeEvenement) {
    case 'anniversaire':
      if (!contact.date_naissance) return null
      return prochainAnniversaire(contact.date_naissance)

    case 'fete_prenomale':
      return prochaineFetePrenomale(contact.prenom)

    case 'nouvel_an':
      return prochaineOccurrence(1, 1)

    case 'saint_valentin':
      return prochaineOccurrence(2, 14)

    case 'noel':
      return prochaineOccurrence(12, 25)

    case 'fete_des_meres':
      // ⚠️ Date variable en France (dernier dimanche de mai)
      // Pour simplifier, on prend le 26 mai (à affiner plus tard)
      return prochaineOccurrence(5, 26)

    case 'fete_des_peres':
      // ⚠️ 3e dimanche de juin (variable aussi)
      return prochaineOccurrence(6, 16)

    case 'paques':
      // ⚠️ Date qui change chaque année (calcul complexe)
      // On mettra le calcul exact plus tard
      return prochaineOccurrence(4, 20)

    default:
      return null
  }
}

// 🏷️ Joli label pour l'affichage (utile pour l'UI)
export const LABELS_EVENEMENTS: Record<TypeEvenement, string> = {
  anniversaire: '🎂 Anniversaire',
  fete_prenomale: '🌟 Fête prénomale',
  nouvel_an: '🎊 Nouvel An',
  saint_valentin: '💝 Saint-Valentin',
  noel: '🎄 Noël',
  fete_des_meres: '💐 Fête des Mères',
  fete_des_peres: '👔 Fête des Pères',
  paques: '🐰 Pâques',
}
