// components/ProgressRing.tsx

interface ProgressRingProps {
  joursRestants: number
  estAujourdhui: boolean
}

export default function ProgressRing({ joursRestants, estAujourdhui }: ProgressRingProps) {
  // ── Calcul de la progression sur 365 jours ──
  const progression = Math.max(0, Math.min(100, (1 - joursRestants / 365) * 100))
  const circulaire = 283.5 // Circonférence du cercle (2 * π * 45)
  const offset = circulaire * (progression / 100)

  // ── Calcul du pulse : plus fort si proche (J-0), très léger si loin (J-365) ──
  const intensitePulse = Math.max(0.1, Math.min(1, 1 - joursRestants / 365))

  // Classes d'animation conditionnelles
  const pulseClass = estAujourdhui
    ? `animate-pulse`
    : joursRestants <= 30
    ? `animate-pulse opacity-${Math.round(intensitePulse * 100)}`
    : ''

  return (
    <div className={`relative w-16 h-16 flex items-center justify-center shrink-0 ${pulseClass}`} style={{
      opacity: estAujourdhui ? 1 : intensitePulse,
    }}>
      {/* SVG pour le cercle */}
      <svg className="absolute w-full h-full" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 0 8px rgba(200, 168, 78, 0.3))' }}>
        {/* Cercle de fond gris */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />

        {/* Cercle de progression doré */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#C8A84E"
          strokeWidth="2.5"
          strokeDasharray={`${offset} ${circulaire}`}
          strokeLinecap="round"
          strokeDashoffset="0"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
      </svg>

      {/* 👇 MODIFIÉ : "J-" avant le chiffre */}
      <div className="relative z-10 text-center">
        {estAujourdhui ? (
          <div className="text-2xl animate-bounce">🎉</div>
        ) : (
          <div className="flex items-baseline gap-0.5 justify-center">
  <span className="text-sm font-bold text-white">J-</span>
  <span className="text-sm font-bold text-white">
    {joursRestants}
  </span>
</div>
        )}
      </div>
    </div>
  )
}