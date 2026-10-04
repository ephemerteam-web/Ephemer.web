import { p2Helpers } from './p2-helpers.mjs'
// Tests des vrais handlers et helpers avec une base et un transport simulés.
// Aucun secret, appel réseau, quota réel ou email envoyé.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { createHash } from 'node:crypto'
import test from 'node:test'

function load(path, names, context = {}) {
  const source = stripTypeScriptTypes(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
    .replace(/^import[\s\S]*?from ['"][^'"]+['"];?\r?\n/gm, '').replace(/^export /gm, '')
  return runInNewContext(`${source}\n;({${names}})`, { ...p2Helpers, ...context })
}
const calendar = load('lib/calendar-day.ts', 'parisDay,daysBetween,isCalendarDay,nextBirthdayDay')
const policy = load('lib/reminder-policy.ts', 'birthdayNotifications,selectBirthdayRecap,messageNeedsRescheduling,automaticReminderUseful', calendar)
const user = { id: 'u1', email: 'sender@example.invalid' }
const contact = { id: 12, user_id: 'u1', prenom: 'Test', nom: '', email: 'contact@example.invalid', date_naissance: '2000-09-20' }
const prefs = { user_id: 'u1', canal_email: true, rappel_j7: false, rappel_j3: false, rappel_j1: true, rappel_jourj: false }

// Les requêtes appliquent réellement leurs filtres et les écritures persistent
// entre deux appels du handler, contrairement à une réponse fixe par table.
function database(tables, fail = () => false) {
  return { from(table) {
    let action = 'read', values, single = false, key = 'id', limit = 200
    const filters = []
    const q = {
      select: () => q, order: column => { key = column; return q },
      limit: size => { limit = size; return q }, gt: (k,v) => { filters.push(r => r[k] > v); return q },
      maybeSingle: () => { single = true; return q },
      eq: (k,v) => { filters.push(r => r[k] === v); return q },
      gte: (k,v) => { filters.push(r => r[k] >= v); return q },
      lte: (k,v) => { filters.push(r => r[k] <= v); return q },
      in: (k,v) => { filters.push(r => v.includes(r[k])); return q },
      upsert: v => { action = 'upsert'; values = v; return q },
      update: v => { action = 'update'; values = v; return q },
      then(resolve) {
        if (fail(table, action, filters)) return Promise.resolve({ data: null, error: new Error('Simulation DB') }).then(resolve)
        const rows = (tables[table] ||= [])
        let result = rows.filter(r => filters.every(fn => fn(r)))
        if (action === 'read') result = result.sort((a,b) => a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0).slice(0, limit)
        if (action === 'upsert') {
          result = []
          for (const item of values) {
            if (rows.some(r => ['user_id','contact_id','type','event_date','jours_restants'].every(k => r[k] === item[k]))) continue
            const created = { ...item, id: `n${rows.length + 1}` }; rows.push(created); result.push(created)
          }
        }
        if (action === 'update') result.forEach(r => Object.assign(r, values))
        return Promise.resolve({ data: single ? result[0] ?? null : result, error: null }).then(resolve)
      },
    }
    return q
  } }
}
function cronContext(db, deliver, day = '2026-09-20') {
  return { ...calendar, ...policy, parisDay: () => day, supabaseAdmin: db, deliverEmail: deliver,
    recordCronRun: async () => {}, createHash, Date, console: { log() {}, error() {} },
    echapperHtml: v => String(v ?? ''), genererEmailRappel: p => JSON.stringify(p),
    process: { env: { CRON_SECRET: 'simulation' } },
    NextResponse: { json: (body, opts) => ({ body, status: opts?.status ?? 200 }) },
  }
}

test('échec Resend J-1 : une seule reprise utile le lendemain, sans Jour J actif', async () => {
  const tables = { profiles: [user], contacts: [contact], notification_preferences: [prefs], notifications: [] }
  const db = database(tables), accepted = []
  let attempt = 0
  const { processUser } = load('app/api/cron/generate-notifications/route.ts', 'processUser', cronContext(db, async job => {
    if (++attempt === 1) throw new Error('Resend 429 simulé')
    accepted.push(job)
    await db.from('notifications').update({ email_envoye: true }).in('id', job.notificationIds)
    return { state: 'accepted', emailId: 'simulation' }
  }))
  const failed = await processUser(user, '2026-09-19')
  assert.equal(failed.errors[0], 'livraison')
  assert.equal(tables.notifications.length, 1)
  assert.equal(tables.notifications[0].email_envoye, false)
  const retry = await processUser(user, '2026-09-20')
  assert.equal(retry.notifs, 0)
  assert.equal(retry.emails, 1)
  assert.match(accepted[0].payload.html, /20\/09\/2026/)
  assert.match(accepted[0].payload.html, /J-0/)
  assert.equal((await processUser(user, '2026-09-20')).emails, 0)
  assert.equal(accepted.length, 1)
})

test('paliers manqués réconciliés : un événement par contact, expiration après événement', () => {
  const all = { rappel_j7: true, rappel_j3: true, rappel_j1: true, rappel_jourj: true }
  const rows = policy.birthdayNotifications('u1', [contact], all, '2026-09-20')
    .map((row,i) => ({ ...row, id: `n${i}` }))
  assert.equal(rows.length, 4)
  const recap = policy.selectBirthdayRecap(rows, [contact], all, '2026-09-20')
  assert.equal(recap.length, 1)
  assert.equal(recap[0].ids.length, 4)
  assert.equal(recap[0].jours, 0)
  assert.equal(policy.selectBirthdayRecap(rows, [contact], all, '2026-09-21').length, 0)
  rows[3].email_envoye = true
  assert.equal(policy.selectBirthdayRecap(rows, [contact], all, '2026-09-20').length, 0)
})

test('échec du premier compte : le suivant reçoit son récapitulatif', async () => {
  const second = { id: 'u2', email: 'second@example.invalid' }
  const tables = { profiles: [user, second], contacts: [contact, { ...contact, id: 13, user_id: 'u2' }],
    notification_preferences: [prefs, { ...prefs, user_id: 'u2' }], notifications: [] }
  const calls = []
  const { GET } = load('app/api/cron/generate-notifications/route.ts', 'GET', cronContext(database(tables), async job => {
    calls.push(job.userId)
    if (job.userId === 'u1') throw new Error('Échec simulé')
    return { state: 'accepted' }
  }))
  const result = await GET({ headers: new Headers({ authorization: 'Bearer simulation' }) })
  assert.equal(result.status, 500)
  assert.deepEqual(calls, ['u1','u2'])
  assert.equal(result.body.emails, 1)
})

test('une erreur de génération ou du journal n’empêche pas la livraison de la file', async () => {
  const tables = { contacts: [contact], notification_preferences: [prefs], notifications: [
    { id: 'n1', user_id: 'u1', contact_id: 12, type: 'anniversaire', event_date: '2026-09-20', jours_restants: 1, email_envoye: false },
  ] }
  const db = database(tables, (table, action) => table === 'notifications' && action === 'upsert')
  let delivered = 0
  const ctx = cronContext(db, async () => { delivered++; return { state: 'accepted' } })
  ctx.recordCronRun = async () => { throw new Error('Journal indisponible') }
  const { processUser } = load('app/api/cron/generate-notifications/route.ts', 'processUser', ctx)
  const result = await processUser(user)
  assert.equal(delivered, 1)
  assert.ok(result.errors.includes('generation'))
  assert.ok(result.errors.includes('journal'))
})

function reminder(id, overrides = {}) {
  return { id, user_id: 'u1', contact_id: 12, contacts: contact, source: 'message_programme', statut: 'programme',
    date_envoi: '2026-09-20', type_rappel: 'jourj', type_evenement: 'anniversaire', destinataire: 'contact',
    message: 'Bonne journée', sujet_email: 'Message', email_destinataire: contact.email, ton: 'familier', ...overrides }
}
async function runReminders(rows, preferences, deliver, fail) {
  const tables = { rappels: rows, profiles: [user], notification_preferences: preferences }
  const { GET } = load('app/api/envoyer-rappels/route.ts', 'GET', cronContext(database(tables, fail), deliver))
  return GET({ headers: new Headers({ authorization: 'Bearer simulation' }) })
}

test('préférences désactivées : message manuel envoyé, alerte personnelle ignorée', async () => {
  const jobs = []
  const result = await runReminders([reminder(1), reminder(2, { source: 'rappel_auto' })],
    [{ user_id: 'u1', canal_email: false, rappel_jourj: false }], async job => { jobs.push(job); return { state: 'accepted' } })
  assert.equal(result.status, 200)
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].rappelId, 1)
  assert.equal(result.body.resultats[1].raison, 'email_desactive')
})

