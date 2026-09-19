import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

function load(path, name, context) {
  const source = stripTypeScriptTypes(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
    .replace(/^import[^\n]+\n/gm, '').replace(/^export /gm, '')
  return runInNewContext(`${source}\n;${name}`, context)
}
function response(url = null) {
  const values = new Map()
  return { url: url?.toString(), headers: new Headers(), cookies: {
    set(name, value, options) {
      const cookie = typeof name === 'object' ? name : { name, value, ...options }
      values.set(cookie.name, cookie)
    },
    getAll: () => [...values.values()],
  } }
}
const NextResponse = { next: () => response(), redirect: (url) => response(url) }
const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'simulation' }

test('proxy : identité vérifiée, cookies renouvelés et réponse privée', async () => {
  const request = { url: 'https://example.invalid/dashboard', cookies: response().cookies }
  let verified = false
  const proxy = load('proxy.ts', 'proxy', {
    process: { env }, NextResponse, URL,
    createServerClient: (_url, _key, { cookies }) => ({ auth: { getUser: async () => {
      verified = true
      cookies.setAll([{ name: 'test-cookie', value: 'refreshed', options: { path: '/' } }])
      return { data: { user: { id: 'test' } }, error: null }
    } } }),
  })
  const result = await proxy(request)
  assert.ok(verified)
  assert.equal(result.url, undefined)
  assert.equal(result.cookies.getAll()[0].value, 'refreshed')
  assert.equal(request.cookies.getAll()[0].value, 'refreshed')
  assert.equal(result.headers.get('cache-control'), 'private, no-store')
})

test('proxy : absence de session, redirection sans perdre les cookies', async () => {
  const proxy = load('proxy.ts', 'proxy', {
    process: { env }, NextResponse, URL,
    createServerClient: (_url, _key, { cookies }) => ({ auth: { getUser: async () => {
      cookies.setAll([{ name: 'test-cookie', value: '', options: { maxAge: 0 } }])
      return { data: { user: null }, error: null }
    } } }),
  })
  const result = await proxy({ url: 'https://example.invalid/dashboard', cookies: response().cookies })
  assert.equal(result.url, 'https://example.invalid/connexion')
  assert.equal(result.cookies.getAll()[0].maxAge, 0)
})

test('callback : code manquant/refusé, reset valide et destination externe refusée', async () => {
  for (const [query, error, target] of [
    ['', null, '/connexion?auth_error=1'],
    ['?code=test', { message: 'expired' }, '/connexion?auth_error=1'],
    ['?code=test&next=/reset-password', null, '/reset-password'],
    ['?code=test&next=https://evil.invalid', null, '/dashboard'],
  ]) {
    const GET = load('app/auth/callback/route.ts', 'GET', {
      process: { env }, NextResponse, URL, cookies: async () => response().cookies,
      createServerClient: () => ({ auth: { exchangeCodeForSession: async () => ({ error }) } }),
    })
    const result = await GET({ url: `https://example.invalid/auth/callback${query}` })
    assert.equal(result.url, `https://example.invalid${target}`)
  }
})
