import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPure, p2Helpers } from './p2-helpers.mjs'
import { harness } from './ui-harness.mjs'

const dates = loadPure('lib/calendar-day.ts', 'parseLocalDay,isCalendarDay')
const helpers = loadPure('lib/calendar-presentation.ts', 'calendarEvents,eventGroup,monthDays,selectedCalendarDay,adjacentMonth', { ...p2Helpers, ...dates })
const views = [
  { key: 'b', date: '2026-10-08', kind: 'anniversaire', title: 'Anniversaire', contact: { id: 1, prenom: 'Léa' }, age: null, reminder: true },
  { key: 'p', date: '2026-10-08', kind: 'adoption', title: 'Arrivée de Plume', contact: null, age: null, reminder: false },
  { key: 'f', date: '2026-10-20', kind: 'fete_prenomale', title: 'Fête', contact: { id: 2, prenom: 'Jean' }, age: null, reminder: true },
  { key: 'future', date: '2027-10-08', kind: 'anniversaire', title: 'Anniversaire', contact: { id: 1 }, age: null, reminder: true },
]
test('listes et types combinés : dates sans contact visibles seulement sans filtre de liste', () => {
  assert.equal(helpers.calendarEvents(views, '2026-10', 'all', null).length, 3)
  assert.equal(helpers.calendarEvents(views, '2026-10', 'personal', null)[0].title, 'Arrivée de Plume')
  assert.equal(helpers.calendarEvents(views, '2026-10', 'all', new Set([1])).length, 1)
  assert.equal(helpers.calendarEvents(views, '2026-10', 'feast', new Set([1])).length, 0)
  assert.equal(helpers.calendarEvents(views, '2026-10', 'all', new Set()).length, 0)
})
test('grille lundi, changement d’année, février bissextile et sélection complète', () => {
  assert.equal(helpers.monthDays('2026-10').indexOf('2026-10-01'), 3)
  assert.equal(helpers.monthDays('2028-02').filter(Boolean).length, 29)
  assert.equal(helpers.monthDays('2027-02').filter(Boolean).length, 28)
  assert.equal(helpers.adjacentMonth('2026-12', 1), '2027-01')
  assert.equal(helpers.adjacentMonth('2027-01', -1), '2026-12')
  assert.equal(helpers.selectedCalendarDay('2026-10', '2025-10-08', '2026-10-05', views), '2026-10-05')
  assert.equal(helpers.selectedCalendarDay('2026-10', null, '2026-09-05', views), '2026-10-08')
  assert.equal(helpers.selectedCalendarDay('2026-11', '2026-10-08', '2026-10-05', []), '2026-11-01')
})
const browser = { window: { matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) }, setInterval: () => 1, clearInterval() {} }
test('vue : agenda remplace la grille, filtres conservés pendant chargement, erreurs sans résultat privé', () => {
  let query = new URLSearchParams('contactId=42')
  const ui = harness('components/CalendarExperience.tsx', { globals: browser, overrides: { 'next/navigation': { useSearchParams: () => query, useRouter: () => ({ replace: url => { query = new URLSearchParams(url.split('?')[1]) } }) } } })
  const props = { month: '2026-10', onMonthChange() {}, views, contactIds: null, listSelector: null, manageDates: null }
  ui.render(props)
  assert.ok(ui.nodes().some(node => node.props['aria-label'] === 'Vue mensuelle'))
  ui.find(node => node.type === 'button' && ui.text(node) === 'Agenda').props.onClick()
  ui.render(props)
  assert.ok(ui.nodes().some(node => node.props['aria-label'] === 'Agenda du mois'))
  assert.ok(!ui.nodes().some(node => node.props['aria-label'] === 'Vue mensuelle'))
  ui.find(node => node.type === 'select').props.onChange({ target: { value: 'personal' } })
  ui.render(props)
  assert.ok(ui.text().includes('1 événement'))
  ui.render({ ...props, status: 'Chargement' }); assert.ok(ui.text().includes('Chargement'))
  assert.ok(!ui.nodes().some(node => node.props['aria-label'] === 'Agenda du mois'))
  ui.render(props); assert.equal(ui.find(node => node.type === 'select').props.value, 'personal')
  assert.equal(query.get('contactId'), '42')
  ui.render({ ...props, status: 'Lecture refusée' }); assert.ok(ui.text().includes('Lecture refusée'))
  assert.ok(!ui.nodes().some(node => node.props['aria-label'] === 'Prochain événement du mois'))
})