test('lecture des préférences en échec : le message manuel n’est pas bloqué', async () => {
  let sent = 0
  const result = await runReminders([reminder(1), reminder(2, { source: 'rappel_auto' })], [],
    async () => { sent++; return { state: 'accepted' } }, table => table === 'notification_preferences')
  assert.equal(sent, 1)
  assert.equal(result.status, 500)
})

test('message en retard : reprise limitée au lendemain, puis suspension sans effacement', async () => {
  const rows = [reminder(1, { date_envoi: '2026-09-19' }), reminder(2, { date_envoi: '2026-09-18' })]
  const jobs = []
  const result = await runReminders(rows, [], async job => { jobs.push(job); return { state: 'accepted' } })
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].expiresOn, '2026-09-20')
  assert.equal(result.body.resultats[1].statut, 'suspendu')
  assert.equal(rows[1].statut, 'programme')
  assert.equal(policy.messageNeedsRescheduling('2026-03-28','2026-03-30'), true)
  assert.equal(policy.automaticReminderUseful('2026-09-13','j7',null,'2026-09-20'), true)
  assert.equal(policy.automaticReminderUseful('2026-09-13','j7',null,'2026-09-21'), false)
})

test('échec d’un message : le suivant est traité, contenu historique non modifié', async () => {
  const calls = []
  const result = await runReminders([reminder(1),reminder(2)], [], async job => {
    calls.push(job.rappelId)
    if (job.rappelId === 1) throw new Error('Panne simulée')
    return { state: 'accepted' }
  })
  assert.equal(result.status, 500)
  assert.deepEqual(calls, [1,2])
  assert.equal(result.body.resultats[1].statut, 'envoye')
})

