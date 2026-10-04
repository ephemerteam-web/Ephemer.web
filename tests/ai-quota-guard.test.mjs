import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

function guard({ user = { id: 'verified-user' }, authError = null, count = 1, rpcError = null } = {}) {
  const calls = []
  const source = stripTypeScriptTypes(readFileSync(new URL('../lib/garde-ia.ts', import.meta.url), 'utf8'))
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '')
  const { verifierGardeIA } = runInNewContext(`${source}\n;({verifierGardeIA})`, {
    process: { env: { QUOTA_IA_JOUR: '30' } },
    console: { error() {} },
    supabaseAdmin: {
      auth: { async getUser(token) { calls.push({ type: 'auth', token }); return { data: { user }, error: authError } } },
      async rpc(name, params) { calls.push({ type: 'rpc', name, params }); return { data: count, error: rpcError } },
    },
  })
  return { verifierGardeIA, calls }
}

test('sans session, aucun compteur n’est touché', async () => {
  const h = guard()
  const result = await h.verifierGardeIA(new Request('https://ephemer.invalid/api/generate-message'))
  assert.equal(result.status, 401)
  assert.equal(h.calls.length, 0)
})

test('token invalide ou utilisateur absent : refus avant l’appel RPC', async () => {
  for (const options of [{ authError: { message: 'invalid' } }, { user: null }]) {
    const h = guard(options)
    const result = await h.verifierGardeIA(new Request('https://ephemer.invalid/api/generate-message', { headers: { Authorization: 'Bearer invalid-test-token' } }))
    assert.equal(result.status, 401)
    assert.equal(h.calls.filter(call => call.type === 'rpc').length, 0)
  }
})

test('l’identifiant cible vient de l’identité vérifiée, jamais du corps de la requête', async () => {
  const h = guard()
  const result = await h.verifierGardeIA(new Request('https://ephemer.invalid/api/generate-message', {
    method: 'POST', headers: { Authorization: 'Bearer test-token' }, body: JSON.stringify({ p_user_id: 'another-user', userId: 'another-user' }),
  }))
  assert.equal(result.ok, true)
  assert.equal(result.userId, 'verified-user')
  const rpcCalls = h.calls.filter(call => call.type === 'rpc')
  assert.equal(rpcCalls.length, 1)
  assert.equal(rpcCalls[0].name, 'incrementer_quota_ia')
  assert.equal(rpcCalls[0].params.p_user_id, 'verified-user')
})

test('30e appel accepté, 31e appel refusé avec 429', async () => {
  for (const count of [30, 31]) {
    const h = guard({ count })
    const result = await h.verifierGardeIA(new Request('https://ephemer.invalid/api/generate-message', { headers: { Authorization: 'Bearer test-token' } }))
    assert.equal(result.ok, count === 30)
    if (count === 31) assert.equal(result.status, 429)
  }
})

test('une erreur RPC ne permet jamais de contourner le quota', async () => {
  const h = guard({ count: null, rpcError: { code: '42501' } })
  const result = await h.verifierGardeIA(new Request('https://ephemer.invalid/api/generate-message', { headers: { Authorization: 'Bearer test-token' } }))
  assert.equal(result.ok, false)
  assert.equal(result.status, 500)
})
