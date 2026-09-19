import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

function worker({ offline = false, cached = true } = {}) {
  const handlers = {}, writes = [], deleted = [], shown = [], opened = []
  const cache = {
    add: async request => writes.push(request.url),
    put: async () => { throw new Error('Cache privé interdit') },
    match: async () => cached ? new Response('Secours public') : undefined,
  }
  const self = {
    location: { origin: 'https://example.invalid' },
    addEventListener: (name, callback) => { handlers[name] = callback },
    skipWaiting: async () => {},
    registration: { showNotification: async (...args) => shown.push(args) },
    clients: { claim: async () => {}, matchAll: async () => [], openWindow: async url => opened.push(url) },
  }
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self, URL, Response,
    Request: class extends Request { constructor(path, options) { super(new URL(path, self.location.origin), options) } },
    fetch: async () => { if (offline) throw new Error('Simulation offline'); return new Response('Page privée') },
    caches: { open: async () => cache, keys: async () => ['ephemer-static-v3', 'ephemer-static-v6', 'autre-app'], delete: async name => deleted.push(name) },
  })
  return { handlers, writes, deleted, shown, opened }
}
async function dispatch(handler, event) {
  let pending
  handler({ ...event, waitUntil: promise => { pending = promise }, respondWith: promise => { pending = promise } })
  return await pending
}
test('navigation privée réseau : aucune écriture de cache', async () => {
  const w = worker()
  const response = await dispatch(w.handlers.fetch, { request: { method: 'GET', mode: 'navigate', url: 'https://example.invalid/dashboard/profil' } })
  assert.equal(await response.text(), 'Page privée')
  assert.equal(w.writes.length, 0)
})
test('API, RSC, images privées et requêtes externes ignorées', async () => {
  const w = worker()
  for (const path of ['/api/data', '/dashboard?_rsc=abc', '/avatar-prive.png', 'https://other.invalid/data']) {
    const response = await dispatch(w.handlers.fetch, { request: { method: 'GET', mode: 'cors', destination: 'image', url: new URL(path, 'https://example.invalid').href } })
    assert.equal(response, undefined)
  }
  assert.equal(w.writes.length, 0)
})
test('offline : secours public même si aucun cache ne répond', async () => {
  for (const cached of [true, false]) {
    const w = worker({ offline: true, cached })
    const response = await dispatch(w.handlers.fetch, { request: { method: 'GET', mode: 'navigate', url: 'https://example.invalid/dashboard' } })
    assert.equal(response.status, cached ? 200 : 503)
    assert.doesNotMatch(await response.text(), /Page privée/)
  }
})
test('installation limitée aux fichiers publics, purge limitée aux anciens caches Ephemer', async () => {
  const w = worker()
  await dispatch(w.handlers.install, {})
  assert.equal(w.writes.length, 4)
  assert.ok(w.writes.every(url => !url.includes('dashboard')))
  await dispatch(w.handlers.activate, {})
  assert.deepEqual(w.deleted, ['ephemer-static-v3'])
})
test('push : contenu générique et destination externe refusée', async () => {
  const w = worker()
  await dispatch(w.handlers.push, { data: { json: () => ({ title: 'Privé', body: 'Contact secret', url: 'https://evil.invalid' }) } })
  assert.equal(w.shown[0][0], 'Ephemer')
  assert.doesNotMatch(w.shown[0][1].body, /Contact secret/)
  await dispatch(w.handlers.notificationclick, { notification: { close() {}, data: { url: 'javascript:alert(1)' } } })
  assert.deepEqual(w.opened, ['https://example.invalid/dashboard/notifications'])
})

function device(db) {
  const source = stripTypeScriptTypes(readFileSync(new URL('../lib/push-device.ts', import.meta.url), 'utf8'))
    .replace(/^import[^\n]+\n/gm, '').replace(/^export /gm, '')
  return runInNewContext(`${source}\n;({ savePushDevice, removePushDevice })`, { supabase: db })
}
test('désactivation push : filtre utilisateur ET endpoint courant', async () => {
  const filters = []
  let unsubscribed = false
  const query = { eq(key, value) { filters.push([key, value]); return query }, then: resolve => Promise.resolve({ error: null }).then(resolve) }
  const db = { from: () => ({ delete: () => { assert.ok(unsubscribed); return query } }) }
  await device(db).removePushDevice('user-1', { endpoint: 'https://push.invalid/device-1', unsubscribe: async () => { unsubscribed = true; return true } })
  assert.deepEqual(filters, [['user_id', 'user-1'], ['subscription->>endpoint', 'https://push.invalid/device-1']])
})
test('désabonnement refusé : aucune suppression DB', async () => {
  const db = { from() { throw new Error('DB interdite') } }
  await assert.rejects(device(db).removePushDevice('u1', { unsubscribe: async () => false }), /désabonner/)
})
