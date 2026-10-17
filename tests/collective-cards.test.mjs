// Comportements purs et transports SIMULÉS. Aucune preuve d'installation/RLS/concurrence PostgreSQL.
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { loadPure, p2Helpers } from './p2-helpers.mjs'
import { harness } from './ui-harness.mjs'

const cards = loadPure('lib/cards.ts','CARD_EXPIRY_DAYS,CARD_TEMPLATES,isCardTemplate,cardSnapshot')
const avatars = harness('lib/avatar-render-config.ts').component
const collective = loadPure('lib/collective-card.ts','COLLECTIVE_CARDS_ENABLED,COLLECTIVE_CARD_LIMIT,COLLECTIVE_MESSAGE_LIMIT,COLLECTIVE_SIGNATURE_LIMIT,closedCollectiveObject,collectiveText,collectiveSignature,collectiveCardSnapshot,collectiveImageSnapshot',{...cards,...avatars})
const schedule = loadPure('lib/collective-card-schedule.ts','COLLECTIVE_LATE_MS,civilScheduleCandidates,resolveCivilSchedule,validateCivilSchedule,nextCollectivePassage,collectiveDue',{...p2Helpers,Intl})
const contract = loadPure('lib/celebration-contract.ts','celebrationUuid',p2Helpers)
const flow = loadPure('lib/collective-card-workflow.ts','collectiveCommand,collectiveEmail,createCollectiveState,applyCollectiveCommand,reconcileCollectiveState,collectiveAllowed,exportCollectiveOwn,collectivePublicationDue',{...cards,...collective,...schedule,...contract,structuredClone})
const delivery = loadPure('lib/collective-card-delivery.ts','processCollectiveEmail,COLLECTIVE_EMAIL_LABELS',schedule)
const uuid = n => '71000000-0000-4000-8000-' + String(n).padStart(12,'0')
const A=uuid(1),B=uuid(2),C=uuid(3),R=uuid(4),PA=uuid(11),PB=uuid(12),PC=uuid(13)
const actor = account => ({account,verified:true,verifiedEmail:account===R?'recipient@example.invalid':account===A?'a@example.invalid':'b@example.invalid'})
const environment = overrides => ({now:Date.parse('2026-10-17T06:00:00Z'),members:[{participation:PA,account:A,generation:1,role:'organisateur'},{participation:PB,account:B,generation:1,role:'participant'},{participation:PC,account:C,generation:1,role:'participant'}],celebrationState:'active',recipientAccount:R,digest:v=>createHash('sha256').update(v).digest('hex'),...overrides})
const content = message => ({message,signature:'Avec affection',avatar:null})
const snapshot = (overrides={}) => ({format:3,renderVersion:3,templateVersion:1,templateId:'clair_de_lune',title:'Pour toi',contributions:[content('Un beau moment')],...overrides})
function fixture(){let state=flow.createCollectiveState(uuid(90),actor(A),environment(),'Pour toi','clair_de_lune','recipient@example.invalid'),sequence=100;return {get state(){return state},set state(v){state=v},run(data,account=A,env=environment()){state=flow.applyCollectiveCommand(state,actor(account),{operation:uuid(++sequence),revision:state.revision,data},env);return state}}}
function validated(){const f=fixture();f.run({action:'inviter',participation:PA});f.run({action:'confirmer',content:content('De Alice'),consent:true});f.run({action:'inviter',participation:PB});f.run({action:'confirmer',content:content('De Bruno'),consent:true},B);f.run({action:'fermer',confirmMissing:false});f.run({action:'valider'});return f}

