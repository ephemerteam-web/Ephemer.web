import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

function load(path, names, context = {}) {
  const source = stripTypeScriptTypes(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
    .replace(/^import[^\n]+\n/gm, '').replace(/^export /gm, '')
  return runInNewContext(`${source}\n;({${names}})`, context)
}
const calendar = load('lib/calendar-day.ts', 'isCalendarDay, parseLocalDay, parisDay, daysBetween, nextBirthdayDay')
const dates = load('lib/date-utils.ts', 'formatDateLocale, calculerDatesJ7J1JourJ', { ...calendar, SAINTS: [] })

test('anniversaires : fin de mois, année suivante et 29 février', () => {
  for (const [birth, today, expected] of [
    ['2000-02-07', '2026-01-31', '2026-02-07'],
    ['2000-04-07', '2026-03-31', '2026-04-07'],
    ['2000-01-01', '2026-12-31', '2027-01-01'],
    ['2000-02-29', '2027-01-01', '2027-03-01'],
    ['2000-02-29', '2028-01-01', '2028-02-29'],
  ]) assert.equal(calendar.nextBirthdayDay(birth, today), expected)
})
test('date civile : invalides refusées, aucune conversion UTC du formulaire', () => {
  for (const value of ['2026-02-30', '2026-13-01', 'incorrect', '2026-01-01T00:00:00Z']) {
    assert.equal(calendar.isCalendarDay(value), false)
    assert.throws(() => calendar.parseLocalDay(value))
  }
  assert.equal(dates.formatDateLocale(calendar.parseLocalDay('2026-07-01')), '2026-07-01')
})
test('Paris et changements heure : jours civils exacts', () => {
  assert.equal(calendar.parisDay(new Date('2026-06-30T22:30:00Z')), '2026-07-01')
  assert.equal(calendar.daysBetween('2026-03-28', '2026-03-30'), 2)
  assert.equal(calendar.daysBetween('2026-10-24', '2026-10-26'), 2)
  const { j7, j1 } = dates.calculerDatesJ7J1JourJ(calendar.parseLocalDay('2026-03-30'))
  assert.equal(dates.formatDateLocale(j7), '2026-03-23')
  assert.equal(dates.formatDateLocale(j1), '2026-03-29')
})
test('programmation : jour courant accepté, date SQL sans heure et passé refusé', async () => {
  const inserted = []
  const supabase = { from: () => ({ insert: rows => {
    inserted.push(...rows)
    return { select: async () => ({ data: rows, error: null }) }
  } }) }
  const { programmerMessage } = load('lib/rappels.ts', 'programmerMessage', { ...calendar, ...dates, supabase })
  const params = { userId: 'u1', contactId: '12', contact: { prenom: 'Test' },
    typeEvenement: 'jour_special', message: 'Test', destinataire: 'moi',
    emailUtilisateur: 'simulation@example.invalid', dateOverride: new Date() }
  await programmerMessage(params)
  assert.equal(inserted[0].date_envoi, dates.formatDateLocale(new Date()))
  await assert.rejects(programmerMessage({ ...params, dateOverride: calendar.parseLocalDay('2000-01-01') }))
  assert.equal(inserted.length, 1)
})