function deliveryHarness({ state = 'reserved', ready = true, transport, finishError = false, claimError = false } = {}) {
  const calls = []
  const originalPayload = { from: 'sender@example.invalid', to: 'recipient@example.invalid', subject: 'Original', html: 'Original' }
  const db = { rpc: async (name,args) => {
    calls.push({ name,args })
    if (name === 'claim_email_job') return { data: { state, id: 'job-1', token: 'token-1', payload: originalPayload }, error: claimError ? new Error() : null }
    if (name === 'begin_email_job') return { data: { ready, state: ready ? 'sending' : 'cancelled' }, error: null }
    return { data: null, error: finishError ? new Error('Simulation DB') : null }
  } }
  const { deliverEmail } = load('lib/email-delivery.ts','deliverEmail', { supabaseAdmin: db, resend: { emails: { send: transport || (async () => ({ data: { id: 'resend-1' }, error: null })) } } })
  const job = { key: 'rappel/1/version', kind: 'rappel', userId: 'u1', rappelId: 1, expiresOn: '2026-09-20', payload: { ...originalPayload, subject: 'New' } }
  return { deliverEmail,job,calls }
}

test('réservation durable obligatoire ; annulation gagnante bloque l’appel Resend', async () => {
  for (const params of [{ claimError: true },{ ready: false },{ state: 'busy' },{ state: 'review' },{ state: 'already_accepted' }]) {
    let sent = 0
    const h = deliveryHarness({ ...params, transport: async () => { sent++; throw new Error('Interdit') } })
    if (params.claimError) await assert.rejects(h.deliverEmail(h.job), /Journal email/)
    else await h.deliverEmail(h.job)
    assert.equal(sent, 0)
  }
})

