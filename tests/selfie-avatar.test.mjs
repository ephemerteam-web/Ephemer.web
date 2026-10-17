import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import { deflateSync } from 'node:zlib'

function load(path, names, context = {}) {
  const code = stripTypeScriptTypes(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
    .replace(/^import ['"][^'"]+['"]\r?\n/gm, '').replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?\n/gm, '').replace(/^export /gm, '')
  return runInNewContext(`${code}\n;({${names}})`, { Error, DOMException, Request, Response, Blob, File, FormData, AbortSignal, Uint8Array, DataView, Buffer, TextDecoder, process: { env: {}, cwd: () => '' }, ...context })
}
const contract = load('lib/selfie-avatar-contract.ts', 'SelfieAvatarError,rasterInfo,validateSelfieInput,SELFIE_BODY_MAX_BYTES,SELFIE_OUTPUT_MAX_BYTES,SELFIE_OUTPUT_SIDE,SELFIE_PROMPT_VERSION,SELFIE_INPUT_MAX_BYTES,SELFIE_INPUT_MAX_SIDE,SELFIE_SOURCE_MAX_BYTES,SELFIE_SOURCE_TYPES')
const transport = load('lib/ai-transport.ts', 'limitedJSON', { AIInputError: contract.SelfieAvatarError })
const style = readFileSync(new URL('../assets/avatars/selfie-style-v1.jpg', import.meta.url))

// Véritable PNG uni, sans données personnelles : signature, IHDR, IDAT et IEND.
export function fixturePNG(side = 1024) {
  const chunk = (name, data) => {
    const body = Buffer.concat([Buffer.from(name), data]), header = Buffer.alloc(4), crc = Buffer.alloc(4)
    header.writeUInt32BE(data.length)
    let sum = 0xffffffff
    for (const byte of body) { sum ^= byte; for (let i = 0; i < 8; i++) sum = (sum >>> 1) ^ ((sum & 1) ? 0xedb88320 : 0) }
    crc.writeUInt32BE((sum ^ 0xffffffff) >>> 0)
    return Buffer.concat([header, body, crc])
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(side); ihdr.writeUInt32BE(side, 4); ihdr[8] = 8; ihdr[9] = 2
  const rows = Buffer.alloc((1 + side * 3) * side)
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const start = y * (1 + side * 3) + 1 + x * 3
    rows[start] = 23; rows[start + 1] = 52; rows[start + 2] = 86
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))])
}
const output = fixturePNG()
function harness(overrides = {}, randomPoseIndex = () => 0) {
  const calls = [], deps = {
    env: { CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_API_TOKEN: 'fixture-only', EPHEMER_AVATAR_AI_ENABLED: 'true' },
    verifyUser: async token => { calls.push(['auth', token]); return 'verified-owner' },
    consumeQuota: async owner => { calls.push(['quota', owner]); return { ok: true, userId: owner } },
    fetch: async (url, options) => { calls.push(['fetch', url, options]); return Response.json({ success: true, result: { image: output.toString('base64') } }) },
    timeout: () => new AbortController().signal,
    ...overrides,
  }
  const server = load('lib/selfie-avatar-server.ts', 'generateSelfieAvatar,SELFIE_MODEL,SELFIE_PROMPT,SELFIE_POSES', {
    ...contract, ...transport, randomInt: randomPoseIndex, supabaseAdmin: {}, consommerQuotaIA: async () => {}, fetch: () => {},
  })
  return { calls, server, run: request => server.generateSelfieAvatar(request, deps) }
}
function request({ auth = 'Bearer fixture-session', photo = style, type = 'image/jpeg', consent = 'true', extra, signal } = {}) {
  const form = new FormData()
  form.append('photo', new Blob([photo], { type }), 'fixture.jpg')
  if (consent !== null) form.append('consent', consent)
  if (extra) form.append(...extra)
  return new Request('https://ephemer.invalid/api/avatars/generate', { method: 'POST', body: form, headers: auth ? { Authorization: auth } : {}, signal })
}

