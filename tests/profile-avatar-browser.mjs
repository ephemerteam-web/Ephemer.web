// Après node tests/profile-preview.mjs ; portrait et comptes fictifs, aucun réseau externe.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const puppeteer = require('C:/Users/alex0/AppData/Local/npm-cache/_npx/63ac0272e74a711a/node_modules/puppeteer-core')
const dir = path.resolve('out/profile-preview'), downloads = path.join(dir, `avatar-downloads-${process.pid}`)
fs.mkdirSync(downloads, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, userDataDir: path.join(dir, `edge-avatar-${process.pid}`), args: ['--no-first-run', '--disable-gpu', '--disable-extensions'] })
const page = await browser.newPage(), errors = [], external = []
page.on('pageerror', error => errors.push(error.message))
// Chaque largeur recharge volontairement les données fictives non enregistrées.
page.on('dialog', dialog => { void (dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss()) })
await page.setRequestInterception(true)
page.on('request', request => {
  if (/^(?:http:\/\/127\.0\.0\.1:3218\/|data:|about:)/.test(request.url())) void request.continue()
  else { external.push(request.url()); void request.abort() }
})
const cdp = await page.createCDPSession()
await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const thumbnail = 'button[aria-label="Modifier mon avatar"]'
const dialog = 'dialog[open]'
const click = async text => {
  const node = await page.evaluateHandle(text => [...document.querySelectorAll('button,a,summary')].find(n => n.textContent.trim() === text), text)
  assert.ok(node.asElement(), 'Commande absente : ' + text)
  await node.asElement().click(); await node.dispose()
}
async function center() {
  await page.$eval(thumbnail, node => node.scrollIntoView({ block: 'center' }))
  const box = await page.$eval(thumbnail, node => { const box = node.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height } })
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}
async function longPress(touch = false) {
  const point = await center()
  if (touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] })
  else { await page.mouse.move(point.x, point.y); await page.mouse.down() }
  await page.waitForSelector(`${dialog} img[alt="Ton portrait IA enregistré, en grand"]`)
  if (touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  else await page.mouse.up()
}
try {
  for (const width of [320, 390, 1440]) {
    console.log('Avatar profil : largeur ' + width)
    await page.setViewport({ width, height: width === 1440 ? 1000 : 844, isMobile: width !== 1440, hasTouch: width !== 1440 })
    await page.goto('http://127.0.0.1:3218')
    await page.waitForSelector('input[autocomplete="given-name"]')
    assert.ok(await page.$(`${thumbnail} img`), 'Portrait enregistré absent du cadre')
    assert.equal(await page.$eval('header a', node => node.getAttribute('href')), '/avatar')
    for (const theme of ['dark', 'light']) {
      if (theme === 'light') await click('Thème')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      await page.screenshot({ path: path.join(dir, `profile-avatar-${theme}-${width}.png`), fullPage: true })
      const before = await page.evaluate(() => window.fixtureNavigations.length)
      // Le clic simple respecte le garde existant des modifications de profil.
      await page.click(thumbnail); await page.waitForSelector(dialog)
      assert.ok(await page.$eval(dialog, node => node.textContent.includes('Quitter sans enregistrer')))
      await click('Annuler'); assert.equal(await page.evaluate(() => window.fixtureNavigations.length), before)
      // Un appui prolongé réel au doigt à 320 px, à la souris sur les autres formats.
      await longPress(width === 320)
      assert.equal(await page.evaluate(() => window.fixtureNavigations.length), before)
      assert.ok(await page.$eval(`${dialog} img`, node => node.complete && node.naturalWidth === 500))
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      assert.ok(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]')), 'Focus hors du dialogue')
      await page.screenshot({ path: path.join(dir, `profile-avatar-large-${theme}-${width}.png`) })
      await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('dialog[open]'))
      // Le chemin vers l’éditeur passe aussi après confirmation explicite de la saisie.
      await page.click(thumbnail); await page.waitForSelector(dialog); await click('Confirmer')
      await page.waitForFunction(before => window.fixtureNavigations.length === before + 1, {}, before)
      assert.equal(await page.evaluate(() => window.fixtureNavigations.at(-1)), '/avatar')
    }
  }
  // Agrandissement au clavier, confinement et retour du focus.
  await page.focus('button[aria-haspopup="dialog"]'); await page.keyboard.press('Enter'); await page.waitForSelector(dialog)
  assert.equal(await page.evaluate(() => document.activeElement?.textContent.trim()), 'Fermer')
  await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement?.textContent.trim()), 'Télécharger mon avatar')
  await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift')
  assert.equal(await page.evaluate(() => document.activeElement?.textContent.trim()), 'Fermer')
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('dialog[open]'))
  assert.equal(await page.evaluate(() => document.activeElement?.textContent.trim()), 'Agrandir')
  await click('Hors ligne'); await click('Agrandir'); await page.waitForSelector(dialog)
  await page.click(`${dialog} a[download]`)
  const downloaded = path.join(downloads, 'avatar-ephemer.jpg')
  for (let tries = 0; tries < 60 && !fs.existsSync(downloaded); tries++) await delay(100)
  assert.ok(fs.existsSync(downloaded), 'Téléchargement absent')
  assert.deepEqual(fs.readFileSync(downloaded), fs.readFileSync(path.resolve('assets/avatars/selfie-style-v1.jpg')))
  await click('Fermer'); await click('Hors ligne')
  // Le changement de compte ferme une fenêtre ouverte et retire le portrait précédent.
  await click('Agrandir'); await page.waitForSelector(dialog)
  await page.evaluate(() => [...document.querySelectorAll('button')].find(n => n.textContent.trim() === 'Changer de compte').click())
  await page.waitForFunction(() => document.querySelector('input[autocomplete="given-name"]')?.value === 'Compte B')
  assert.equal(await page.$(dialog), null); assert.equal(await page.$(`${thumbnail} img`), null)
  assert.equal(await page.$('button[aria-haspopup="dialog"]'), null)
  await click('Changer de compte'); await page.waitForSelector(`${thumbnail} img`)
  // Une mise à jour du portrait abandonne également l’agrandissement et le délai.
  await click('Agrandir'); await page.waitForSelector(dialog)
  await page.evaluate(() => [...document.querySelectorAll('button')].find(n => n.textContent.trim() === 'Remplacer le portrait').click())
  await page.waitForFunction(() => !document.querySelector('dialog[open]'))
  const point = await center(); await page.mouse.move(point.x, point.y); await page.mouse.down()
  await page.evaluate(() => [...document.querySelectorAll('button')].find(n => n.textContent.trim() === 'Changer de compte').click())
  await delay(650); await page.mouse.up(); assert.equal(await page.$(dialog), null)
  await click('Changer de compte'); await page.waitForSelector(`${thumbnail} img`)
  // Un geste de défilement tactile ne déclenche ni dialogue ni navigation.
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  const touch = await center(), before = await page.evaluate(() => window.fixtureNavigations.length)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...touch, id: 1 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touch.x, y: touch.y - 60, id: 1 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await delay(650)
  assert.equal(await page.$(dialog), null); assert.equal(await page.evaluate(() => window.fixtureNavigations.length), before)
  assert.deepEqual(errors, [])
  // Le filtre bloque aussi les injections du logiciel local AdGuard, étrangères à l’application.
  assert.deepEqual(external.filter(url => new URL(url).hostname !== 'local.adguard.org'), [])
  assert.equal(await page.evaluate(() => window.fixtureCalls.length), 0)
  fs.writeFileSync(path.join(dir, 'avatar-browser-results.json'), JSON.stringify({ widths: [320, 390, 1440], themes: ['dark', 'light'], shortClick: true, draftGuard: true, mouseLongPress: true, touchLongPress: true, keyboard: true, focus: true, offlineDownload: true, accountChange: true, portraitChange: true, touchScrollCancelled: true, errors, blockedRequests: external }, null, 2))
  console.log('Recette avatar profil réussie : cadre, clic, appui souris/tactile, clavier, téléchargement hors ligne, comptes et défilement.')
} catch (error) {
  await page.screenshot({ path: path.join(dir, 'avatar-browser-failure.png'), fullPage: true })
  fs.writeFileSync(path.join(dir, 'avatar-browser-failure.json'), JSON.stringify({ text: await page.evaluate(() => document.body.innerText), errors, external }, null, 2))
  throw error
} finally { await browser.close() }