test('reprise : contenu immuable, clé stable, tag de rapprochement et ID conservé', async () => {
  const messages = []
  const h = deliveryHarness({ transport: async (...args) => { messages.push(args); return { data: { id: 'resend-1' }, error: null } } })
  const result = await h.deliverEmail(h.job)
  assert.equal(messages[0][0].subject, 'Original')
  assert.equal(messages[0][0].tags[0].value, 'job-1')
  assert.equal(messages[0][1].idempotencyKey, 'email/job-1')
  assert.equal(result.emailId, 'resend-1')
  assert.equal(h.calls.at(-1).args.p_resend_id, 'resend-1')
  assert.equal(h.calls.at(-1).args.p_outcome, 'accepted')
})

test('pannes : refus 429 reprenable, erreur 400 définitive, réseau/500 incertains', async () => {
  for (const [response,expected] of [[{ error: { statusCode: 429 } },'retryable'],[{ error: { statusCode: 400 } },'failed'],[{ error: { statusCode: 500 } },'uncertain'],[null,'uncertain']]) {
    const h = deliveryHarness({ transport: async () => { if (!response) throw new Error('Timeout'); return response } })
    await assert.rejects(h.deliverEmail(h.job))
    assert.equal(h.calls.at(-1).args.p_outcome, expected)
  }
})

test('acceptation suivie d’un échec DB : erreur explicite, aucun second appel Resend', async () => {
  let sent = 0
  const h = deliveryHarness({ finishError: true, transport: async () => { sent++; return { data: { id: 'resend-1' }, error: null } } })
  await assert.rejects(h.deliverEmail(h.job), /Journal email/)
  assert.equal(sent, 1)
  assert.equal(h.calls.at(-1).args.p_resend_id, 'resend-1')
})

test('webhook : corps brut signé, rejet des faux événements, reprise sur erreur DB', async () => {
  const raw = '{ "type": "email.delivered" }', verified = [], writes = []
  const event = { type: 'email.delivered', created_at: '2026-09-20T08:00:00Z', data: { email_id: 'email-1', tags: { ephemer_job: '00000000-0000-0000-0000-000000000001' } } }
  let invalid = false, dbError = false
  const { POST } = load('app/api/webhooks/resend/route.ts','POST', {
    process: { env: { RESEND_WEBHOOK_SECRET: 'simulation' } },
    NextResponse: { json: (body,opts) => ({ body,status: opts?.status ?? 200 }) },
    resend: { webhooks: { verify: args => { verified.push(args); if (invalid) throw new Error('Signature'); return event } } },
    supabaseAdmin: { rpc: async (...args) => { writes.push(args); return { error: dbError ? new Error() : null } } },
  })
  const request = () => ({ headers: new Headers({ 'svix-id':'evt-1','svix-timestamp':'simulation','svix-signature':'simulation' }), text: async () => raw })
  assert.equal((await POST(request())).status,200)
  assert.equal(verified[0].payload,raw)
  assert.equal(writes[0][1].p_job_id,event.data.tags.ephemer_job)
  assert.equal(writes[0][1].p_event_id,'evt-1')
  invalid = true
  assert.equal((await POST(request())).status,400)
  assert.equal(writes.length,1)
  invalid = false; dbError = true
  assert.equal((await POST(request())).status,500)
})
