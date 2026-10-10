'use client'
import { usePathname } from 'next/navigation'
import { useContactDraft } from './ContactDraftProvider'
import { MAIN_SPACES, activeSpace } from '@/lib/navigation'
import PendingInvitationStar from './PendingInvitationStar'

export default function MainSpaces() {
  const selected = activeSpace(usePathname()), { navigate } = useContactDraft()
  return <nav aria-label="Espaces principaux" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:static md:mx-auto md:max-w-5xl md:border-0 md:bg-transparent">
    {MAIN_SPACES.map(space => <button key={space.href} type="button" aria-current={selected === space.href ? 'page' : undefined}
      onClick={() => void navigate(space.href)} className={'flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold sm:text-sm md:min-h-12 md:flex-row md:gap-2 ' + (selected === space.href ? 'bg-action/10 text-accent' : 'text-muted hover:bg-ink/5')}>
      <span aria-hidden="true" className="text-xl">{space.icon}</span><span className="flex items-center justify-center gap-1">{space.label}{space.href === '/dashboard/contacts' && <PendingInvitationStar />}</span>
    </button>)}
  </nav>
}
