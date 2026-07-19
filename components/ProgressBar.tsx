'use client'

type ProgressBarProps = {
  /** Valeur actuelle, entre 0 et 100 */
  progression: number
  /** Couleur de la barre (par défaut le doré du site) */
  couleur?: string
  /** Hauteur de la barre en pixels (par défaut fine, 6px) */
  hauteur?: number
  /** Affiche le pourcentage en texte à droite */
  afficherPourcentage?: boolean
}

export default function ProgressBar({
  progression,
  couleur = '#C8A84E',
  hauteur = 6,
  afficherPourcentage = false,
}: ProgressBarProps) {
  // Sécurité : on force la valeur entre 0 et 100 (évite un bug si jamais 150% ou -10% arrive)
  const valeurSecurisee = Math.min(100, Math.max(0, progression))

  return (
    <div className="flex items-center gap-2 w-full">
      <div
        className="w-full bg-white/10 rounded-full overflow-hidden"
        style={{ height: `${hauteur}px` }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${valeurSecurisee}%`,
            backgroundColor: couleur,
          }}
        />
      </div>

      {afficherPourcentage && (
        <span className="text-xs text-white/50 whitespace-nowrap">
          {Math.round(valeurSecurisee)}%
        </span>
      )}
    </div>
  )
}