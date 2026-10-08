'use client'
import { useDashboardAvatar } from './DashboardAvatarContext'
import AvatarRenderer from './AvatarRenderer'

// Le nom ou le bouton adjacent porte le libellé : le portrait est décoratif.
export default function AccountAvatarBadge({ initiale, className = '', rounded = true }: { initiale?: string | null; className?: string; rounded?: boolean }) {
  const { config } = useDashboardAvatar()
  return <span aria-hidden="true" className={`flex h-full w-full items-center justify-center overflow-hidden ${rounded ? 'rounded-full' : 'rounded-2xl'} ${className}`}>
    {config ? <AvatarRenderer config={config} decorative className="h-full w-full" /> : initiale ? <span className="font-bold text-accent">{initiale}</span> : <span className="text-accent">👤</span>}
  </span>
}