test('collectif : contrat fermé, Unicode, absence de données privées et branchement soumis au verrou SQL',()=>{
 assert.equal(collective.COLLECTIVE_CARDS_ENABLED,true)
 const value=snapshot({contributions:[content('🌙'.repeat(2000))]});assert.equal(collective.collectiveCardSnapshot(value).contributions.length,1)
 for(const entry of [snapshot({secret:'interdit'}),snapshot({contributions:[]}),snapshot({contributions:Array(31).fill(content('Bonjour'))}),snapshot({format:4}),snapshot({contributions:[{...content('Bonjour'),author:A}]}),snapshot({contributions:[content('🌙'.repeat(2001))]}),snapshot({contributions:[content(' ')]}),snapshot({contributions:[{...content('Bonjour'),avatar:{html:'<svg>'}}]})])assert.throws(()=>collective.collectiveCardSnapshot(entry))
})
test('collectif : rendu réel hostile échappé, sans lien exécutable et sans profil courant',()=>{
 const renderer=harness('components/cards/CardRendererV3.tsx').component.default
 for(const templateId of ['clair_de_lune','constellation','aurore']){
  const html=renderToStaticMarkup(React.createElement(renderer,{snapshot:snapshot({templateId,contributions:[content('<script>attaque</script> javascript:alert(1)')]})}))
  assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|href=|recipient@example|71000000/);assert.match(html,/data-card-render-version="3"/)
 }
})
test('collectif : copie publiée et projection image ne modifient jamais la source',()=>{
 const source=snapshot(),frozen=collective.collectiveCardSnapshot(source);source.contributions[0].message='Autre texte'
 assert.equal(frozen.contributions[0].message,'Un beau moment')
 const image=collective.collectiveImageSnapshot(frozen,false,false);assert.equal(image.contributions[0].signature,'');assert.equal(frozen.contributions[0].signature,'Avec affection')
 const avatar=structuredClone(harness('lib/avatars.ts').component.DEFAULT_AVATAR_V1),published=collective.collectiveCardSnapshot(snapshot({contributions:[{...content('Avatar figé'),avatar}]})),hair=published.contributions[0].avatar.hairId
 avatar.hairId='long';assert.equal(published.contributions[0].avatar.hairId,hair);assert.equal(collective.collectiveImageSnapshot(published,true,false).contributions[0].avatar,null);assert.equal(published.contributions[0].avatar.hairId,hair)
})
test('horaires : heure inexistante, heure ambiguë et aller-retour UTC contrôlé',()=>{
 assert.throws(()=>schedule.resolveCivilSchedule('2026-03-29','02:30'),/existe pas/)
 assert.throws(()=>schedule.resolveCivilSchedule('2026-10-25','02:30'),/deux fois/)
 assert.equal(schedule.resolveCivilSchedule('2026-10-25','02:30','Europe/Paris','premiere').instant,'2026-10-25T00:30:00.000Z')
 assert.equal(schedule.resolveCivilSchedule('2026-10-25','02:30','Europe/Paris','seconde').instant,'2026-10-25T01:30:00.000Z')
 assert.throws(()=>schedule.resolveCivilSchedule('2026-10-17','10:00','Europe/Paris','seconde'))
 assert.throws(()=>schedule.resolveCivilSchedule('2026-02-30','10:00'));assert.throws(()=>schedule.resolveCivilSchedule('2026-10-17','10:00','Inconnu/Fuseau'))
 const value=schedule.resolveCivilSchedule('2026-10-17','10:00');assert.throws(()=>schedule.validateCivilSchedule({...value,instant:'2026-10-17T10:00:00Z'}))
})
test('horaires : décalage de 30 minutes et changement de date sans décalage silencieux',()=>{
 assert.equal(schedule.civilScheduleCandidates('2026-04-05','01:45','Australia/Lord_Howe').length,2)
 assert.equal(schedule.civilScheduleCandidates('2011-12-30','12:00','Pacific/Apia').length,0)
})
test('planificateur : passage quotidien, jamais avant demande, limite exacte de 48 h',()=>{
 const now=Date.parse('2026-10-17T06:00Z')
 assert.equal(schedule.nextCollectivePassage('2026-10-17T07:01Z',now),'2026-10-18T07:00:00.000Z')
 assert.equal(schedule.nextCollectivePassage('2026-10-17T07:00Z',now),'2026-10-17T07:00:00.000Z')
 assert.equal(schedule.collectiveDue('2026-10-17T07:00Z',now),'attente')
 assert.equal(schedule.collectiveDue('2026-10-15T06:00Z',now),'due')
 assert.equal(schedule.collectiveDue('2026-10-15T05:59Z',now),'a_reprogrammer')
})
test('participer ne signe pas : invitation distincte et confirmation explicite obligatoire',()=>{
 const f=fixture();assert.equal(f.state.contributions.length,0)
 assert.throws(()=>f.run({action:'confirmer',content:content('Bonjour'),consent:true},B))
 f.run({action:'inviter',participation:PB});assert.equal(f.state.contributions.length,0)
 assert.throws(()=>f.run({action:'confirmer',content:content('Bonjour'),consent:false},B))
 f.run({action:'confirmer',content:content('De Bruno'),consent:true},B);assert.equal(f.state.contributions[0].author,B)
})
test('droits simulés : invité en attente, ex-membre, non-membre, destinataire et session non vérifiée refusés',()=>{
 const f=validated()
 for(const account of [uuid(800),R])assert.throws(()=>flow.collectiveAllowed(f.state,actor(account),environment()))
 assert.throws(()=>flow.collectiveAllowed(f.state,{...actor(A),verified:false},environment()))
 assert.throws(()=>flow.collectiveAllowed(f.state,actor(B),environment({members:environment().members.filter(row=>row.account!==B)})))
 const recipientMember=environment({members:[...environment().members,{participation:uuid(14),account:R,generation:1,role:'organisateur'}]})
 assert.throws(()=>flow.collectiveAllowed(f.state,actor(R),recipientMember))
 assert.throws(()=>flow.collectiveAllowed(f.state,actor(A),environment({recipientAccount:A})))
})
test('destinataire sans compte : email Auth vérifié exclu puis interdiction conservée après changement',()=>{
 const f=validated(),recipient=uuid(8),env=environment({recipientAccount:null,members:[...environment().members,{participation:uuid(18),account:recipient,generation:1,role:'participant'}]})
 assert.throws(()=>flow.collectiveAllowed(f.state,{account:recipient,verified:true,verifiedEmail:'recipient@example.invalid'},env))
 const bound=flow.reconcileCollectiveState(f.state,env,[recipient])
 assert.throws(()=>flow.collectiveAllowed(bound,{account:recipient,verified:true,verifiedEmail:'changed@example.invalid'},env))
})
test('auteur seul édite ; modération sans changement du texte, de la signature ou de l’avatar',()=>{
 const f=validated();assert.throws(()=>f.run({action:'retirer',author:A},B))
 const original=JSON.stringify(f.state.contributions.find(row=>row.author===B).content)
 f.run({action:'masquer',author:B});assert.equal(JSON.stringify(f.state.contributions.find(row=>row.author===B).content),original);assert.equal(f.state.validation,null)
 f.run({action:'retablir',author:B});assert.equal(JSON.stringify(f.state.contributions.find(row=>row.author===B).content),original)
 const bad={operation:uuid(900),revision:f.state.revision,data:{action:'confirmer',content:content('Usurpé'),consent:true,author:A}}
 assert.throws(()=>flow.applyCollectiveCommand(f.state,actor(B),bad,environment()))
})
test('fermeture : signature manquante confirmée, conflit sur révision et édition concurrente refusée',()=>{
 const f=fixture();f.run({action:'inviter',participation:PB});assert.throws(()=>f.run({action:'fermer',confirmMissing:false}))
 const before=f.state.revision;f.run({action:'fermer',confirmMissing:true})
 assert.throws(()=>f.run({action:'confirmer',content:content('Trop tard'),consent:true},B))
 assert.throws(()=>flow.applyCollectiveCommand(f.state,actor(A),{operation:uuid(999),revision:before,data:{action:'rouvrir'}},environment()),/changé/)
})
test('idempotence : réponse perdue rejouée sans nouvel effet ; UUID réutilisé avec autre contenu refusé',()=>{
 const f=fixture(),command={operation:uuid(501),revision:1,data:{action:'inviter',participation:PB}}
 f.state=flow.applyCollectiveCommand(f.state,actor(A),command,environment());const revision=f.state.revision
 f.state=flow.applyCollectiveCommand(f.state,actor(A),command,environment());assert.equal(f.state.revision,revision);assert.equal(f.state.invited.length,1)
 assert.throws(()=>flow.applyCollectiveCommand(f.state,actor(A),{...command,data:{action:'inviter',participation:PC}},environment()))
})
test('publication figée, retrait et départ révoquent, sans réécriture des autres sources',()=>{
 const f=validated();f.run({action:'publier',version:uuid(601),expiryDays:30});const old=JSON.stringify(f.state.versions[0].content)
 f.run({action:'rouvrir'});f.run({action:'confirmer',content:content('Nouvelle source'),consent:true},B)
 assert.equal(JSON.stringify(f.state.versions[0].content),old)
 f.run({action:'retirer',author:B},B);assert.equal(f.state.versions[0].revoked,true);assert.equal(f.state.contributions.length,1);assert.equal(f.state.contributions[0].content.message,'De Alice')
 const reconciled=flow.reconcileCollectiveState(f.state,environment({members:environment().members.filter(row=>row.account!==A)}))
 assert.equal(reconciled.contributions.length,0);assert.equal(reconciled.validation,null)
})
test('export personnel : propre contribution seulement, jamais adresse, lien ou textes tiers',()=>{
 const f=validated(),result=flow.exportCollectiveOwn(f.state,actor(B),environment())
 assert.equal(result.contributions.length,1);assert.equal(result.contributions[0].message,'De Bruno');assert.deepEqual(Object.keys(result).sort(),['contributions','id','title'])
})
test('programmation : version validée, horaires distincts, réouverture annule seulement le certain',()=>{
 const f=validated(),publication=schedule.resolveCivilSchedule('2026-10-18','10:00'),email=schedule.resolveCivilSchedule('2026-10-19','10:00')
 f.run({action:'programmer',id:uuid(701),publication,email,address:'recipient@example.invalid',consent:true})
 assert.equal(f.state.plan.publicationState,'programme');assert.equal(f.state.plan.emailState,'programme')
 f.run({action:'rouvrir'});assert.equal(f.state.plan.publicationState,'annule');assert.equal(f.state.plan.emailState,'annule');assert.equal(f.state.validation,null)
 const g=validated();g.run({action:'programmer',id:uuid(702),publication,email,address:'recipient@example.invalid',consent:true});g.state.plan.emailState='pris_en_charge'
 assert.throws(()=>g.run({action:'annuler_programmation'}),/garantir/);g.run({action:'rouvrir'});assert.equal(g.state.plan.emailState,'pris_en_charge')
})
test('programmation : refus de destination non confirmée, envoi anticipé ou publication manquante',()=>{
 const f=validated(),publication=schedule.resolveCivilSchedule('2026-10-19','10:00'),email=schedule.resolveCivilSchedule('2026-10-18','10:00')
 for(const changes of [{publication,email},{publication:null,email},{publication,email:null,address:null,consent:false},{publication,email:publication,address:'other@example.invalid'}])assert.throws(()=>f.run({action:'programmer',id:uuid(710),publication,email,address:'recipient@example.invalid',consent:true,...changes}))
})
function workerFixture({response={data:{id:'provider-fixture'}},finishLost=false}={}){
 let state='reserved',sent=0,finished=[],blocked=false
 const claim={state:'reserved',id:uuid(820),token:uuid(821),dueAt:'2026-10-17T06:00Z',payload:{from:'test',to:'recipient@example.invalid',subject:'Carte',html:'<p>Carte</p>',text:'Carte'}}
 const transport={claim:async()=>state==='reserved'?claim:{state:state==='sending'?'uncertain':state},begin:async()=>{if(blocked||state!=='reserved')return {ready:false,state:blocked?'cancelled':'busy'};state='sending';return {ready:true,state:'sending'}},stop:async()=>{state='a_reprogrammer'},send:async(payload,options)=>{sent++;assert.equal(options.idempotencyKey,'email/'+claim.id);assert.equal(payload.tags[0].value,claim.id);if(response instanceof Error)throw response;return response},finish:async(id,token,outcome,provider)=>{finished.push({outcome,provider});if(finishLost)throw new Error('Réponse DB perdue');state=outcome==='accepted'?'accepted':outcome==='retryable'?'reserved':outcome}}
 return {transport,get sent(){return sent},get finished(){return finished},block(){blocked=true}}
}
test('worker simulé : deux prises en charge, un seul appel fournisseur',async()=>{
 const f=workerFixture();const result=await Promise.all([delivery.processCollectiveEmail(f.transport,environment().now),delivery.processCollectiveEmail(f.transport,environment().now)])
 assert.equal(f.sent,1);assert.ok(result.includes('accepted'));assert.equal(f.finished[0].provider,'provider-fixture')
})
test('worker simulé : panne après acceptation ou réponse réseau perdue ne renvoie jamais aveuglément',async()=>{
 const f=workerFixture({finishLost:true});await assert.rejects(delivery.processCollectiveEmail(f.transport,environment().now),/perdue/)
 assert.equal(await delivery.processCollectiveEmail(f.transport,environment().now),'uncertain');assert.equal(f.sent,1)
 const g=workerFixture({response:new Error('réseau')});assert.equal(await delivery.processCollectiveEmail(g.transport,environment().now),'uncertain');assert.equal(await delivery.processCollectiveEmail(g.transport,environment().now),'uncertain');assert.equal(g.sent,1)
})
test('worker simulé : publication absente/révoquée, trop tôt et retard >48 h interdisent send',async()=>{
 const f=workerFixture();f.block();assert.equal(await delivery.processCollectiveEmail(f.transport,environment().now),'cancelled');assert.equal(f.sent,0)
 const g=workerFixture();assert.equal(await delivery.processCollectiveEmail(g.transport,environment().now-1),'waiting');assert.equal(g.sent,0)
 const h=workerFixture();assert.equal(await delivery.processCollectiveEmail(h.transport,environment().now+schedule.COLLECTIVE_LATE_MS+1),'a_reprogrammer');assert.equal(h.sent,0)
})
test('worker simulé : acceptation distincte de livraison, seuls refus sûrs réessayables',async()=>{
 for(const [response,expected] of [[{error:{statusCode:429}},'retryable'],[{error:{statusCode:400}},'failed'],[{error:{statusCode:500}},'uncertain'],[{data:{}},'uncertain']]){const f=workerFixture({response});assert.equal(await delivery.processCollectiveEmail(f.transport,environment().now),expected)}
 assert.notEqual(delivery.COLLECTIVE_EMAIL_LABELS.accepte,delivery.COLLECTIVE_EMAIL_LABELS.livre)
})
test('enveloppes réelles : contexte et usage authentifiés, aucune URL/adresse en clair dans le journal',()=>{
 const crypto=loadPure('lib/collective-card-crypto.ts','sealCollectiveContent,openCollectiveContent',{...contract,Buffer,createCipheriv,createDecipheriv,randomBytes})
 const context={celebration:uuid(900),card:uuid(901),version:uuid(902)},key=randomBytes(32).toString('hex'),plain='Adresse et lien privés'
 const sealed=crypto.sealCollectiveContent(plain,context,'email',key)
 assert.equal(crypto.openCollectiveContent(sealed,context,'email',key),plain);assert.equal(JSON.stringify(sealed).includes(plain),false)
 assert.throws(()=>crypto.openCollectiveContent(sealed,context,'lien',key));assert.throws(()=>crypto.openCollectiveContent(sealed,{...context,version:uuid(903)},'email',key))
 assert.throws(()=>crypto.openCollectiveContent({...sealed,tag:'0'.repeat(32)},context,'email',key))
})
test('PNG : plus de vingt pages refusées avant tout moteur ou téléchargement',async()=>{
 const images=loadPure('lib/share-image.ts','prepareImages,imagePageCuts',{document:{fonts:{ready:Promise.resolve()},createTreeWalker:()=>({nextNode:()=>false})},NodeFilter:{SHOW_TEXT:4}})
 await assert.rejects(images.prepareImages({getBoundingClientRect:()=>({top:0,height:44000}),querySelectorAll:()=>[]}),/trop long/)
})
test('PNG : fermeture ou démontage pendant la vérification interdit toute préparation tardive',async()=>{
 for(const unmount of [false,true]){
  let release,calls=0;const pending=new Promise(resolve=>{release=resolve})
  const images={defaultImageFields:()=>[],selectedImageFields:()=>[],downloadImage:()=>{throw new Error('Ne pas télécharger')},prepareImages:async()=>{calls++;return []}}
  const ui=harness('components/ShareImageButton.tsx',{extra:'\nexport {ImageShare}',overrides:{'@/lib/share-image':images},globals:{navigator:{onLine:true}}})
  const props={title:'Carte',snapshot:snapshot(),access:{key:'version',expiresAt:'2099-01-01T00:00:00Z',validate:()=>pending}}
  ui.render(props,'ImageShare');await ui.flush();ui.find(node=>node.type==='button'&&ui.text(node)==='Partager en image').props.onClick();ui.render(props,'ImageShare');await ui.flush()
  ui.find(node=>node.props.ref&&node.type==='div').props.ref.current={}
  ui.find(node=>node.type==='button'&&ui.text(node)==='Préparer l’image').props.onClick()
  if(unmount)ui.unmount();else ui.find(node=>node.type==='button'&&ui.text(node)==='Fermer').props.onClick()
  release();await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,0);if(!unmount)ui.unmount()
 }
})
test('création contrôlée : confirmation, double clic et UUID du réessai après réponse perdue',async()=>{
 let sequence=900,calls=[],fail=true,release
 const pending=new Promise(resolve=>{release=resolve})
 const ui=harness('components/celebrations/CollectiveCardPanel.tsx',{globals:{Error,crypto:{randomUUID:()=>uuid(++sequence)}}})
 const props={create:async value=>{calls.push(value);await pending;if(fail){fail=false;throw new Error('Réponse perdue')}}}
 const render=()=>ui.render(props,'CollectiveCardCreate')
 render();await ui.flush()
 ui.find(n=>n.type==='input'&&n.props.type==='email').props.onChange({target:{value:'recipient@example.invalid'}})
 render();ui.find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({stopPropagation(){},target:{checked:true}})
 render();const submit=ui.find(n=>n.type==='form').props.onSubmit;submit({preventDefault(){}});submit({preventDefault(){}});assert.equal(calls.length,1)
 release();await new Promise(resolve=>setImmediate(resolve));render();assert.match(ui.text(),/Réponse perdue/)
 ui.find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.length,2);assert.equal(calls[0].operation,calls[1].operation);assert.equal(calls[0].data.id,calls[1].data.id);ui.unmount()
})
test('PNG : expiration au-delà de la limite des timers contrôlée sans conservation tardive',async()=>{
 let now=Date.parse('2026-10-17T00:00Z'),sequence=0;const timers=new Map(),expiresAt=new Date(now+40*86400000).toISOString()
 class Clock extends Date{static now(){return now}}
 const ui=harness('components/ShareImageButton.tsx',{extra:'\nexport {ImageShare}',globals:{Date:Clock,setTimeout:(fn,ms)=>{timers.set(++sequence,{fn,ms});return sequence},clearTimeout:id=>timers.delete(id)}})
 const props={title:'Carte',snapshot:snapshot(),access:{key:'version',expiresAt,validate:async()=>{}}}
 ui.render(props,'ImageShare');await ui.flush();ui.find(n=>n.type==='button'&&ui.text(n)==='Partager en image').props.onClick();ui.render(props,'ImageShare')
 const first=timers.values().next().value;assert.equal(first.ms,2147483647);now+=2147483647;first.fn();assert.ok(timers.values().toArray().some(timer=>timer.ms<2147483647))
 const last=timers.values().toArray().at(-1);now=Date.parse(expiresAt)+1;last.fn();ui.render(props,'ImageShare');assert.equal(ui.find(n=>n.props.title==='Partager en image').props.open,false);ui.unmount()
})