test('avatar selfie : session obligatoire et vérifiée avant tout quota ou fournisseur', async () => {
  for (const auth of [null, 'Basic fixture', 'Bearer ']) {
    const h = harness(); assert.equal((await h.run(request({ auth }))).status, 401); assert.equal(h.calls.length, 0)
  }
  const h = harness({ verifyUser: async () => null })
  assert.equal((await h.run(request())).status, 401); assert.equal(h.calls.length, 0)
})

test('avatar selfie : consentement, signature, dimensions et champs fermés avant quota', async () => {
  for (const input of [
    { consent: 'false' }, { consent: null }, { photo: Buffer.from('<svg/>') }, { photo: fixturePNG(500), type: 'image/png' },
    { photo: Buffer.alloc(513 * 1024) }, { extra: ['prompt', 'autre style'] }, { extra: ['photo', 'doublon'] },
    { extra: ['ownerId', 'autre-compte'] }, { extra: ['consent', 'true'] }, { type: 'application/octet-stream' },
  ]) {
    const h = harness(), response = await h.run(request(input))
    assert.ok([400, 413].includes(response.status)); assert.equal(h.calls.filter(c => c[0] !== 'auth').length, 0)
  }
  const oversized = Buffer.from(style)
  // Modifier seulement les dimensions SOF du JPEG de fixture.
  for (let i = 2; i < oversized.length - 9; i++) if (oversized[i] === 255 && [192, 194].includes(oversized[i + 1])) { oversized.writeUInt16BE(512, i + 7); break }
  const h = harness(); assert.equal((await h.run(request({ photo: oversized }))).status, 400); assert.equal(h.calls.length, 1)
})

test('avatar selfie : corps borné même sans content-length', async () => {
  const h = harness(), body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(1024 * 1024 + 1)); c.close() } })
  const response = await h.run(new Request('https://ephemer.invalid/api/avatars/generate', { method: 'POST', duplex: 'half', body, headers: { Authorization: 'Bearer fixture', 'Content-Type': 'multipart/form-data; boundary=test' } }))
  assert.equal(response.status, 413); assert.equal(h.calls.length, 1)
})

test('avatar selfie : configuration manquante bloque avant quota', async () => {
  for (const overrides of [{ env: {} }, { env: { EPHEMER_AVATAR_AI_ENABLED: 'false' } }]) {
    const h = harness(overrides), response = await h.run(request())
    assert.ok(response.status >= 500); assert.equal(h.calls.filter(c => c[0] === 'quota').length, 0)
    assert.ok(!(await response.text()).includes('private-file-path'))
  }
})

test('avatar selfie : quota existant consommé pour l’identité vérifiée ; refus ferme', async () => {
  for (const status of [429, 500]) {
    const h = harness({ consumeQuota: async owner => { assert.equal(owner, 'verified-owner'); return { ok: false, status, message: 'Limite de test.' } } })
    assert.equal((await h.run(request())).status, status); assert.equal(h.calls.filter(c => c[0] === 'fetch').length, 0)
  }
})

test('avatar selfie : selfie seul, consignes communes et sortie privée 1024 carrée', async () => {
  const h = harness(), response = await h.run(request())
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/png')
  assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(response.headers.get('x-ephemer-avatar-prompt'), 'celeste-cartoon-v1')
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), output)
  assert.deepEqual(h.calls.map(c => c[0]), ['auth', 'quota', 'fetch'])
  const [, url, options] = h.calls[2]
  assert.ok(url.endsWith('/ai/run/@cf/black-forest-labs/flux-2-klein-4b'))
  assert.equal(options.headers['Content-Type'], undefined); assert.equal(options.redirect, 'error')
  assert.ok(options.body.get('prompt').startsWith(h.server.SELFIE_PROMPT + '\n\n'))
  assert.ok(options.body.get('prompt').endsWith(h.server.SELFIE_POSES[0]))
  assert.equal(options.body.get('width'), '1024'); assert.equal(options.body.get('height'), '1024')
  assert.deepEqual([...options.body.keys()].sort(), ['height', 'input_image_0', 'prompt', 'width'])
  assert.deepEqual(Buffer.from(await options.body.get('input_image_0').arrayBuffer()), style)
  assert.equal(options.body.get('input_image_1'), null)
})

