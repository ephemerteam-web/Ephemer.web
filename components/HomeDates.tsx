'use client'

import Link from 'next/link'
import SaintDuJour from './SaintDuJour'
import ShareImageButton from './ShareImageButton'
import { eventImageFields } from '@/lib/image-projections'
import { daysBetween, parseLocalDay } from '@/lib/calendar-day'
import { eventLabels, type EventView } from '@/lib/personal-events'

// Un seul repère sur l'accueil : le saint public et les dates personnelles.
export default function HomeDates({ views, today }: { views: EventView[]; today: string }) {
  const upcoming = views.filter(view => view.date >= today && daysBetween(today, view.date) <= 30)
    .sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key))
  const current = upcoming.filter(view => view.date === today)
  const later = upcoming.filter(view => view.date > today)
  const recent = views.filter(view => view.kind === 'anniversaire' && view.date < today && daysBetween(view.date, today) <= 7)
    .sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key))
  return <section aria-labelledby="home-dates-title" className="mb-8 overflow-hidden rounded-3xl border border-accent/20 bg-linear-to-br from-accent/10 via-surface to-surface p-4 sm:p-6">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">Tes moments précieux</p>
        <h2 id="home-dates-title" className="text-xl font-bold text-ink sm:text-2xl">Aujourd&apos;hui et à venir</h2></div>
      <Link href="/dashboard/calendrier" className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-accent hover:bg-ink/5">Voir toutes les dates →</Link>
    </header>
    <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <SaintDuJour embedded day={today} />
      <div className="min-w-0 space-y-5">
        {current.length > 0 && <DateGroup title="À célébrer aujourd’hui" views={current} today={today} />}
        {later.length > 0 && <DateGroup title="Dans les 30 prochains jours" views={later} today={today} />}
        {upcoming.length === 0 && <p className="rounded-2xl border border-line bg-surface/60 p-4 text-sm text-muted">Aucune date personnelle prévue dans les 30 prochains jours.</p>}
        {recent.length > 0 && <DateGroup title="Anniversaires récents" views={recent} today={today} />}
      </div>
    </div>
  </section>
}

function DateGroup({ title, views, today }: { title: string; views: EventView[]; today: string }) {
  return <section aria-label={title} className="space-y-2">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
    {views.map(view => {
      const delay = daysBetween(today, view.date)
      const count = delay === 0 ? 'Aujourd’hui 🎉' : delay < 0 ? `Il y a ${-delay} jour${delay < -1 ? 's' : ''}` : `J‑${delay}`
      const icon = view.kind === 'anniversaire' ? '🎂' : view.kind === 'fete_prenomale' ? '🌸' : '◇'
      return <article key={view.key} className="rounded-2xl border border-line bg-surface/70 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="break-words font-semibold text-ink"><span aria-hidden="true">{icon} </span>{view.title}</p>
            <p className="mt-1 text-xs text-muted">{parseLocalDay(view.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · {eventLabels[view.kind] ?? 'Date personnelle'}{typeof view.age === 'number' ? ` · ${view.age} ans` : ''}</p>
          </div>
          <span className={'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ' + (delay === 0 ? 'bg-action text-on-action' : delay < 0 ? 'bg-orange-400/10 text-warning' : 'bg-action/10 text-accent')}>{count}</span>
        </div>
        {!view.reminder && view.event && <p className="mt-2 text-xs text-muted">Rappels suspendus</p>}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {view.occurrence && <Link className="inline-flex min-h-11 items-center text-sm font-medium text-accent" href={'/dashboard/preparer/' + view.occurrence.id}>Préparer cet événement →</Link>}
          <ShareImageButton title={view.title} fields={eventImageFields(view)} />
        </div>
      </article>
    })}
  </section>
}
