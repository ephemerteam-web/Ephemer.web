'use client'
import { useClock } from '@/lib/hooks/useClock'
import { parisDay } from '@/lib/calendar-day'
import { usePersonalEvents } from '@/lib/hooks/usePersonalEvents'
import { dailyEvents } from '@/lib/daily-digest'
import { SAINTS_PAR_DATE } from '@/lib/saints'
import LoadFailure from './LoadFailure'
export default function DailySummary() {
  const now = useClock()
  return now ? <DailySummaryDay key={parisDay(new Date(now))} day={parisDay(new Date(now))} /> : <p role="status">Chargement du résumé…</p>
}
function DailySummaryDay({ day }: { day: string }) {
  const dates = usePersonalEvents(day, day, true)
  const views = dailyEvents(dates.views, day), saint = SAINTS_PAR_DATE.get(day.slice(5))
  return <section aria-label="Résumé de la journée" className="mb-5 space-y-3 rounded-2xl border border-line bg-surface p-4"><h2 className="font-semibold">À célébrer aujourd’hui</h2>
    {dates.error ? <LoadFailure message={dates.error} retry={dates.retry} /> : dates.loading ? <p role="status">Chargement…</p> : <>{views.length ? <ul className="space-y-2">{views.map(view => <li key={view.key}>{view.title}</li>)}</ul> : <p className="text-sm text-muted">Aucune date avec rappel actif aujourd’hui.</p>}</>}
    {saint && <p className="text-sm text-muted">Saints du jour : {saint.nomSaint}. Leur inclusion dans le push se choisit dans les paramètres de cet appareil.</p>}
  </section>
}
