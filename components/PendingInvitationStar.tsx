'use client'

import { useEtoiles } from './etoiles/EtoilesContext'

export default function PendingInvitationStar() {
  const { recues, loading, error, offline } = useEtoiles()
  if (loading || error || offline || recues.length === 0) return null
  const label = `${recues.length} invitation${recues.length > 1 ? 's' : ''} en attente`
  return <span role="img" aria-label={label} title={label}
    className="inline-block text-lg leading-none text-accent drop-shadow-[0_0_6px_var(--accent)] motion-safe:animate-pulse">✦</span>
}
