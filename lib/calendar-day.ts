// Dates civiles : aucune conversion implicite entre minuit local et UTC.
export function isCalendarDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function parseLocalDay(value: string): Date {
  if (!isCalendarDay(value)) throw new Error('Date invalide')
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  return date
}

export function parisDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find(p => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function daysBetween(from: string, to: string): number {
  if (!isCalendarDay(from) || !isCalendarDay(to)) throw new Error('Date invalide')
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
}

// Le 29 février est observé le 1er mars les années non bissextiles,
// conformément au comportement Date existant, désormais explicite et testé.
export function nextBirthdayDay(birth: string, today: string): string {
  if (!isCalendarDay(birth) || !isCalendarDay(today)) throw new Error('Date invalide')
  const [, month, day] = birth.split('-').map(Number)
  const occurrence = (year: number) => {
    const date = new Date(`${year}-01-01T00:00:00Z`)
    date.setUTCMonth(month - 1, day)
    return date.toISOString().slice(0, 10)
  }
  const year = Number(today.slice(0, 4))
  const current = occurrence(year)
  return current >= today ? current : occurrence(year + 1)
}
