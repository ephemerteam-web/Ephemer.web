import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url), puppeteer = require('C:/Users/alex0/AppData/Local/npm-cache/_npx/63ac0272e74a711a/node_modules/puppeteer-core')
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-first-run', '--disable-gpu'] })
const page = await browser.newPage(), errors = [], dir = path.resolve('out/celebration-unified-preview')
fs.mkdirSync(dir, { recursive: true })
page.on('pageerror', error => errors.push(error.message))
page.on('dialog', dialog => { void dialog.accept() })
const click = async (text, scope) => {
  const handle = await page.evaluateHandle(({ text, scope }) => [...(scope ? document.querySelector(scope) : document).querySelectorAll('button,a,summary')].find(node => node.textContent.trim() === text && node.checkVisibility()), { text, scope })
  assert.ok(handle.asElement(), 'Commande absente : ' + text); await handle.asElement().click(); await handle.dispose()
}
const ready = text => page.waitForFunction(text => document.body.textContent.includes(text), {}, text)
try {
  for (const width of [320, 390, 1440]) {
    await page.setViewport({ width, height: width === 1440 ? 1000 : 844 }); await page.goto('http://127.0.0.1:3221'); await ready('Organisation personnelle')
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
      for (const tab of ['Organisation', 'Idées et cadeaux', 'Frais']) {
        await click(tab)
        if (tab === 'Frais') await click('Mon budget facultatif')
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `${width}/${theme}/${tab}: débordement`)
        await page.screenshot({ path: path.join(dir, `${width}-${theme}-${tab === 'Organisation' ? 'organisation' : tab === 'Frais' ? 'frais' : 'idees'}.png`), fullPage: true })
        if (tab === 'Frais') await click('Mon budget facultatif')
      }
    }
  }
  await click('Organisation')
  await page.focus('[role="tab"][aria-selected="true"]'); await page.keyboard.press('End')
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Frais')
  await page.keyboard.press('Home'); assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Organisation')
  const title = 'Brouillon conservé entre les onglets'
  await page.type('input[name="title"]', title)
  await click('Idées et cadeaux'); await click('Organisation')
  assert.equal(await page.$eval('input[name="title"]', input => input.value), title)
  await click('Choisir un modèle de tâches'); await click('Interrompre le modèle'); await click('Ajouter ces tâches'); await ready('Ajout interrompu')
  await click('Compléter ce modèle'); await ready('Les tâches du modèle ont été ajoutées')
  assert.equal(await page.evaluate(() => window.fixturePreparation.tasks.length), 4)
  const ids = await page.evaluate(() => window.fixtureCalls.filter(c => c.name === 'ajouter_tache_lot04' && c.args.p_titre === 'Préparer une carte ou un message').map(c => c.args.p_id))
  assert.equal(ids.length, 2); assert.equal(ids[0], ids[1])
  await click('Idées et cadeaux'); await click('Voir toutes les inspirations (6)'); await click('Ajouter une idée')
  await page.type('input[name="link"]', 'https://example.invalid/livre'); await click('Refuser la sauvegarde'); await page.$eval('input[name="link"]', input => input.closest('form').requestSubmit()); await ready('Sauvegarde fictive refusée')
  assert.equal(await page.$eval('input[name="link"]', input => input.value), 'https://example.invalid/livre')
  await click('Frais'); await click('Mon budget facultatif'); await ready('18,00 EUR')
  assert.equal(await page.evaluate(() => document.querySelector('[role="tabpanel"]:not([hidden])').textContent.includes('36,00 EUR')), false)
  await click('Idées et cadeaux'); assert.equal(await page.$eval('input[name="link"]', input => input.value), 'https://example.invalid/livre')
  await click('Changer de compte'); await ready('Organisation personnelle')
  await click('Idées et cadeaux'); assert.equal(await page.$('input[name="link"]'), null)
  await click('Liste / préparation'); await ready('Mes célébrations'); await click('Mes préparations personnelles existantes'); await click('Historique'); await ready('Repas passé')
  await click('À venir', 'details[open] section'); await click('Organiser une célébration', 'details[open] section'); await page.waitForSelector('dialog[open]')
  assert.ok(await page.$('dialog[open] a[href*="/dashboard/preparer/"]'))
  await page.keyboard.press('Escape'); await click('Hors ligne'); await ready('Hors ligne')
  assert.equal(await page.evaluate(() => localStorage.length), 0)
  assert.deepEqual(errors, [])
  console.log('Réussi : 320/390/1440, deux thèmes, trois onglets, clavier, saisies, modèle/reprise, panne, frais, compte, historique, hors ligne. Données fictives uniquement.')
} catch (error) { await page.screenshot({ path: path.join(dir, 'failure.png'), fullPage: true }); console.error(await page.evaluate(() => [...document.querySelectorAll('[role="alert"]')].map(n => n.textContent))); throw error } finally { await browser.close() }
