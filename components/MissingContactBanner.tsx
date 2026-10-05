import Link from 'next/link'
import type { Contact } from '@/types/database'

type BannerContact = Pick<Contact, 'id' | 'prenom' | 'nom'>

// Les deux pages conservent leur propre calcul des contacts à compléter.
export default function MissingContactBanner({ contacts, reason, actionLabel }: {
  contacts: BannerContact[]
  reason: string
  actionLabel: string
}) {
  if (!contacts.length) return null
  const remaining = contacts.length - 5
  const moreLink = remaining > 0 ? (
    <Link href="/dashboard/contacts" aria-label={`Voir les ${remaining} autres contacts`}
      className="inline-flex min-h-11 items-center rounded-full px-2.5 py-1.5 text-xs underline underline-offset-2 hover:bg-canvas/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
      + {remaining} autre{remaining > 1 ? 's' : ''}
    </Link>
  ) : null

  return (
    <section aria-label={`Contacts ${reason}`}
      className="grid min-w-0 grid-cols-1 items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-warning sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-y-1">
      <p className="min-w-0 font-medium sm:col-start-1 sm:row-start-1">
        <span aria-hidden="true">⚠️ </span>
        <strong>{contacts.length}</strong> contact{contacts.length > 1 ? 's' : ''} {reason}
      </p>

      <ul aria-label="Contacts à compléter" className="flex min-w-0 flex-wrap gap-1 sm:col-start-1 sm:row-start-2">
        {contacts.slice(0, 5).map(contact => {
          const name = [contact.prenom, contact.nom].filter(Boolean).join(' ').trim()
          return (
            <li key={contact.id} className="min-w-0 max-w-full">
              <Link href={`/dashboard/contacts/${contact.id}/edit`}
                aria-label={`Modifier ${name || 'le contact sans prénom'}`}
                className="inline-flex min-h-11 max-w-full items-center rounded-full border border-orange-500/30 bg-canvas/60 px-2.5 py-1.5 text-xs font-medium underline underline-offset-2 [overflow-wrap:anywhere] transition-colors hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                {contact.prenom?.trim() || 'Sans prénom'}
              </Link>
            </li>
          )
        })}
        {moreLink && <li className="hidden min-w-0 max-w-full sm:block">{moreLink}</li>}
      </ul>

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1 sm:contents">
        {moreLink && <span className="mr-auto sm:hidden">{moreLink}</span>}
        <Link href="/dashboard/contacts"
        className="inline-flex min-h-11 max-w-full items-center justify-self-end gap-2 rounded-xl border border-orange-500/40 bg-ink/5 px-3 py-2 text-xs font-medium transition-colors hover:bg-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:self-start sm:text-sm">
        <span aria-hidden="true">✏️</span>{actionLabel}
        </Link>
      </div>
    </section>
  )
}
