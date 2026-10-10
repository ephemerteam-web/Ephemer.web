// Après node tests/profile-preview.mjs ; Edge local, aucune session Supabase réelle.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),puppeteer=require('C:/Users/alex0/AppData/Local/npm-cache/_npx/63ac0272e74a711a/node_modules/puppeteer-core')
const browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,protocolTimeout:30000,args:['--no-first-run','--disable-gpu']}),page=await browser.newPage(),errors=[],dir=path.resolve('out/profile-preview')
page.on('pageerror',e=>errors.push(e.message))
// Chaque nouveau format recharge volontairement le brouillon fictif ; accepter son garde natif.
page.on('dialog',dialog=>{void (dialog.type()==='beforeunload'?dialog.accept():dialog.dismiss())})
const click=async text=>{const node=await page.evaluateHandle(text=>[...document.querySelectorAll('button,a')].find(n=>n.textContent.trim()===text),text);assert.ok(node.asElement(),'Commande absente : '+text);await node.asElement().click();await node.dispose()}
const ready=async text=>page.waitForFunction(text=>document.body.textContent.includes(text),{},text)
const label=async(text,checked)=>{console.log('Critère : '+text+' = '+checked);await page.evaluate((text,checked)=>{const label=[...document.querySelectorAll('label')].find(l=>l.textContent.trim()===text),input=[...document.querySelectorAll('input[type="checkbox"]')].find(n=>n.getAttribute('aria-label')===text)??label?.querySelector('input[type="checkbox"]');if(!input||input.disabled)throw new Error('Critère indisponible : '+text);if(input.checked!==checked)input.click()},text,checked)}
try{
 for(const width of [320,390,1440]){
  console.log('Largeur : '+width);await page.setViewport({width,height:width===1440?1000:844});await page.goto('http://127.0.0.1:3218');await page.waitForSelector('input[autocomplete="given-name"]')
  assert.equal(await page.$eval('input[autocomplete="given-name"]',n=>n.value),'Camille');assert.equal(await page.$eval('input[type="email"]',n=>n.disabled),true)
  assert.equal(await page.$eval('input[aria-label="Année de naissance (facultative)"]',n=>n.value),'')
  for(const theme of ['dark','light']){
   if(theme==='light')await click('Thème')
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Débordement horizontal '+width)
   await page.screenshot({path:path.join(dir,'profile-'+theme+'-'+width+'.png'),fullPage:true})
  }
  await label('Partager mes informations avec mes étoiles',true);await label('Nom de famille',true);await label('Mes passions',true)
  assert.ok(await page.evaluate(()=>[...document.querySelectorAll('aside p')].some(n=>n.textContent.includes('Martin'))))
  await label('Autoriser : Passions',true)
  await label('Partager mes informations avec mes étoiles',false);await label('Partager mes informations avec mes étoiles',true)
  assert.equal(await page.$eval('input[aria-label="Autoriser : Passions"]',n=>n.checked),false)
 }
 await click('Simuler une panne');await click('Enregistrer mes informations et mon partage');await ready('Panne fictive')
 await click('Enregistrer mes informations et mon partage');await ready('Ton profil et tes choix de partage sont enregistrés.')
 assert.equal(await page.evaluate(()=>window.fixtureCalls[0].operation===window.fixtureCalls[1].operation),true)
 await page.$eval('input[autocomplete="family-name"]',n=>{n.focus();n.select()});await page.type('input[autocomplete="family-name"]','Nouveau')
 await click('Simuler une réponse perdue');await click('Enregistrer mes informations et mon partage');await ready('Ton profil et tes choix de partage sont enregistrés.')
 await page.$eval('input[autocomplete="family-name"]',n=>{n.focus();n.select()});await page.type('input[autocomplete="family-name"]','Brouillon');await page.evaluate(()=>window.remoteChange());await ready('Ton profil a changé ailleurs')
 assert.equal(await page.$eval('button[type="submit"]',n=>n.disabled),true);assert.equal(await page.$eval('input[autocomplete="family-name"]',n=>n.value),'Brouillon')
 await click('Hors ligne');await ready('Hors ligne : tes modifications');assert.equal(await page.$eval('button[type="submit"]',n=>n.disabled),true)
 await click('Hors ligne');await click('Changer de compte');await page.waitForFunction(()=>document.querySelector('input[autocomplete="given-name"]')?.value==='Compte B')
 assert.equal(await page.$eval('input[autocomplete="family-name"]',n=>n.value),'')
 await click('Partager en image');await ready('Champs à inclure');assert.ok(await page.evaluate(()=>[...document.querySelectorAll('[role="dialog"] label')].filter(n=>/Email|Téléphone|Année|Nom de famille/.test(n.textContent)).every(n=>!n.querySelector('input').checked)));await click('Fermer')
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'browser-results.json'),JSON.stringify({widths:[320,390,1440],themes:['dark','light'],sharing:true,retry:true,lostResponse:true,conflict:true,accountChange:true,errors},null,2));console.log('Recette Mon profil réussie : 320/390/1440 px, thèmes clair/sombre, partage, réseau, conflit et changement de compte.')
}catch(error){fs.writeFileSync(path.join(dir,'browser-failure.json'),JSON.stringify({text:await page.evaluate(()=>document.body.innerText),errors},null,2));await page.screenshot({path:path.join(dir,'browser-failure.png'),fullPage:true});throw error}finally{await browser.close()}
