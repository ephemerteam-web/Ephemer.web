// Navigateur réel, données et droits fictifs ; PNG produit par html-to-image réel.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),puppeteer=require('C:/Users/alex0/AppData/Local/npm-cache/_npx/63ac0272e74a711a/node_modules/puppeteer-core')
const dir=path.resolve('out/collective-cards'),downloads=path.join(dir,'downloads');fs.mkdirSync(downloads,{recursive:true})
const browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--no-first-run','--disable-gpu']}),page=await browser.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>void d.accept())
const client=await page.createCDPSession();await client.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:downloads})
const click=async text=>{const handle=await page.evaluateHandle(text=>[...document.querySelectorAll('button,a,summary')].find(n=>n.textContent.trim()===text&&n.checkVisibility()),text);assert.ok(handle.asElement(),'Commande absente : '+text);await handle.asElement().click();await handle.dispose()}
const ready=text=>page.waitForFunction(text=>document.body.textContent.includes(text),{},text)
async function publish(){await page.type('textarea','Avec toute notre affection.');await page.type('input:not([type])','Alice');await click('Choisir mon avatar enregistré');await click('Prévisualiser ma contribution');await page.click('input[type="checkbox"]');await click('Confirmer ma contribution');await ready('Action enregistrée.');await click('Fermer les contributions');await ready('Contributions fermées');await click('Valider cet aperçu final');await ready('Version validée');await click('Publier maintenant · lien valable 30 jours');await ready('Partager la carte en image')}
try{
 for(const width of [320,390,1440]){
  await page.setViewport({width,height:width===1440?1000:844});await page.goto('http://127.0.0.1:3224');await ready('Carte collective')
  for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:path.join(dir,`${width}-${theme}-contributions.png`),fullPage:true})}
  assert.equal(await page.evaluate(()=>[...document.querySelectorAll('button')].some(n=>n.textContent==='Partager la carte en image')),false)
  await publish();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true)
  await click('Voir le destinataire');assert.equal(await page.evaluate(()=>!!document.querySelector('textarea')),false)
  for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await click('Partager la carte en image');await page.waitForSelector('dialog[open]');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:path.join(dir,`${width}-${theme}-image.png`),fullPage:true});await click('Fermer')}
 }
 // Menu natif absent : vrais fichiers PNG puis téléchargement explicite.
 await click('Partager la carte en image');await click('Préparer l’image');await ready('PNG prêt');await page.waitForSelector('dialog img[src^="blob:"]')
 const dimensions=await page.$eval('dialog img',n=>({width:n.naturalWidth,height:n.naturalHeight}));assert.equal(dimensions.width,1280);assert.ok(dimensions.height<=4096)
 await page.screenshot({path:path.join(dir,'png-prepare.png'),fullPage:true});await click('Télécharger le PNG')
 for(let i=0;i<30&&!fs.existsSync(path.join(downloads,'ephemer.png'));i++)await new Promise(resolve=>setTimeout(resolve,100))
 const png=fs.readFileSync(path.join(downloads,'ephemer.png'));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1280)
 // Échec de réseau invalide les fichiers et ferme la fenêtre.
 await page.evaluate(()=>{window.fixtureOnline=false;window.dispatchEvent(new Event('offline'))});await page.waitForFunction(()=>!document.querySelector('dialog[open]'));await click('Hors ligne')
 // API native simulée : le dernier clic reçoit les fichiers déjà préparés.
 await page.evaluate(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:({files})=>files?.every(file=>file instanceof File)});Object.defineProperty(navigator,'share',{configurable:true,value:async({files})=>{window.fixtureShares++;window.sharedFiles=files.map(file=>({size:file.size,type:file.type}))}})})
 await click('Partager la carte en image');await click('Préparer l’image');await ready('PNG prêt');await click('Partager…');assert.equal(await page.evaluate(()=>window.fixtureShares),1);assert.equal(await page.evaluate(()=>window.sharedFiles[0].type),'image/png');await click('Fermer')
 // Carte longue : toutes les pages sont réelles, ordonnées et bornées.
 await click('Carte longue');await click('Partager la carte en image');await click('Préparer l’image');await ready('images, dans l’ordre.');const sizes=await page.$$eval('dialog img',images=>images.map(n=>({width:n.naturalWidth,height:n.naturalHeight})));assert.ok(sizes.length>1&&sizes.length<=20);assert.ok(sizes.every(n=>n.width===1280&&n.height<=4096));await click('Fermer')
 // Un droit refusé avant génération ne laisse pas de fichiers prêts.
 await click('Partager la carte en image');await page.evaluate(()=>window.fixtureRevoked=true);await click('Préparer l’image');await ready('Cette carte est indisponible.');assert.equal(await page.$('dialog img'),null);await click('Fermer')
 await click('Révoquer');await ready('Cette carte est indisponible.');assert.equal(await page.$('dialog[open]'),null)
 // Saisie conservée après réponse perdue ; même opération au réessai.
 await page.goto('http://127.0.0.1:3224');await ready('Carte collective');await page.type('textarea','Saisie gardée');await click('Choisir sans avatar');await click('Prévisualiser ma contribution');await page.click('input[type="checkbox"]');await click('Réponse perdue');await click('Confirmer ma contribution');await ready('Réponse fictive perdue');assert.equal(await page.$eval('textarea',n=>n.value),'Saisie gardée');await click('Confirmer ma contribution');await ready('Action enregistrée.');assert.equal(await page.evaluate(()=>{const commands=window.fixtureCommands.filter(c=>c.data.action==='confirmer');return commands[0].operation===commands[1].operation}),true)
 await page.focus('textarea');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.tagName),'INPUT');await click('Changer de compte');assert.notEqual(await page.$eval('textarea',n=>n.value),'Saisie gardée')
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true)
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'ok',viewports:[320,390,1440],themes:['light','dark'],png:dimensions,longCardPages:sizes.length,keyboard:true,network:true,accountChange:true,provider:'aucun, données fictives'}))
}finally{await browser.close()}
