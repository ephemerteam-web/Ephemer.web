import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
function load(path, names, context = {}) {
  const source = stripTypeScriptTypes(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
    .replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm, '').replace(/^export /gm, '')
  return runInNewContext(`${source}\n;({${names}})`, context)
}
const calendar = load('lib/calendar-day.ts', 'isCalendarDay,nextBirthdayDay')
const quality = load('lib/contact-quality.ts', 'ageKnown,partialBirthDate,duplicateReason', calendar)
test('année inconnue reste null, 29 février partiel accepté, dates impossibles rejetées', () => {
  assert.equal(quality.partialBirthDate('29', '2', '').year, null)
  assert.throws(() => quality.partialBirthDate('31', '2', ''))
  assert.equal(quality.ageKnown('1900-05-12'), null)
  assert.equal(quality.ageKnown('2000-09-20', new Date(2026, 8, 19)), 25)
})
test('rapprochement prudent : homonymes et email partagé signalés, prénom seul insuffisant', () => {
  assert.ok(quality.duplicateReason({ email: ' Test@example.invalid ' }, { email: 'test@example.invalid' }))
  assert.ok(quality.duplicateReason({ prenom: 'Hélène', nom: 'Martin' }, { prenom: 'helene', nom: 'Martin' }))
  assert.equal(quality.duplicateReason({ prenom: 'Jean' }, { prenom: 'Jean' }), null)
})
test('fête : choix explicite validé, pas de première correspondance imposée', () => {
  const fn = load('lib/name-days.ts', 'chosenNameDay', { ...calendar, SAINTS: [{ date: '01-02', prenoms: ['helene'] }, { date: '12-03', prenoms: ['hélène'] }] })
  assert.equal(fn.chosenNameDay('Hélène', '', '2026-09-19'), null)
  assert.equal(fn.chosenNameDay('Hélène', '01-02', '2026-09-19'), '2027-01-02')
  assert.equal(fn.chosenNameDay('Hélène', '12-03', '2026-09-19'), '2026-12-03')
})
test('IA : les champs personnels sont exclus même dans une requête directe hostile', async () => {
  const secrets = { firstName: 'SECRET_FIRST', lastName: 'SECRET_LAST', note: 'SECRET_NOTE', dateNaissance: '1900-01-01', email: 'secret@example.invalid', eventDescription: 'SECRET_DESCRIPTION', age: 'SECRET_AGE' }
  const constants = { TYPES_EVENEMENT: [{ value: 'anniversaire', label: 'Anniversaire' }], TYPES_RELATION: [{ value: 'ami', label: 'Ami' }], TONS_MESSAGE: [{ value: 'familier', label: 'Familier' }], MESSAGES_UI: { erreur_genérique: 'Erreur' } }
  for (const route of ['generate-message', 'generate-gift-ideas']) {
    const requests = []
    const { POST } = load(`app/api/${route}/route.ts`, 'POST', { ...constants, verifierGardeIA: async () => ({ ok: true }), NextResponse: { json: (body, opts) => ({ body, status: opts?.status ?? 200 }) }, AbortSignal, process: { env: {} }, console,
      fetch: async (url, options) => { requests.push(options.body); return { ok: true, json: async () => ({ choices: [{ message: { content: route === 'generate-message' ? 'Bonne journée !' : '[]' } }] }) } },
    })
    const response = await POST({ json: async () => ({ ...secrets, relation: 'ami', eventType: 'anniversaire', tone: 'familier' }) })
    assert.equal(response.status, 200)
    assert.equal(requests.length, 1)
    for (const value of Object.values(secrets)) assert.ok(!requests[0].includes(value), value)
  }
})
test('export : pagination, filtres propriétaire et arrêt sur erreur sans résultat partiel', async () => {
  const filters = [], ranges = []
  let fail = false
  const supabase = { from: () => { const q = { select: () => q, order: () => q, eq: (...args) => { filters.push(args); return q }, range: async (a,b) => { ranges.push([a,b]); return { data: a === 0 ? Array.from({ length: 200 }, (_,id) => ({ id })) : [{ id: 201 }], error: fail ? new Error() : null } } }; return q } }
  const { readOwnRows } = load('lib/user-data.ts', 'readOwnRows', { supabase })
  assert.equal((await readOwnRows('contacts', 'u1')).length, 201)
  assert.deepEqual(ranges, [[0,199],[200,399]])
  assert.ok(filters.every(([key,id]) => key === 'user_id' && id === 'u1'))
  fail = true; await assert.rejects(readOwnRows('contacts', 'u1'), /Aucun export partiel/)
})
