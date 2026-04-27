import { SAINTS } from './saints'

// Calcule le prochain anniversaire d'un contact
export function calculerProchainAnniversaire(dateNaissance: string) {
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)

  const naissance = new Date(dateNaissance)
  const anneeActuelle = aujourdhui.getFullYear()

  // Anniversaire cette année
  let prochainAnniv = new Date(
    anneeActuelle,
    naissance.getMonth(),
    naissance.getDate()
  )

  // Si déjà passé → on prend l'année prochaine
  if (prochainAnniv < aujourdhui) {
    prochainAnniv = new Date(
      anneeActuelle + 1,
      naissance.getMonth(),
      naissance.getDate()
    )
  }

  // Nombre de jours restants
  const msParJour = 1000 * 60 * 60 * 24
  const joursRestants = Math.round(
    (prochainAnniv.getTime() - aujourdhui.getTime()) / msParJour
  )

  // Âge qu'il/elle aura
  const ageAVenir = prochainAnniv.getFullYear() - naissance.getFullYear()

  return {
    prochainAnniv,
    joursRestants,
    ageAVenir,
  }
}

// Formate une date en français (ex: "15 mars 2025")
export function formaterDateFR(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// --- NOUVEAU : FONCTIONS LIÉES AUX FÊTES ---

// Nettoie un prénom pour faciliter la comparaison
// Ex: "Hélène" → "helene", "MARIE" → "marie", " Tom " → "tom"
function normaliserPrenom(prenom: string): string {
  return prenom
    .toLowerCase()                                   // minuscules
    .normalize('NFD')                                // sépare les accents des lettres
    .replace(/[\u0300-\u036f]/g, '')                 // supprime les accents
    .trim()                                          // enlève les espaces au début/fin
}

// Cherche la fête correspondant à un prénom
// Retourne null si aucune fête trouvée
export function trouverFete(prenom: string) {
  const prenomNormalise = normaliserPrenom(prenom)

  // On parcourt toutes les fêtes pour trouver celle qui contient ce prénom
  const fete = SAINTS.find((s) =>
    s.prenoms.includes(prenomNormalise)
  )

  if (!fete) return null

  return {
    date: fete.date,           // "MM-JJ"
    nomSaint: fete.nomSaint,   // "Saint Joseph"
  }
}

// Calcule la prochaine occurrence d'une fête (date "MM-JJ")
export function calculerProchaineFete(dateFete: string) {
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)

  // On extrait le mois et le jour depuis "MM-JJ"
  const [moisStr, jourStr] = dateFete.split('-')
  const mois = parseInt(moisStr, 10) - 1  // -1 car janvier = 0 en JavaScript
  const jour = parseInt(jourStr, 10)

  const anneeActuelle = aujourdhui.getFullYear()

  // Fête cette année
  let prochaineFete = new Date(anneeActuelle, mois, jour)

  // Si déjà passée → année prochaine
  if (prochaineFete < aujourdhui) {
    prochaineFete = new Date(anneeActuelle + 1, mois, jour)
  }

  // Jours restants
  const msParJour = 1000 * 60 * 60 * 24
  const joursRestants = Math.round(
    (prochaineFete.getTime() - aujourdhui.getTime()) / msParJour
  )

  return {
    prochaineFete,
    joursRestants,
  }
}
