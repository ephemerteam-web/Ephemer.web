// Icône personnalisée : Lune + IA (réseau de neurones accentué)
// On peut changer sa taille avec la prop "size" et sa couleur via "className"

type Props = {
  size?: number
  className?: string
}

export default function IconeLuneIA({ size = 48, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Croissant de lune */}
      <path
        d="M44 32c0 11.046-8.954 20-20 20-2.5 0-4.9-.46-7.1-1.3C26.3 49.2 33 41.4 33 32s-6.7-17.2-16.1-18.7C19.1 12.46 21.5 12 24 12c11.046 0 20 8.954 20 20z"
        fill="url(#moonGradient)"
      />

      {/* ===== RÉSEAU DE NEURONES ACCENTUÉ ===== */}
      <g filter="url(#glow)">
        {/* Lignes de connexion — maillage plus dense */}
        <line x1="38" y1="18" x2="48" y2="14" stroke="#C7D2FE" strokeWidth="1.5" strokeOpacity="0.8" />
        <line x1="48" y1="14" x2="54" y2="24" stroke="#C7D2FE" strokeWidth="1.5" strokeOpacity="0.8" />
        <line x1="38" y1="18" x2="44" y2="30" stroke="#C7D2FE" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="54" y1="24" x2="50" y2="36" stroke="#C7D2FE" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="44" y1="30" x2="50" y2="36" stroke="#C7D2FE" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="48" y1="14" x2="44" y2="30" stroke="#C7D2FE" strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="38" y1="18" x2="50" y2="36" stroke="#C7D2FE" strokeWidth="1.5" strokeOpacity="0.4" />
        <line x1="50" y1="36" x2="42" y2="42" stroke="#C7D2FE" strokeWidth="1.5" strokeOpacity="0.5" />

        {/* Nœuds principaux (gros) */}
        <circle cx="38" cy="18" r="3.5" fill="#FFFFFF" />
        <circle cx="54" cy="24" r="3.5" fill="#FFFFFF" />
        <circle cx="50" cy="36" r="3" fill="#FFFFFF" />

        {/* Nœuds secondaires (petits) */}
        <circle cx="48" cy="14" r="2.5" fill="#E0E7FF" />
        <circle cx="44" cy="30" r="2.5" fill="#E0E7FF" />
        <circle cx="42" cy="42" r="2" fill="#C7D2FE" />
      </g>

      {/* Petite étoile décorative */}
      <path
        d="M19 24l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"
        fill="white"
        fillOpacity="0.9"
      />

      {/* ===== DÉFINITIONS (dégradé + lueur) ===== */}
      <defs>
        <linearGradient id="moonGradient" x1="16" y1="12" x2="44" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E0E7FF" />
          <stop offset="1" stopColor="#A5B4FC" />
        </linearGradient>

        {/* Effet de lueur autour des neurones */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  )
}
