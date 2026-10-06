'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode, type KeyboardEvent } from 'react'
import Modal from './Modal'
import { SAINTS, SAINTS_PAR_DATE } from '@/lib/saints'
import { daysBetween, parisDay, parseLocalDay } from '@/lib/calendar-day'
import { eventLabels, type EventView } from '@/lib/personal-events'
import { adjacentMonth, calendarEvents, eventGroup, monthDays, selectedCalendarDay, type CalendarFilter } from '@/lib/calendar-presentation'

const button = 'min-h-11 rounded-xl border border-line px-3 text-sm font-medium transition hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const groups = { birthday: { icon: '✦', label: 'Anniversaire', color: 'text-accent' }, feast: { icon: '❋', label: 'Fête prénomale', color: 'text-info' }, personal: { icon: '◇', label: 'Date personnelle', color: 'text-success' } }
const fullDate = (date: string) => parseLocalDay(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR')

// Présentation des seules occurrences autorisées ; aucun stockage navigateur.
export default function CalendarExperience({ month, onMonthChange, views, contactIds, listSelector, manageDates, status }: {
  month: string; onMonthChange: (month: string) => void; views: EventView[]; contactIds: Set<number> | null; listSelector: ReactNode; manageDates: ReactNode; status?: ReactNode
}) {
  const [mode, setMode] = useState<'month' | 'agenda'>('month')
  const [filter, setFilter] = useState<CalendarFilter>('all')
  const [requested, setRequested] = useState<string | null>(null)
  const [mobileDetails, setMobileDetails] = useState(false)
  const [today, setToday] = useState(parisDay)
  const [search, setSearch] = useState('')
  const dayButtons = useRef(new Map<string, HTMLButtonElement>())
  useEffect(() => {
    const timer = setInterval(() => setToday(parisDay()), 60_000)
    const desktop = window.matchMedia('(min-width: 1024px)')
    const close = () => { if (desktop.matches) setMobileDetails(false) }
    desktop.addEventListener('change', close)
    return () => { clearInterval(timer); desktop.removeEventListener('change', close) }
  }, [])
  const events = useMemo(() => calendarEvents(views, month, filter, contactIds), [views, month, filter, contactIds])
  const selected = selectedCalendarDay(month, requested, today, events)
  const days = monthDays(month)
  const byDay = useMemo(() => {
    const result = new Map<string, EventView[]>()
    for (const event of events) result.set(event.date, [...(result.get(event.date) ?? []), event])
    return result
  }, [events])
  const next = events.find(event => event.date >= today)
  const delay = next ? daysBetween(today, next.date) : 0
  const monthLabel = parseLocalDay(`${month}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const dayEvents = byDay.get(selected) ?? []
  const query = normalize(search.trim())
  const results = query ? SAINTS.filter(saint => normalize(saint.nomSaint).includes(query) || saint.prenoms.some(name => normalize(name).includes(query))).slice(0, 20) : []
  function navigate(nextMonth: string) { setRequested(null); setMobileDetails(false); onMonthChange(nextMonth) }
  function choose(date: string, showDetails = true) {
    setRequested(date)
    if (showDetails && !window.matchMedia('(min-width: 1024px)').matches) setMobileDetails(true)
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const actual = days.filter((day): day is string => day !== null)
    const index = actual.indexOf(date)
    const offset: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    const column = (parseLocalDay(date).getDay() + 6) % 7
    const target = event.key === 'Home' ? index - column : event.key === 'End' ? index + 6 - column : index + (offset[event.key] ?? 0)
    if (!(event.key in offset) && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const nextDay = actual[Math.max(0, Math.min(actual.length - 1, target))]
    choose(nextDay, false); dayButtons.current.get(nextDay)?.focus()
  }
  const details = <DayDetails date={selected} events={dayEvents} />
  return <div className="mx-auto max-w-6xl space-y-5 px-3 pb-8 sm:px-6">
    <header className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute right-6 top-4 select-none text-6xl text-accent/15 sm:text-8xl">✧</div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">Tes moments précieux</p>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mon calendrier</h1>
      <p className="mt-2 max-w-lg text-sm text-muted">Un petit repère pour chaque grande attention.</p>
    </header>

    <section aria-label="Navigation et filtres du calendrier" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 sm:gap-3">
          <button className={button} aria-label="Mois précédent" onClick={() => navigate(adjacentMonth(month, -1))}>←</button>
          <h2 aria-live="polite" className="min-w-36 text-center text-lg font-semibold capitalize sm:min-w-48 sm:text-xl">{monthLabel}</h2>
          <button className={button} aria-label="Mois suivant" onClick={() => navigate(adjacentMonth(month, 1))}>→</button>
        </div>
        <button className={button} onClick={() => { navigate(today.slice(0, 7)); setRequested(today) }}>Aujourd&apos;hui</button>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="grid flex-1 grid-cols-2 gap-3">
          {listSelector}
          <label className="text-sm">Événements<select className="block min-h-11 w-full rounded-lg border border-line bg-surface p-2 text-ink" value={filter} onChange={event => { setFilter(event.target.value as CalendarFilter); setMobileDetails(false) }}>
            <option value="all">Tous</option><option value="birthday">Anniversaires</option><option value="feast">Fêtes</option><option value="personal">Dates personnelles</option>
          </select></label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-line p-1" role="group" aria-label="Vue du calendrier">
            {(['month', 'agenda'] as const).map(value => <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)} className={`min-h-10 rounded-lg px-4 text-sm font-medium ${mode === value ? 'bg-action text-on-action' : 'text-muted hover:bg-ink/5'}`}>{value === 'month' ? 'Mois' : 'Agenda'}</button>)}
          </div>
          {manageDates}
        </div>
      </div>
    </section>

    {status ? <div>{status}</div> : <><section aria-label="Prochain événement du mois" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4 sm:p-5">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="text-3xl text-accent">✧</span>
        <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wider text-accent">Prochain événement du mois</p>
          {next ? <><p className="mt-1 font-semibold [overflow-wrap:anywhere]">{next.title}{next.contact ? ` · ${next.contact.prenom ?? ''}` : ''}</p><p className="text-sm text-muted">{delay === 0 ? 'Aujourd’hui' : delay === 1 ? 'Demain' : `Dans ${delay} jours`} · {parseLocalDay(next.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p></>
            : <p className="mt-1 text-sm text-muted">Aucun événement à venir dans ce mois avec ces filtres.</p>}
        </div>
      </div>
      {next && <button className={button} onClick={() => choose(next.date)}>Voir ce jour <span aria-hidden="true">↗</span></button>}
    </section>

    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section aria-label={mode === 'month' ? 'Vue mensuelle' : 'Agenda du mois'} className="min-w-0 rounded-3xl border border-line bg-surface p-3 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-semibold">{mode === 'month' ? 'Les jours à célébrer' : 'Au fil du mois'}</h2><span className="text-xs text-muted">{events.length} événement{events.length > 1 ? 's' : ''}</span></div>
        {mode === 'month' ? <>
          <div className="mb-2 grid grid-cols-7">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => <span key={day} className="py-2 text-center text-xs text-muted">{day}</span>)}</div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2" role="group" aria-label={`Jours de ${monthLabel}`}>
            {days.map((date, index) => {
              if (!date) return <div aria-hidden="true" key={`empty-${index}`} />
              const items = byDay.get(date) ?? []
              const categories = [...new Set(items.map(item => eventGroup(item.kind)))]
              return <button key={date} ref={node => { if (node) dayButtons.current.set(date, node); else dayButtons.current.delete(date) }}
                tabIndex={selected === date ? 0 : -1} aria-pressed={selected === date} aria-current={date === today ? 'date' : undefined}
                aria-label={`${fullDate(date)}, ${items.length} événement${items.length > 1 ? 's' : ''}${date === today ? ', aujourd’hui' : ''}`}
                onKeyDown={event => keyboard(event, date)} onClick={() => choose(date)}
                className={`flex min-h-16 min-w-0 flex-col rounded-xl border p-1.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:min-h-24 sm:p-2 xl:min-h-28 ${selected === date ? 'border-accent bg-accent/10' : date === today ? 'border-accent/50 bg-ink/5' : items.length ? 'border-line bg-ink/[0.025] hover:bg-ink/5' : 'border-transparent hover:bg-ink/5'}`}>
                <span className={`flex w-full items-center justify-between text-sm font-semibold ${date === today || date === selected ? 'text-accent' : 'text-ink'}`}><span>{Number(date.slice(8))}</span>{date === today && <span aria-hidden="true" className="text-xs">•</span>}</span>
                <span aria-hidden="true" className="mt-1 flex items-center gap-1 text-xs sm:hidden">{categories.map(group => <span key={group} className={groups[group].color}>{groups[group].icon}</span>)}{items.length > 0 && <span className="ml-auto text-muted">{items.length}</span>}</span>
                <span aria-hidden="true" className="mt-2 hidden w-full space-y-1 sm:block">{items.slice(0, 2).map(item => <span key={item.key} className="flex min-w-0 items-center gap-1 text-[10px] xl:text-xs"><span className={groups[eventGroup(item.kind)].color}>{groups[eventGroup(item.kind)].icon}</span><span className="truncate">{item.contact?.prenom || item.title}</span></span>)}{items.length > 2 && <span className="block text-[10px] text-muted">+ {items.length - 2}</span>}</span>
              </button>
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4">{Object.entries(groups).map(([key, group]) => <span key={key} className="flex items-center gap-1.5 text-xs text-muted"><span aria-hidden="true" className={group.color}>{group.icon}</span>{group.label}</span>)}</div>
          {!events.length && <p className="mt-4 text-sm text-muted">Aucun événement dans ce mois avec ces filtres. Le calendrier des saints reste disponible.</p>}
        </> : <div className="space-y-4">
          {!events.length && <p className="py-6 text-sm text-muted">Aucun événement dans ce mois avec ces filtres.</p>}
          {[...byDay].map(([date, items]) => <section key={date} className="rounded-2xl border border-line p-3"><button className="mb-3 min-h-11 text-left text-sm font-semibold capitalize text-accent underline-offset-4 hover:underline" onClick={() => choose(date)}>{fullDate(date)} <span aria-hidden="true">↗</span></button><div className="space-y-2">{items.map(item => <EventCard key={item.key} event={item} />)}</div></section>)}
        </div>}
      </section>

      <aside className="space-y-5 lg:sticky lg:top-5">
        <section className="hidden rounded-3xl border border-line bg-surface p-5 lg:block" aria-label="Détail du jour">{details}</section>
        <section className="rounded-3xl border border-line bg-surface p-5" aria-label="Recherche des saints">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">Éphéméride</p><h2 className="font-semibold">À chaque prénom sa fête</h2>
          <p className="mt-2 text-sm text-muted">Le calendrier public des saints, indépendant de tes dates personnelles.</p>
          <label className="mt-4 block text-sm">Rechercher un prénom<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Ex. : Léa" className="mt-1 min-h-11 w-full rounded-xl border border-line bg-canvas p-3 text-ink" /></label>
          <p role="status" className="mt-2 text-xs text-muted">{query ? results.length ? `${results.length} correspondance${results.length > 1 ? 's' : ''}${results.length === 20 ? ' affichées au maximum' : ''}` : 'Aucun prénom trouvé.' : 'Les saints du jour apparaissent dans le détail d’une journée.'}</p>
          <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">{results.map((saint, index) => <li key={`${saint.nomSaint}-${saint.date}-${index}`}><button className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl p-2 text-left text-sm hover:bg-ink/5" onClick={() => {
            const year = Number(month.slice(0, 4)), [saintMonth, saintDay] = saint.date.split('-').map(Number)
            const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
            const date = saintMonth === 2 && saintDay === 29 && !leap ? `${year}-03-01` : `${month.slice(0, 4)}-${saint.date}`
            onMonthChange(date.slice(0, 7)); choose(date)
          }}><span>{saint.nomSaint}</span><span className="shrink-0 text-xs text-muted">{saint.date.split('-').reverse().join('/')}</span></button></li>)}</ul>
        </section>
      </aside>
    </div>
    <Modal open={mobileDetails} onClose={() => setMobileDetails(false)} title={`Détail du ${fullDate(selected)}`} className="w-[calc(100%-1.5rem)] max-w-lg">
      <div className="mb-4 flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wider text-accent">Ton rendez-vous du jour</p><button className={button} onClick={() => setMobileDetails(false)}>Fermer</button></div>{details}
    </Modal></>}
  </div>
}

function DayDetails({ date, events }: { date: string; events: EventView[] }) {
  const saint = SAINTS_PAR_DATE.get(date.slice(5))
  return <><h2 className="mb-4 text-lg font-semibold capitalize">{fullDate(date)}</h2><div className="space-y-3">{events.length ? events.map(event => <EventCard key={event.key} event={event} />) : <p className="text-sm text-muted">Aucun événement personnel ce jour avec ces filtres.</p>}</div>
    <details className="mt-5 border-t border-line pt-4"><summary className="min-h-11 cursor-pointer text-sm font-medium">Saints du jour</summary>{saint ? <p className="mt-2 text-sm text-muted">{saint.nomSaint}</p> : <p className="text-sm text-muted">Aucun saint renseigné pour cette date.</p>}</details>
  </>
}
function EventCard({ event }: { event: EventView }) {
  const group = groups[eventGroup(event.kind)]
  return <article className="rounded-xl border border-line bg-canvas/50 p-3 [overflow-wrap:anywhere]">
    <p className="mb-1 text-xs text-muted"><span aria-hidden="true" className={`mr-1 ${group.color}`}>{group.icon}</span>{eventLabels[event.kind] ?? group.label}</p>
    <h3 className="font-medium">{event.title}</h3><p className="mt-1 text-sm text-muted">{event.contact ? `${event.contact.prenom ?? ''} ${event.contact.nom ?? ''}`.trim() : 'Ma date'}{event.age !== null ? ` · ${event.age} ans` : ''}</p>
    <p className="mt-2 text-xs text-muted">{event.reminder ? 'Rappels activés' : event.event ? 'Rappels suspendus' : 'Date historique · choix à confirmer'}</p>
    {event.occurrence && <a className="mt-2 flex min-h-11 items-center text-sm text-accent underline" href={'/dashboard/preparer/' + event.occurrence.id}>Préparer cet événement</a>}
    {event.contact && <a className="mt-2 inline-flex min-h-11 items-center text-sm text-accent underline underline-offset-4" href={`/dashboard/contacts/${event.contact.id}/edit`}>Modifier ce contact</a>}
  </article>
}
