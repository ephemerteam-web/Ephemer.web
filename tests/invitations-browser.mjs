// À lancer après node tests/invitations-preview.mjs. Chromium en local, aucune donnée réelle.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const puppeteer=require('C:/Users/alex0/AppData/Local/npm-cache/_npx/63ac0272e74a711a/node_modules/puppeteer-core')
const dir=path.resolve('out/invitations-preview'),browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--no-first-run','--disable-gpu']})
const page=await browser.newPage(),errors=[],requests=[]
await page.setRequestInterception(true)
page.on('request',request=>new URL(request.url()).hostname==='127.0.0.1'?request.continue():request.abort())
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
 // Les deux décisions sont testées dans chaque format et thème, avec le vrai formulaire.
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}])
 for(const width of [320,390,1440])for(const theme of ['dark','light'])for(const keep of [true,false]){
  await page.setViewport({width,height:width===1440?1000:844})
  await page.goto('http://127.0.0.1:3219/invitation');await page.waitForSelector('#inv-field-0')
  await page.evaluate(()=>{
   localStorage.clear();sessionStorage.removeItem('fixture-recoveries')
   localStorage.setItem('invitation-fixture',JSON.stringify({version:1,modifiedAt:Date.now(),data:{prenom:'Camille',nom:'Martin',jour:'29',mois:'2',annee:'',relation:'ami',interets:['Romans'],noteLibre:'Mes envies',email:'',indicatif:'+33',tel:'612345678',conserver:false}}))
  })
  await page.reload();await page.waitForSelector('#inv-field-0');await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme)
  await click('Continuer');await click('Continuer');await click('Continuer');await ready('Et pour ton futur compte')
  assert.ok(await page.$$eval('input[name="inv-conservation"]',nodes=>nodes.length===2&&nodes.every(n=>!n.checked)))
  assert.equal(await page.$$eval('a[href="/inscription"]',nodes=>nodes.length),0)
  await click('Envoyer mes informations');await ready('Choisis l’une des deux options')
  assert.equal(await page.evaluate(()=>window.fixtureCalls.length),0)
  assert.equal(await page.evaluate(()=>document.activeElement?.value),'oui')
  await page.focus('input[value="'+(keep?'oui':'non')+'"]');await page.keyboard.press('Space')
  if(keep){
   await click('Envoyer mes informations');await ready('Renseigne ton e-mail')
   assert.equal(await page.evaluate(()=>document.activeElement?.id),'inv-field-4')
   await page.type('#inv-field-4','invalide');await click('Envoyer mes informations');await ready('Vérifie ton adresse e-mail')
   assert.equal(await page.evaluate(()=>window.fixtureCalls.length),0)
   await page.focus('#inv-field-4');await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.type('#inv-field-4','camille@example.invalid')
  }
  await overflow();await page.screenshot({path:path.join(dir,'choice-'+(keep?'keep':'host')+'-'+theme+'-'+width+'.png'),fullPage:true})
  await click('Envoyer mes informations');await ready('Tes informations ont été envoyées')
  const sent=await page.evaluate(()=>window.fixtureCalls[0]);assert.equal(sent.args.p_donnees.conserver,keep)
  assert.equal('choixConservationConfirme' in sent.args.p_donnees,false)
  assert.equal(await page.$eval('[role="progressbar"]',node=>node.getAttribute('aria-valuenow')),'80')
  assert.ok(await page.evaluate(()=>document.body.textContent.includes('Créer un compte est facultatif')))
  assert.match(await page.$eval('a[href="/inscription"]',node=>node.textContent.trim()),/^Rejoindre l['’]aventure$/)
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('[aria-hidden="true"]')).animationName),'none')
  assert.equal(await page.evaluate(()=>localStorage.getItem('invitation-fixture')),null)
  await overflow();await page.screenshot({path:path.join(dir,'confirmation-'+(keep?'keep':'host')+'-'+theme+'-'+width+'.png'),fullPage:true})
  if(keep){
   assert.ok(await page.evaluate(()=>document.body.textContent.includes('n’auras qu’à les relire et les valider')))
   // La reprise fictive vient du payload envoyé, puis le compte fictif est authentifié à l'ouverture.
   await page.goto('http://127.0.0.1:3219/profile');await ready('Tes informations sont déjà là')
   assert.equal(await page.$eval('input[autocomplete="given-name"]',node=>node.value),'Camille')
   await click('Continuer');await ready('Qu’est-ce qui te fait plaisir')
   assert.ok(await page.$eval('button[aria-pressed="true"]',node=>node.textContent.includes('Romans')))
   assert.equal(await page.$eval('textarea',node=>node.value),'Mes envies')
  }else{
   assert.ok(await page.evaluate(()=>document.body.textContent.includes('ton profil sera à compléter')))
   await click('Terminer ici');await ready('Tu peux fermer cette page')
   assert.equal(await page.$$eval('a[href="/inscription"],[role="progressbar"]',nodes=>nodes.length),0)
   assert.equal(await page.evaluate(()=>window.fixtureCalls.length),1)
  }
 }
 await page.evaluate(()=>{localStorage.clear();sessionStorage.removeItem('fixture-recoveries')})
 await page.setViewport({width:390,height:844})
 await page.goto('http://127.0.0.1:3219/invitation');await page.waitForSelector('#inv-field-0')
 await page.type('#inv-field-0','Camille');await page.type('#inv-field-1','Martin')
 const birthdayIds=await page.$$eval('input[inputmode="numeric"]',nodes=>nodes.map(n=>n.id))
 await page.type('#'+birthdayIds[0],'29');await page.type('#'+birthdayIds[1],'2')
 await click('Continuer');await click('Ami·e');await click('Continuer');await click('Continuer')
 await ready('Conserver mes informations pour mon futur compte')
 await page.type('input[type="email"]','camille@example.invalid');await page.click('input[name="inv-conservation"][value="oui"]')
 await click('Simuler une panne');await click('Envoyer mes informations');await ready('Panne simulée')
 const first=await page.evaluate(()=>window.fixtureCalls[0]);assert.equal(first.args.p_donnees.anniversaire.year,null)
 await page.reload();await page.waitForSelector('#inv-field-0');assert.equal(await page.$eval('#inv-field-0',n=>n.value),'Camille')
 await click('Continuer');await click('Continuer');await click('Continuer')
 assert.equal(await page.$eval('input[name="inv-conservation"][value="oui"]',n=>n.checked),true)
 await click('Envoyer mes informations');await ready('Tes informations ont été envoyées')
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
 fs.writeFileSync(path.join(dir,'browser-results.json'),JSON.stringify({widths:[320,390,1440],themes:['dark','light'],explicitRecoveryChoice:true,successProgress:80,bothOutcomes:true,keyboard:true,reducedMotion:true,publicRetry:true,profileFromSubmittedRecovery:true,starManualAfterLogin:true,errors},null,2))
 console.log('Recette navigateur réussie : 320, 390, 1440 px ; deux thèmes ; choix explicite, reprise du payload, progression, clavier, réduction des animations et réessai.')
}catch(error){
 fs.writeFileSync(path.join(dir,'browser-failure.json'),JSON.stringify({url:page.url(),text:await page.evaluate(()=>document.body.innerText),errors,storageKeys:await page.evaluate(()=>Object.keys(sessionStorage))},null,2))
 await page.screenshot({path:path.join(dir,'browser-failure.png'),fullPage:true});throw error
}finally{await browser.close()}
