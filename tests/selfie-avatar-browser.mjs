// Après node tests/selfie-avatar-preview.mjs ; aucune connexion à Supabase/Cloudflare.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const puppeteer = require('C:/Users/alex0/AppData/Local/npm-cache/_npx/63ac0272e74a711a/node_modules/puppeteer-core')
const dir = path.resolve('out/selfie-avatar-preview'), downloads = path.join(dir, 'downloads')
fs.mkdirSync(downloads, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, userDataDir: path.join(dir, 'edge-' + process.pid), args: ['--no-first-run', '--disable-gpu', '--disable-extensions'] })
const page = await browser.newPage(), errors = []
page.on('pageerror', e => errors.push(e.message))
const cdp = await page.createCDPSession()
await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads })
const click = async text => {
  const handle = await page.evaluateHandle(text => [...document.querySelectorAll('button,a')].find(n => n.textContent.trim() === text), text)
  assert.ok(handle.asElement(), 'Commande absente : ' + text); await handle.asElement().click(); await handle.dispose()
}
const upload = async () => {
  const input = await page.$('input[type="file"]')
  await input.uploadFile(path.resolve('assets/avatars/selfie-style-v1.jpg'))
  await page.waitForSelector('img[alt="Aperçu de ta photo préparée"]')
}
const consent = () => page.click('input[type="checkbox"]')
const generate = async () => { await consent(); await click('Créer mon avatar'); await page.waitForSelector('a[download]') }
const syntheticPhoto = async color => {
  await page.evaluate(async color => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 600
    canvas.getContext('2d').fillStyle = color; canvas.getContext('2d').fillRect(0, 0, 600, 600)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    const transfer = new DataTransfer(), input = document.querySelector('input[type="file"]')
    transfer.items.add(new File([blob], 'photo-courante.png', { type: blob.type })); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }))
  }, color)
  await page.waitForSelector('img[alt="Aperçu de ta photo préparée"]')
  await page.waitForFunction(() => !document.body.textContent.includes('Préparation de ta photo…'))
}
try {
  for (const width of [320, 390, 1440]) {
    console.log('Largeur : ' + width)
    await page.setViewport({ width, height: width === 1440 ? 1000 : 844 })
    await page.goto('http://127.0.0.1:3220'); await page.waitForSelector('input[type="file"]')
    assert.equal(await page.$eval('section button', n => n.disabled), true)
    await upload()
    assert.equal(await page.$eval('section button', n => n.disabled), true)
    await generate()
    for (const theme of ['dark', 'light']) {
      if (theme === 'light') await click('Thème')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Débordement horizontal ' + width)
      await page.screenshot({ path: path.join(dir, `selfie-${theme}-${width}.png`), fullPage: true })
    }
    assert.equal(await page.evaluate(() => window.fixtureGenerated[0].promptVersion), 'celeste-cartoon-v1')
    await click('Hors ligne')
    assert.equal(await page.$eval('section button', n => n.disabled), true)
    await click('Télécharger')
    await page.waitForFunction(() => document.body.textContent.includes('Hors ligne :'))
    await click('Hors ligne'); await click('Effacer')
    assert.equal(await page.evaluate(() => window.fixtureActiveURLs.size), 0)
  }
  assert.ok(fs.readdirSync(downloads).some(name => name.endsWith('.png')), 'Téléchargement absent')
  // Deux photos de même nom mais de contenu différent : aucun octet ou aperçu ancien réutilisé.
  const digests = []
  for (const color of ['#cc3344', '#2277bb']) {
    const oldURLs = await page.evaluate(() => [...window.fixtureActiveURLs])
    await syntheticPhoto(color)
    assert.ok(await page.evaluate(urls => urls.every(url => !window.fixtureActiveURLs.has(url)), oldURLs))
    assert.equal(await page.$('a[download]'), null)
    await generate()
    digests.push(await page.evaluate(() => window.fixtureCalls.at(-1).photoDigest))
  }
  assert.notEqual(digests[0], digests[1])
  // Remplacer la photo pendant une génération dont le faux fournisseur ignore l’annulation.
  await upload(); await consent(); await page.evaluate(() => { window.fixtureDelay = true }); await click('Créer mon avatar')
  await page.waitForFunction(() => !!window.fixtureRelease)
  const before = await page.evaluate(() => window.fixtureGenerated.length)
  await upload(); await page.evaluate(() => { window.fixtureDelay = false; window.fixtureRelease(); window.fixtureRelease = null })
  await page.waitForFunction(() => document.querySelector('section [role="status"]').textContent === '')
  assert.equal(await page.$('a[download]'), null)
  assert.equal(await page.evaluate(() => window.fixtureGenerated.length), before)
  // Effacer pendant un appel ; le fournisseur fictif termine malgré l'annulation.
  await upload(); await consent(); await page.evaluate(() => { window.fixtureDelay = true }); await click('Créer mon avatar')
  await page.waitForFunction(() => !!window.fixtureRelease); await click('Effacer')
  await page.evaluate(() => { window.fixtureDelay = false; window.fixtureRelease(); window.fixtureRelease = null })
  assert.equal(await page.$('section img'), null); assert.equal(await page.$('a[download]'), null)
  assert.equal(await page.evaluate(() => window.fixtureActiveURLs.size), 0)
  assert.equal(await page.evaluate(() => window.fixtureGenerated.length), before)
  // Fermer pendant un appel invalide aussi le callback tardif.
  await upload(); await consent(); await page.evaluate(() => { window.fixtureDelay = true }); await click('Créer mon avatar')
  await page.waitForFunction(() => !!window.fixtureRelease); await click('Fermer')
  await page.evaluate(() => { window.fixtureDelay = false; window.fixtureRelease(); window.fixtureRelease = null })
  assert.equal(await page.$('section'), null); assert.equal(await page.evaluate(() => window.fixtureActiveURLs.size), 0)
  assert.equal(await page.evaluate(() => window.fixtureGenerated.length), before)
  await click('Ouvrir'); await page.waitForSelector('input[type="file"]'); await upload()
  assert.equal(await page.$eval('input[type="checkbox"]', n => n.checked), false)
  // Changement de compte pendant une génération.
  await consent(); await page.evaluate(() => { window.fixtureDelay = true }); await click('Créer mon avatar')
  await page.waitForFunction(() => !!window.fixtureRelease); await click('Changer de compte')
  await page.evaluate(() => { window.fixtureDelay = false; window.fixtureRelease(); window.fixtureRelease = null })
  assert.equal(await page.$('section img'), null)
  assert.equal(await page.evaluate(() => window.fixtureActiveURLs.size), 0)
  assert.equal(await page.evaluate(() => window.fixtureGenerated.length), before)
  // Une source rectangulaire PNG puis WebP est convertie sans déformer ses proportions.
  for (const type of ['image/png', 'image/webp']) {
    await page.evaluate(async type => {
      const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 600
      const blob = await new Promise(resolve => canvas.toBlob(resolve, type))
      const transfer = new DataTransfer(), input = document.querySelector('input[type="file"]')
      transfer.items.add(new File([blob], 'fixture-image', { type: blob.type })); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }))
    }, type)
    await page.waitForFunction(() => {
      const img = document.querySelector('img[alt="Aperçu de ta photo préparée"]')
      return img?.complete && img.naturalWidth === 500 && img.naturalHeight === 250
    })
    await generate()
  }
  // Erreurs quota/session et refus du fichier incompatible.
  await upload(); await consent(); await page.evaluate(() => { window.fixtureError = 429 }); await click('Créer mon avatar')
  await page.waitForFunction(() => document.body.textContent.includes('Quota fictif atteint.'))
  await page.evaluate(() => { window.fixtureError = 401 }); await click('Créer mon avatar')
  await page.waitForFunction(() => document.body.textContent.includes('Session expirée.'))
  await page.evaluate(() => {
    const input = document.querySelector('input[type="file"]'), transfer = new DataTransfer()
    transfer.items.add(new File(['svg'], 'fixture.svg', { type: 'image/svg+xml' })); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await page.waitForFunction(() => document.body.textContent.includes('Choisis une photo JPEG'))
  assert.equal(await page.evaluate(() => window.fixtureActiveURLs.size), 0)
  await upload(); await click('Déconnexion')
  assert.equal(await page.$('section img'), null); assert.equal(await page.evaluate(() => window.fixtureActiveURLs.size), 0)
  await page.evaluate(() => { window.fixtureSignedOut = false }); await upload(); await click('Fermer')
  assert.equal(await page.evaluate(() => window.fixtureActiveURLs.size), 0)
  assert.deepEqual(errors, [])
  assert.ok(await page.evaluate(() => window.fixtureCalls.every(c => c.consent === 'true' && c.photoType === 'image/jpeg' && c.photoSize <= 512 * 1024)))
  assert.ok(await page.evaluate(() => window.fixtureCalls.every(c => c.cache === 'no-store' && c.method === 'POST' && c.fields.join(',') === 'consent,photo')))
  fs.writeFileSync(path.join(dir, 'browser-results.json'), JSON.stringify({ widths: [320, 390, 1440], themes: ['dark', 'light'], downloadOffline: true, resizePNGAndWebP: '1200×600 vers JPEG 500×250', distinctCurrentPhotos: true, noStoreRequests: true, stalePhoto: true, staleAccount: true, staleClear: true, staleUnmount: true, quota: true, session: true, signOut: true, unmount: true, errors }, null, 2))
  console.log('Recette avatar céleste réussie : mobile/ordinateur, deux thèmes, téléchargement hors ligne, résultats tardifs et nettoyage.')
} catch (error) {
  try {
    await page.screenshot({ path: path.join(dir, 'browser-failure.png'), fullPage: true })
    fs.writeFileSync(path.join(dir, 'browser-failure.json'), JSON.stringify({ text: await page.evaluate(() => document.body.innerText), errors }, null, 2))
  } catch { /* Préserver l’erreur initiale si le navigateur est fermé. */ }
  throw error
} finally { await browser.close() }
