'use client'

import { usePathname } from 'next/navigation'
import { useContactDraft } from './ContactDraftProvider'
import { DATE_PAGES } from '@/lib/navigation'

// Les décomptes restent accessibles à côté du calendrier sur tous les écrans.
export default function DatesNav() {
  const pathname = usePathname()
  const { navigate } = useContactDraft()
  return <nav aria-label="Vues des dates" className="flex flex-wrap gap-2">
    {DATE_PAGES.map(page => <button key={page.href} type="button"
      aria-current={pathname === page.href ? 'page' : undefined}
      onClick={() => void navigate(page.href)}
      className={'min-h-11 rounded-xl border border-line px-3 py-2 text-sm font-medium transition hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' + (pathname === page.href ? 'bg-action/10 text-accent' : 'text-muted')}>
      <span aria-hidden="true" className="mr-2">{page.icon}</span>{page.label}
    </button>)}
  </nav>
}
