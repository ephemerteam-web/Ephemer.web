// À lancer après node tests/invitations-preview.mjs. Chromium en local, aucune donnée réelle.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const puppeteer=require('C:/Users/alex0/AppData/Local/npm-cache/_npx/63ac0272e74a711a/node_modules/puppeteer-core')
const dir=path.resolve('out/invitations-preview'),browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--no-first-run','--disable-gpu']})
const page=await browser.newPage(),errors=[],requests=[]
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push({url:r.url(),referer:r.headers().referer??''}))
const click=async text=>{const node=await page.evaluateHandle(text=>[...document.querySelectorAll('button,a')].find(n=>n.textContent.trim().includes(text)),text);assert.ok(node.asElement(),'Commande absente : '+text);await node.asElement().click();await node.dispose()}
const ready=async text=>page.waitForFunction(text=>document.body?.textContent?.includes(text),{},text)
const overflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Débordement horizontal')
try {
 for(const width of [320,390,1440]){
  await page.setViewport({width,height:width===1440?1000:844})
  await page.goto('http://127.0.0.1:3219/profile?next=%2Fetoile');await ready('Comment t’appelles-tu')
  assert.equal(await page.$eval('input[autocomplete="given-name"]',n=>n.value),'Camille')
  await overflow();await page.screenshot({path:path.join(dir,'profile-identity-'+width+'.png'),fullPage:true})
  await click('Continuer');await ready('Qu’est-ce qui te fait plaisir')
  assert.ok(await page.$eval('button[aria-pressed="true"]',n=>n.textContent.includes('Romans')))
  await click('Thème');await overflow();await page.screenshot({path:path.join(dir,'profile-interests-light-'+width+'.png'),fullPage:true})
  await click('Continuer');await ready('Tout est prêt');await overflow();await page.screenshot({path:path.join(dir,'profile-summary-'+width+'.png'),fullPage:true})
  assert.ok(await page.evaluate(()=>document.body.textContent.includes('29/2 · année privée')))
  await page.goto('http://127.0.0.1:3219/conflict');await ready('Note privée de mon carnet');await overflow()
  assert.ok(await page.$$eval('input[type="checkbox"]',nodes=>nodes.length>=2&&nodes.every(n=>!n.checked)))
  await page.screenshot({path:path.join(dir,'conflict-'+width+'.png'),fullPage:true})
 }
 await page.setViewport({width:390,height:844})
 await page.goto('http://127.0.0.1:3219/invitation');await page.waitForSelector('#inv-field-0')
 await page.type('#inv-field-0','Camille');await page.type('#inv-field-1','Martin')
 const birthdayIds=await page.$$eval('input[inputmode="numeric"]',nodes=>nodes.map(n=>n.id))
 await page.type('#'+birthdayIds[0],'29');await page.type('#'+birthdayIds[1],'2')
 await click('Continuer');await click('Ami·e');await click('Continuer');await click('Continuer')
 await ready('Retrouver ces informations')
 await page.type('input[type="email"]','camille@example.invalid');await page.click('input[type="checkbox"]')
 await click('Simuler une panne');await click('Envoyer mes informations');await ready('Panne simulée')
 const first=await page.evaluate(()=>window.fixtureCalls[0]);assert.equal(first.args.p_donnees.anniversaire.year,null)
 await page.reload();await page.waitForSelector('#inv-field-0');assert.equal(await page.$eval('#inv-field-0',n=>n.value),'Camille')
 await click('Continuer');await click('Continuer');await click('Continuer')
 assert.equal(await page.$eval('input[type="checkbox"]',n=>n.checked),true)
 await click('Envoyer mes informations');await ready("C'est noté")
 const second=await page.evaluate(()=>window.fixtureCalls[0]);assert.equal(first.args.p_operation,second.args.p_operation)
 await page.evaluate(()=>{sessionStorage.clear();localStorage.clear()})
 const token='a'.repeat(42)+'A'
 await page.goto('http://127.0.0.1:3219/etoile#'+token);await ready('Se connecter')
 assert.equal(new URL(page.url()).hash,'')
 assert.equal(await page.evaluate(()=>window.fixtureCalls.length),0)
 await click('Se connecter');await page.waitForSelector('input[type="email"]');assert.equal(new URL(page.url()).search,'?next=%2Fetoile')
 await page.type('input[type="email"]','camille@example.invalid');await page.type('input[type="password"]','fixture-password');await Promise.all([page.waitForNavigation(),click('Se connecter')])
 await ready('Demander à devenir une étoile');assert.equal(await page.evaluate(()=>window.fixtureCalls.length),0)
 await page.screenshot({path:path.join(dir,'star-after-login-390.png'),fullPage:true})
 await click('Demander à devenir une étoile');await ready('Demande déjà envoyée')
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('ephemer-etoile-entree-v1')),null)
 assert.equal(await page.evaluate(()=>window.fixtureCalls.length),1)
 // Le protocole de débogage peut inclure le fragment ; le chemin HTTP et le referrer l'excluent.
 assert.ok(requests.every(r=>!(new URL(r.url).pathname+new URL(r.url).search+r.referer).includes(token)),'Secret présent dans une requête HTTP')
 assert.deepEqual(errors,[])
 fs.writeFileSync(path.join(dir,'browser-results.json'),JSON.stringify({widths:[320,390,1440],themes:['dark','light'],publicRetry:true,starManualAfterLogin:true,errors},null,2))
 console.log('Recette navigateur réussie : 320, 390, 1440 px ; thèmes clair/sombre ; reprise réseau et étoile après connexion.')
}catch(error){
 fs.writeFileSync(path.join(dir,'browser-failure.json'),JSON.stringify({url:page.url(),text:await page.evaluate(()=>document.body.innerText),errors,storageKeys:await page.evaluate(()=>Object.keys(sessionStorage))},null,2))
 await page.screenshot({path:path.join(dir,'browser-failure.png'),fullPage:true});throw error
}finally{await browser.close()}
