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