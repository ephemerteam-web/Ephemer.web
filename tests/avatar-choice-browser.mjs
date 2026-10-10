// Après node tests/selfie-avatar-preview.mjs --page ; page réelle, services fictifs.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const puppeteer = require('C:/Users/alex0/AppData/Local/npm-cache/_npx/63ac0272e74a711a/node_modules/puppeteer-core')
const dir = path.resolve('out/avatar-choice-preview')
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, userDataDir: path.join(dir, 'edge-' + process.pid), args: ['--no-first-run', '--disable-gpu', '--disable-extensions'] })
const page = await browser.newPage(), errors = []
page.on('pageerror', e => errors.push(e.message))
const click = async text => {
  const handle = await page.evaluateHandle(text => [...document.querySelectorAll('button,a')].find(n => n.textContent.trim() === text), text)
  assert.ok(handle.asElement(), 'Commande absente : ' + text); await handle.asElement().click(); await handle.dispose()
}
const choose = mode => page.click(`input[type="radio"][value="${mode}"]`)
const ready = text => page.waitForFunction(text => document.body.textContent.includes(text), {}, text)
const upload = async () => {
  await (await page.$('input[type="file"]')).uploadFile(path.resolve('assets/avatars/selfie-style-v1.jpg'))
  await page.waitForSelector('img[alt="Aperçu de ta photo préparée"]')
}
try {
  for (const width of [320, 390, 1440]) {
    console.log('Page Avatar : ' + width)
    await page.setViewport({ width, height: width === 1440 ? 1000 : 844 })
    await page.goto('http://127.0.0.1:3221'); await ready('Personnaliser mon avatar')
    assert.equal(await page.$eval('input[value="personnalisable"]', n => n.checked), true)
    assert.equal(await page.$('input[type="file"]'), null)
    for (const theme of ['dark', 'light']) {
      if (theme === 'light') await click('Thème')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      await page.screenshot({ path: path.join(dir, `custom-${theme}-${width}.png`), fullPage: true })
      await choose('photo-ia')
      await page.waitForSelector('input[type="file"]')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      await page.screenshot({ path: path.join(dir, `photo-${theme}-${width}.png`), fullPage: true })
      await choose('personnalisable'); await ready('Personnaliser mon avatar')
    }
  }
  // L’enregistrement personnalisable reste disponible et l’outil IA ne l’écrit pas.
  await click('Personnaliser mon avatar'); await ready('Valider les modifications')
  await click('Valider les modifications'); await ready('Avatar enregistré dans ton compte.')
  const saved = await page.evaluate(() => JSON.stringify(window.fixtureAvatarRows.get('compte-a')))
  assert.equal(await page.evaluate(() => window.fixtureAvatarWrites), 1)
  // Les flèches du clavier pilotent le groupe radio natif.
  await page.focus('input[value="personnalisable"]'); await page.keyboard.press('ArrowRight')
  await page.waitForSelector('input[type="file"]')
  assert.equal(await page.$eval('input[value="photo-ia"]', n => n.checked), true)
  await upload(); await page.click('input[type="checkbox"]'); await click('Créer mon avatar'); await page.waitForSelector('a[download]')
  await choose('personnalisable'); await ready('Personnaliser mon avatar')
  assert.equal(await page.evaluate(() => window.fixtureActiveURLs.size), 0)
  assert.equal(await page.evaluate(() => JSON.stringify(window.fixtureAvatarRows.get('compte-a'))), saved)
  assert.equal(await page.evaluate(() => window.fixtureAvatarWrites), 1)
  await choose('photo-ia'); await page.waitForSelector('input[type="file"]')
  assert.equal(await page.$('section img'), null); assert.equal(await page.$eval('input[type="checkbox"]', n => n.checked), false)
  // Une réponse tardive ne ressuscite pas l’aperçu après le changement d’outil.
  await upload(); await page.click('input[type="checkbox"]'); await page.evaluate(() => { window.fixtureDelay = true }); await click('Créer mon avatar')
  await page.waitForFunction(() => !!window.fixtureRelease)
  await choose('personnalisable'); await ready('Personnaliser mon avatar')
  await page.evaluate(() => { window.fixtureDelay = false; window.fixtureRelease(); window.fixtureRelease = null })
  await choose('photo-ia'); await page.waitForSelector('input[type="file"]')
  assert.equal(await page.$('a[download]'), null); assert.equal(await page.evaluate(() => window.fixtureActiveURLs.size), 0)
  // Le changement de compte réinitialise le choix et les données privées.
  await upload(); await click('Changer de compte'); await ready('Personnaliser mon avatar')
  assert.equal(await page.$eval('input[value="personnalisable"]', n => n.checked), true)
  assert.equal(await page.evaluate(() => window.fixtureActiveURLs.size), 0)
  await choose('photo-ia'); await click('Hors ligne'); await ready('Hors ligne : reconnecte-toi')
  await click('Hors ligne'); await upload(); await page.click('input[type="checkbox"]'); await click('Créer mon avatar'); await page.waitForSelector('a[download]')
  // La validation seule écrit le portrait et actualise le vrai badge partagé.
  await page.evaluate(() => { window.fixturePortraitMissing = true })
  await click('Valider et enregistrer'); await ready('installation du script Avatar IA')
  assert.equal(await page.$('[data-profile-badge] img'), null)
  await page.evaluate(() => { window.fixturePortraitMissing = false })
  await click('Valider et enregistrer'); await ready('Ton avatar IA est enregistré')
  await page.waitForSelector('[data-profile-badge] img')
  const portraitImage = await page.$eval('[data-profile-badge] img', n => n.src)
  assert.match(portraitImage, /^data:image\/jpeg;base64,/)
  const portraitCalls = await page.evaluate(() => window.fixtureCalls.length)
  await click('Effacer'); assert.equal(await page.$eval('[data-profile-badge] img', n => n.src), portraitImage)
  // Le fournisseur ne sera pas rappelé à la réouverture du profil.
  await click('Fermer'); await click('Ouvrir'); await ready('Personnaliser mon avatar')
  await page.waitForSelector('[data-profile-badge] img')
  assert.equal(await page.$eval('[data-profile-badge] img', n => n.src), portraitImage)
  assert.equal(await page.evaluate(() => window.fixtureCalls.length), portraitCalls)
  await choose('photo-ia'); await page.waitForSelector('img[alt="Ton portrait IA enregistré"]')
  // Une autre validation sur le compte provoque un conflit, pas un écrasement.
  await upload(); await page.click('input[type="checkbox"]'); await click('Créer mon avatar'); await page.waitForSelector('a[download]')
  await page.evaluate(() => { const row=window.fixtureAvatarRows.get(window.fixtureOwner);row.revision++;row.portrait_ia={...row.portrait_ia,revision:row.revision} })
  await click('Valider et enregistrer'); await ready('Ton avatar a changé')
  await click('Changer de compte'); await ready('Personnaliser mon avatar')
  assert.equal(await page.$('[data-profile-badge] img'), null)
  await click('Changer de compte'); await ready('Personnaliser mon avatar'); await page.waitForSelector('[data-profile-badge] img')
  // Une sauvegarde tardive est abandonnée au changement de compte.
  await choose('photo-ia'); await upload(); await page.click('input[type="checkbox"]'); await click('Créer mon avatar'); await page.waitForSelector('a[download]')
  await page.evaluate(() => { window.fixtureSaveDelay=true }); await click('Valider et enregistrer')
  await page.waitForFunction(() => !!window.fixtureSaveRelease)
  const writesBefore = await page.evaluate(() => window.fixtureAvatarWrites)
  await click('Changer de compte'); await ready('Personnaliser mon avatar')
  await page.evaluate(() => { window.fixtureSaveDelay=false;window.fixtureSaveRelease() })
  assert.equal(await page.$('[data-profile-badge] img'), null)
  assert.equal(await page.evaluate(() => window.fixtureAvatarWrites), writesBefore)
  // Valider le dessin retire le portrait, sans réécrire les cartes.
  await click('Changer de compte'); await ready('Personnaliser mon avatar')
  await click('Personnaliser mon avatar'); await ready('Valider les modifications'); await click('Valider les modifications'); await ready('Avatar enregistré dans ton compte.')
  assert.equal(await page.$('[data-profile-badge] img'), null)
  assert.equal(await page.evaluate(() => window.fixtureAvatarRows.get(window.fixtureOwner).portrait_ia), null)
  assert.deepEqual(errors, [])
  fs.writeFileSync(path.join(dir, 'browser-results.json'), JSON.stringify({ widths: [320, 390, 1440], themes: ['dark', 'light'], keyboard: true, customSave: true, privateCleanup: true, staleResult: true, accountReset: true, offline: true, portraitSave: true, profileBadge: true, reopen: true, conflict: true, missingColumn: true, lateSaveDiscarded: true, switchBackToCustom: true, errors }, null, 2))
  console.log('Avatars vérifiés : validation IA, profil, réouverture, conflit, colonne absente, compte changé, retour personnalisable et hors ligne.')
} catch (error) {
  try { await page.screenshot({ path: path.join(dir, 'browser-failure.png'), fullPage: true }); fs.writeFileSync(path.join(dir, 'browser-failure.json'), JSON.stringify({ text: await page.evaluate(() => document.body.innerText), errors }, null, 2)) } catch { /* Garder l’erreur initiale. */ }
  throw error
} finally { await browser.close() }