test('avatar selfie : cinq poses accessibles, une seule consigne tirée à chaque appel', async () => {
  let draws = 0
  const h = harness({}, max => {
    assert.equal(max, 5)
    return draws++ % max
  })
  assert.equal(h.server.SELFIE_POSES.length, 5)
  assert.equal(new Set(h.server.SELFIE_POSES).size, 5)
  // Inclure un second tour : le tirage est refait, sans mémoire ni pose exclue.
  for (let index = 0; index < 10; index++) {
    assert.equal((await h.run(request())).status, 200)
    const sent = h.calls.filter(call => call[0] === 'fetch').at(-1)[2].body
    const prompt = sent.get('prompt')
    assert.ok(prompt.startsWith(h.server.SELFIE_PROMPT + '\n\n'))
    const included = h.server.SELFIE_POSES.filter(pose => prompt.includes(pose))
    assert.equal(included.length, 1)
    assert.equal(included[0], h.server.SELFIE_POSES[index % 5])
    assert.deepEqual([...sent.keys()].sort(), ['height', 'input_image_0', 'prompt', 'width'])
  }
  assert.equal(draws, 10)
})

test('avatar selfie : chaque appel transmet sa photo courante sans reprendre une entrée précédente', async () => {
  // JPEG valides et distincts, sans photo personnelle : ajout d’un commentaire de fixture.
  const photos = ['photo-A', 'photo-B'].map(label => {
    const comment = Buffer.from(label), marker = Buffer.alloc(4)
    marker[0] = 255; marker[1] = 254; marker.writeUInt16BE(comment.length + 2, 2)
    return Buffer.concat([style.subarray(0, 2), marker, comment, style.subarray(2)])
  })
  const h = harness()
  for (const photo of photos) {
    assert.notDeepEqual(photo, style)
    assert.equal((await h.run(request({ photo }))).status, 200)
  }
  const sent = h.calls.filter(call => call[0] === 'fetch')
  assert.equal(sent.length, 2)
  assert.notEqual(sent[0][2].body, sent[1][2].body)
  for (let index = 0; index < sent.length; index++) {
    const [, url, options] = sent[index]
    assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${'a'.repeat(32)}/ai/run/${h.server.SELFIE_MODEL}`)
    assert.equal(options.method, 'POST'); assert.equal(options.cache, 'no-store')
    assert.deepEqual([...options.body.keys()].sort(), ['height', 'input_image_0', 'prompt', 'width'])
    const selfie = Buffer.from(await options.body.get('input_image_0').arrayBuffer())
    assert.deepEqual(selfie, photos[index])
    assert.notDeepEqual(selfie, photos[1 - index])
    assert.equal(options.body.get('input_image_1'), null)
    assert.ok(options.body.get('prompt').startsWith(h.server.SELFIE_PROMPT + '\n\n'))
    assert.ok(options.body.get('prompt').endsWith(h.server.SELFIE_POSES[0]))
  }
  // Après deux succès, une photo vide reste refusée : aucune reprise de l’ancien selfie.
  assert.equal((await h.run(request({ photo: Buffer.alloc(0) }))).status, 413)
  assert.equal(h.calls.filter(call => call[0] === 'fetch').length, 2)
})

test('avatar selfie : erreur fournisseur, dépassement et réponses inutilisables sans fuite ni réessai', async () => {
  for (const [provider, expected] of [
    [() => new Response('private-upstream-detail', { status: 403 }), 502],
    [() => new Response('quota', { status: 429 }), 429],
    [() => Response.json({ success: false }), 502],
    [() => Response.json({ success: true, result: { image: '<svg/>' } }), 502],
    [() => Response.json({ success: true, result: { image: style.toString('base64') } }), 502],
    [() => Response.json({ success: true, result: { image: Buffer.from('fake').toString('base64') } }), 502],
    [() => new Response('not-json'), 502],
    [() => new Response('', { headers: { 'Content-Length': String(13 * 1024 * 1024) } }), 502],
  ]) {
    let calls = 0
    const h = harness({ fetch: async () => { calls++; return provider() } }), response = await h.run(request())
    assert.equal(response.status, expected); assert.equal(calls, 1); assert.equal(response.headers.get('cache-control'), 'no-store')
    const message = await response.text(); assert.ok(!message.includes('fixture-only')); assert.ok(!message.includes('private-upstream-detail'))
  }
})

test('avatar selfie : expiration avant appel et interruption pendant appel', async () => {
  const expired = AbortSignal.abort(new DOMException('test', 'TimeoutError'))
  const before = harness({ timeout: () => expired })
  assert.equal((await before.run(request())).status, 504); assert.equal(before.calls.length, 1)
  const controller = new AbortController()
  const during = harness({ timeout: () => controller.signal, fetch: async (_url, { signal }) => {
    controller.abort(new DOMException('test', 'TimeoutError')); signal.throwIfAborted()
  } })
  assert.equal((await during.run(request())).status, 504)
})

test('avatar selfie : le JPEG de fixture respecte les limites et les formats sont identifiés', () => {
  assert.equal(contract.validateSelfieInput(style).width, 500)
  assert.equal(contract.rasterInfo(output).type, 'image/png')
  assert.throws(() => contract.rasterInfo(new Uint8Array([255, 216, 255, 217])))
})

function clientHarness({ online = true, ownerAfter = 'verified-owner', provider, session = true } = {}) {
  let reads = 0, calls = 0
  const client = load('lib/selfie-avatar-client.ts', 'requestSelfieAvatar', {
    ...contract, navigator: { onLine: online },
    supabase: { auth: {
      getUser: async () => ({ data: { user: { id: ++reads === 1 ? 'verified-owner' : ownerAfter } }, error: null }),
      getSession: async () => ({ data: { session: session ? { user: { id: 'verified-owner' }, access_token: 'fixture-session' } : null }, error: null }),
    } },
    fetch: async (url, options) => {
      calls++; assert.equal(url, '/api/avatars/generate'); assert.equal(options.body.get('consent'), 'true')
      assert.equal(options.method, 'POST'); assert.equal(options.cache, 'no-store'); assert.equal(options.redirect, 'error')
      assert.deepEqual([...options.body.keys()].sort(), ['consent', 'photo'])
      return provider ? provider() : new Response(output, { headers: { 'Content-Type': 'image/png', 'X-Ephemer-Avatar-Prompt': 'celeste-cartoon-v1' } })
    },
  })
  return { run: signal => client.requestSelfieAvatar('verified-owner', new File([style], 'selfie.jpg', { type: 'image/jpeg' }), signal ?? new AbortController().signal), calls: () => calls }
}

test('avatar selfie navigateur : hors ligne ou session absente, aucun appel à la génération', async () => {
  for (const options of [{ online: false }, { session: false }]) {
    const h = clientHarness(options); await assert.rejects(h.run(), /Hors ligne|Session expirée/); assert.equal(h.calls(), 0)
  }
})

test('avatar selfie navigateur : résultat typé et compte revérifié après réception', async () => {
  const h = clientHarness(), result = await h.run()
  assert.equal(result.file.name, 'avatar-ephemer.png'); assert.equal(result.file.type, 'image/png'); assert.equal(result.promptVersion, 'celeste-cartoon-v1')
  const stale = clientHarness({ ownerAfter: 'other-owner' })
  await assert.rejects(stale.run(), /session a changé/); assert.equal(stale.calls(), 1)
})

test('avatar selfie navigateur : erreur française, taille et version du résultat contrôlées', async () => {
  for (const provider of [
    () => Response.json({ error: { message: 'Quota de test atteint.' } }, { status: 429 }),
    () => new Response(output, { headers: { 'Content-Type': 'image/png', 'X-Ephemer-Avatar-Prompt': 'wrong' } }),
    () => new Response(output, { headers: { 'Content-Length': String(9 * 1024 * 1024) } }),
  ]) await assert.rejects(clientHarness({ provider }).run(), /Quota de test|format|invalide/)
})
