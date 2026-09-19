import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

function load(path, name, context) {
  const source = stripTypeScriptTypes(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
    .replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm, '')
    .replace(/^export /gm, '')
  return runInNewContext(`${source}\n;${name}`, context)
}
class Today extends Date {
  constructor(...args) { super(...(args.length ? args : ['2026-09-19T00:00:00Z'])) }
}
function database(tables, operations) {
  return { from(table) {
    let action = 'read'
    const filters = []
    const query = {
      select: () => query, single: () => query, maybeSingle: () => query,
      eq: (key, value) => { filters.push([key, value]); return query },
      in: (key, value) => { filters.push([key, value]); return query },
      upsert: () => { action = 'upsert'; return query },
      update: () => { action = 'update'; return query },
      then(resolve) {
        operations.push({ table, action, filters })
        return Promise.resolve({ data: action === 'read' ? tables[table] : [{ id: 'n1' }], error: null }).then(resolve)
      },
    }
    return query
  } }
}
function context(db, send, secret = 'simulation') {
  const resend = { emails: { send } }
  return {
    ...load('lib/calendar-day.ts', '({ parisDay, nextBirthdayDay, daysBetween, isCalendarDay, parseLocalDay })', { Date: Today }),
    process: { env: { CRON_SECRET: secret } }, Date: Today,
    console: { log() {}, error() {} },
    createClient: () => db, supabaseAdmin: db, resend,
    Resend: class { constructor() { return resend } },
    echapperHtml: value => String(value ?? ''),
    NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) },
  }
}
const tables = {
  contacts: [{ id: 12, prenom: 'Test', date_naissance: '2000-09-19' }],
  notification_preferences: { canal_email: true, rappel_jourj: true },
  notifications: [
    { id: 'n1', contact_id: 12, event_date: '2026-09-19', jours_restants: 0 },
    { id: 'other', contact_id: 99, event_date: '2026-09-19', jours_restants: 0 },
  ],
}
test('récapitulatif : seuls les IDs inclus sont marqués, clé stable transmise', async () => {
  const operations = [], sends = []
  const fn = load('app/api/cron/generate-notifications/route.ts', 'processUser', context(database(tables, operations), async (...args) => {
    sends.push(args); return { data: { id: 'simulation' }, error: null }
  }))
  await fn({ id: 'u1', email: 'simulation@example.invalid' })
  assert.equal(sends.length, 1)
  assert.equal(sends[0][1].idempotencyKey, 'recap/u1/' + tables.notifications[0].event_date)
  const update = operations.find(op => op.action === 'update')
  assert.equal(JSON.stringify(update.filters), JSON.stringify([['user_id', 'u1'], ['id', ['n1']]]))
})
test('Resend en erreur : aucun marquage envoyé', async () => {
  const operations = []
  const fn = load('app/api/cron/generate-notifications/route.ts', 'processUser', context(database(tables, operations), async () => ({ error: new Error('simulation refus') })))
  await assert.rejects(fn({ id: 'u1', email: 'simulation@example.invalid' }), /simulation refus/)
  assert.ok(!operations.some(op => op.action === 'update'))
})
test('simulation : ni écriture DB ni envoi Resend', async () => {
  const operations = []
  const fn = load('app/api/cron/test-notifications/route.ts', 'processUser', context(database(tables, operations), async () => { throw new Error('Envoi interdit') }))
  const result = await fn({ id: 'u1', email: 'simulation@example.invalid' })
  assert.equal(result.emails, 0)
  assert.equal(result.previewNotifs, 1)
  assert.ok(operations.every(op => op.action === 'read'))
})
test('cron sans secret refusé avant toute lecture DB', async () => {
  const ctx = context({ from() { throw new Error('Lecture interdite') } }, () => {})
  ctx.process.env = {}
  const GET = load('app/api/cron/generate-notifications/route.ts', 'GET', ctx)
  const result = await GET({ headers: new Headers({ authorization: 'Bearer undefined' }) })
  assert.equal(result.status, 401)
})
test('newsletter : le header cron suffit sans secret dans URL', async () => {
  const ctx = context(database({ notification_preferences: [] }, []), () => {})
  const GET = load('app/api/envoyer-newsletter/route.ts', 'GET', ctx)
  const result = await GET({ headers: new Headers({ authorization: 'Bearer simulation' }) })
  assert.equal(result.status, 200)
  assert.equal(result.body.total, 0)
})
