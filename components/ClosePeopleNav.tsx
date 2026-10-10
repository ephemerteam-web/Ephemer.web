'use client'
import { usePathname } from 'next/navigation'
import { useContactDraft } from './ContactDraftProvider'
const pages = [['Contacts', '/dashboard/contacts'], ['Étoiles', '/dashboard/etoiles'], ['Invitations', '/dashboard/inviter']] as const
export default function ClosePeopleNav() {
  const path = usePathname(), { navigate } = useContactDraft()
  return <nav aria-label="Mes proches" className="mb-5 flex flex-wrap gap-2">{pages.map(([label, href]) => <button key={href} type="button" aria-current={path === href ? 'page' : undefined}
    onClick={() => void navigate(href)} className={'min-h-11 rounded-xl border border-line px-4 text-sm ' + (path === href ? 'bg-action text-on-action' : 'text-ink hover:bg-ink/5')}>{label}</button>)}</nav>
}
