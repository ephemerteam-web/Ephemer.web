// lib/date-utils.ts
// ============================================
// 📅 FICHIER CENTRAL — TOUTES les fonctions liées aux dates
// (anniversaires, fêtes prénomales, jours fériés, formatage...)
// ============================================

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
  | 'jour_special'

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
  jour_special: '⭐ Jour spécial',
}

// ============================================
// 🛡️ FORMATAGE DE DATES (sans décalage UTC)
// ============================================

// Formate une date en "YYYY-MM-DD" SANS décalage de fuseau horaire
// (contrairement à toISOString() qui convertit en UTC et peut décaler d'1 jour)
export function formatDateLocale(date: Date): string {
  const annee = date.getFullYear()
  const mois = String(date.getMonth() + 1).padStart(2, '0')
  const jour = String(date.getDate()).padStart(2, '0')
  return `${annee}-${mois}-${jour}`
}

// Formate une date en français
// Si avecJourSemaine = true → "lundi 15 mars 2025"
// Sinon → "15 mars 2025"
export function formaterDateFR(date: Date | null | undefined, avecJourSemaine = false) {
  // 🛡️ Sécurité : si la date n'existe pas, on renvoie un texte par défaut
  if (!date) return 'Date inconnue'

  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
  if (avecJourSemaine) {
    options.weekday = 'long'
  }
  return date.toLocaleDateString('fr-FR', options)
}

// ============================================
// 🛠️ FONCTIONS UTILITAIRES INTERNES
// ============================================

// Nettoie un prénom pour comparaison
// "Hélène" → "helene"
function normaliserPrenom(prenom: string): string {
  return prenom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Renvoie la prochaine occurrence d'une date "MM-JJ"
function prochaineOccurrence(mois: number, jour: number): Date {
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)

  const annee = aujourdhui.getFullYear()
  let date = new Date(annee, mois - 1, jour)

  if (date < aujourdhui) {
    date = new Date(annee + 1, mois - 1, jour)
  }

  return date
}

// Calcule la prochaine date d'anniversaire à partir d'une date de naissance
function prochainAnniversaire(dateNaissance: string): Date {
  const naissance = new Date(dateNaissance)
  return prochaineOccurrence(naissance.getMonth() + 1, naissance.getDate())
}

// Trouve la fête prénomale d'un contact dans saints.ts
function prochaineFetePrenomale(prenom: string): Date | null {
  const prenomNormalise = normaliserPrenom(prenom)
  const saint = SAINTS.find(s => s.prenoms.includes(prenomNormalise))
  if (!saint) return null

  const [mois, jour] = saint.date.split('-').map(Number)
  return prochaineOccurrence(mois, jour)
}

// Nombre de jours entre aujourd'hui et une date donnée
function joursRestants(date: Date): number {
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)

  const cible = new Date(date)
  cible.setHours(0, 0, 0, 0)

  const differenceMs = cible.getTime() - aujourdhui.getTime()
  return Math.round(differenceMs / (1000 * 60 * 60 * 24))
}

// ============================================
// 🎯 FONCTION PRINCIPALE : calcule la date d'un événement
// ============================================
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
      // ⚠️ Approximation (dernier dimanche de mai) — à affiner plus tard
      return prochaineOccurrence(5, 26)

    case 'fete_des_peres':
      // ⚠️ Approximation (3e dimanche de juin) — à affiner plus tard
      return prochaineOccurrence(6, 16)

    case 'paques':
      // ⚠️ Approximation — calcul exact à faire plus tard
      return prochaineOccurrence(4, 20)

    default:
      return null
  }
}

// ============================================
// 🎯 CALCUL DES DATES J-30, J-7, J-1, JOUR J
// ============================================
export function calculerDatesJ7J1JourJ(dateEvenement: Date): {
  jourJ: Date
  j1: Date
  j7: Date
} {
  const jourJ = new Date(dateEvenement)

  const j1 = new Date(dateEvenement)
  j1.setDate(j1.getDate() - 1)

  const j7 = new Date(dateEvenement)
  j7.setDate(j7.getDate() - 7)

  return { jourJ, j1, j7 }
}

// ============================================
// 📋 ÉVÉNEMENTS À VENIR (pour la cloche + favoris)
// ============================================

export type ContactMinimal = {
  id: string
  prenom: string | null
  nom?: string | null
  date_naissance?: string | null
}

export type EvenementAVenir = {
  contactId: string
  prenom: string
  nom: string
  type: 'anniversaire' | 'fete_prenomale'
  date: Date
  jours: number
}

// Donne la liste de TOUS les événements (anniv + fête) entre J0 et J+fenetreJours
export function evenementsAVenir(
  contacts: ContactMinimal[],
  fenetreJours: number = 7
): EvenementAVenir[] {
  const resultats: EvenementAVenir[] = []
  const typesAChercher: TypeEvenement[] = ['anniversaire', 'fete_prenomale']

  for (const contact of contacts) {
    if (!contact.prenom) continue

    for (const type of typesAChercher) {
      const date = calculerDateEvenement(type, {
        prenom: contact.prenom,
        date_naissance: contact.date_naissance,
      })

      if (!date) continue

      const jours = joursRestants(date)

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

  resultats.sort((a, b) => a.jours - b.jours)
  return resultats
}

// Le PROCHAIN événement d'UN SEUL contact (utile pour FavorisRow)
export function prochainEvenementContact(
  contact: ContactMinimal
): EvenementAVenir | null {
  const events = evenementsAVenir([contact], 365)
  return events.length > 0 ? events[0] : null
}
// Calcule la prochaine date d'anniversaire, les jours restants et l'âge à venir
export function calculerProchainAnniversaire(dateNaissance: string) {
  const naissance = new Date(dateNaissance)
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)

  const anneeActuelle = aujourdhui.getFullYear()

  // Anniversaire cette année
  let prochainAnniv = new Date(
    anneeActuelle,
    naissance.getMonth(),
    naissance.getDate()
  )

  // Si déjà passé, on prend l'année prochaine
  if (prochainAnniv < aujourdhui) {
    prochainAnniv = new Date(
      anneeActuelle + 1,
      naissance.getMonth(),
      naissance.getDate()
    )
  }

  // Nombre de jours restants
  const diffMs = prochainAnniv.getTime() - aujourdhui.getTime()
  const joursRestants = Math.round(diffMs / (1000 * 60 * 60 * 24))

  // Âge qu'aura la personne à ce prochain anniversaire
  const ageAVenir = prochainAnniv.getFullYear() - naissance.getFullYear()

  return {
    date: prochainAnniv,
    joursRestants,
    ageAVenir,
  }
}