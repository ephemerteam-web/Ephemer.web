// API, worker et export réels ; Auth, base et fournisseur injectés, aucun accès distant.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto'
import { harness } from './ui-harness.mjs'
import { loadPure, p2Helpers, pageDatabase } from './p2-helpers.mjs'

const id=n=>'81000000-0000-4000-8000-'+String(n).padStart(12,'0')
const owner=id(1),celebration=id(2),card=id(3),version=id(4),plan=id(5),operation=id(6),job=id(7),token=id(8)
const key=randomBytes(32).toString('hex')
const snapshot={format:3,renderVersion:3,templateVersion:1,templateId:'clair_de_lune',title:'Publié',contributions:[{message:'Texte confirmé',signature:'Moi',avatar:null}]}
const view=()=>({id:card,revision:6,title:'Carte',templateId:'clair_de_lune',phase:'fermee',validated:true,isOrganizer:true,mine:snapshot.contributions[0],invited:true,responsible:'Responsable',responsibleParticipation:id(9),nextAction:'Partager',members:[{participation:id(9),account:owner,name:'Auteur',invited:true,signed:true,organizer:true}],contributions:[{author:owner,name:'Auteur',own:true,hidden:false,content:snapshot.contributions[0]}],published:{version,content:snapshot,expiresAt:new Date(Date.now()+86400000).toISOString()},publicationState:'Publiée',emailState:'absent',reports:[]})
const crypto=loadPure('lib/collective-card-crypto.ts','sealCollectiveContent,openCollectiveContent',{...p2Helpers,celebrationUuid:v=>v,Buffer,createCipheriv,createDecipheriv,randomBytes,process:{env:{EPHEMER_CARD_LINK_KEY:key}}})
const crypt=loadPure('lib/card-link-crypto.ts','cardSecretHash,newCardSecret,isCardSecret',{Buffer,createHash,randomBytes,createCipheriv,createDecipheriv})
const global={Request,Response,URL,Buffer,TextDecoder,process:{env:{EPHEMER_CARD_LINK_KEY:key}}}
function server({read=view,available=true,actor={id:owner,email_confirmed_at:'2026-10-17'},service=async()=>null}={}){
 const calls=[]
 const api={verify:async()=>actor,user:async(name,args)=>{calls.push({scope:'user',name,args});if(name==='collectif_disponible')return available;if(name==='lire_carte_collective')return read();if(name==='commander_carte_collective')return {ok:true};if(name==='exporter_mes_contributions_collectives')return {id:card,title:'Carte',contributions:[snapshot.contributions[0]]};throw Error(name)},service:async(name,args)=>{calls.push({scope:'service',name,args});return service(name,args)}}
 const component=harness('lib/collective-card-server.ts',{overrides:{'server-only':{},'@/lib/supabase-admin':{supabaseAdmin:{}},'@/lib/celebration-server':{celebrationTransport:()=>{},celebrationRpcError:()=>Error('db'),CELEBRATION_HEADERS:{'Cache-Control':'private, no-store'}}},globals:global}).component
 return {calls,api,component,run:(req,endpoint='carte')=>component.collectiveEndpoint(req,endpoint,()=>api)}
}
const request=(command,auth=true)=>new Request('https://ephemer.test/api/celebrations/carte'+(command?'':'?id='+celebration),{method:command?'POST':'GET',headers:{...(auth?{Authorization:'Bearer test'}:{}),'Content-Type':'application/json'},...(command?{body:JSON.stringify({celebration,command})}:{})})
const publish=()=>({operation,revision:6,data:{action:'publier',version,expiryDays:30}})

test('collectif API : session vérifiée, origine, verrou et privilèges avant tout accès serveur',async()=>{
 for(const options of [{actor:null},{actor:{id:owner}},{actor:{id:owner,email_confirmed_at:'ok',is_anonymous:true}}]){const s=server(options);assert.equal((await s.run(request())).status,401);assert.equal(s.calls.length,0)}
 const s=server();assert.equal((await s.run(request(undefined,false))).status,401)
 const foreign=request();foreign.headers.set('Origin','https://foreign.test');assert.equal((await s.run(foreign)).status,403);assert.equal(s.calls.length,0)
 const closed=server({available:false});assert.equal((await closed.run(request(publish()))).status,503);assert.equal(closed.calls.length,1)
 const participant=server({read:()=>({...view(),isOrganizer:false})});assert.equal((await participant.run(request(publish()))).status,404);assert.equal(participant.calls.filter(c=>c.scope==='service').length,0)
})
test('collectif API : commandes fermées, acteur et identifiant du service issus de la lecture autorisée',async()=>{
 const s=server({service:async()=>({version,revoked:false})})
 assert.equal((await s.run(request({...publish(),actor:id(99)}))).status,400)
 assert.equal((await s.run(request({...publish(),data:{...publish().data,card:id(99)}}))).status,400)
 const response=await s.run(request(publish()));assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/no-store/)
 const call=s.calls.find(c=>c.scope==='service');assert.equal(call.args.p_carte,card);assert.equal(call.args.p_acteur,owner);assert.equal(call.args.p_revision,6)
 assert.doesNotMatch(await response.text(),/secret|ciphertext|nonce|81000000/)
})
test('collectif API : reprise de publication ne retourne jamais son secret candidat',async()=>{
 const s=server({service:async()=>({version,revoked:false})})
 for(let i=0;i<2;i++)assert.equal((await s.run(request(publish()))).status,200)
 const calls=s.calls.filter(c=>c.scope==='service');assert.equal(calls[0].args.p_operation,calls[1].args.p_operation);assert.notEqual(calls[0].args.p_hash,calls[1].args.p_hash)
 const r=await s.run(request());assert.equal((await r.json()).published.version,version)
})
test('collectif API : récupération du seul secret persisté, contexte/version/droits contrôlés',async()=>{
 const secret=crypt.newCardSecret(),context={celebration,card,version}
 const saved={celebration,carte:card,version,expiresAt:view().published.expiresAt,secretChiffre:crypto.sealCollectiveContent(secret,context,'lien'),hash:crypt.cardSecretHash(secret)}
 const s=server({service:async()=>saved});const response=await s.run(request(),'lien');assert.equal(response.status,200);assert.equal((await response.json()).secret,secret)
 const wrong=server({service:async()=>({...saved,version:id(99)})});assert.equal((await wrong.run(request(),'lien')).status,404)
 const revoked=server({service:async()=>null});assert.equal((await revoked.run(request(),'lien')).status,404)
 const no=server({read:()=>({...view(),isOrganizer:false})});assert.equal((await no.run(request(),'lien')).status,404)
})
test('collectif API : projection stricte refuse données privées substituées et export tiers',async()=>{
 const leak=server({read:()=>({...view(),address:'private@example.invalid'})});assert.equal((await leak.run(request())).status,503)
 const s=server();const exported=await (await s.run(request(),'export')).json();assert.equal(exported.contributions.length,1);assert.equal(Object.keys(exported).sort().join(','),'contributions,id,title')
 const no=server({read:()=>({absente:true})});assert.equal(await (await no.run(request(),'export')).json(),null)
})
test('collectif public : format collectif en secours seulement après absence individuelle',async()=>{
 const calls=[],db={rpc:async name=>{calls.push(name);return {data:name==='consulter_carte_lot08'?null:{content:snapshot,expiresAt:view().published.expiresAt},error:null}}}
 const api=harness('lib/card-server.ts',{overrides:{'server-only':{},'@/lib/supabase-admin':{supabaseAdmin:db}},globals:global}).component
 const req=()=>new Request('https://ephemer.test/api/cartes/consulter',{method:'POST',body:JSON.stringify({secret:crypt.newCardSecret()})})
 assert.equal((await api.cardEndpoint(req(),'consulter','',db)).status,200);assert.deepEqual(calls,['consulter_carte_lot08','consulter_carte_collective'])
 calls.length=0;db.rpc=async name=>{calls.push(name);return {data:{content:{format:1,renderVersion:1,templateVersion:1,templateId:'clair_de_lune',message:'Historique',signature:''},expiresAt:view().published.expiresAt},error:null}}
 assert.equal((await api.cardEndpoint(req(),'consulter','',db)).status,200);assert.deepEqual(calls,['consulter_carte_lot08'])
})

function worker({publication=false,state='reserved',begin=true,sendError=false,finishError=false}={}){
 const calls=[],secret=crypt.newCardSecret(),context={celebration,card,version},dueAt=new Date(Date.now()-1000).toISOString()
 // Charge persistée différente de la nouvelle candidate, pour vérifier la reprise.
 const payload={from:'Ephemer <noreply@ephemer.name>',to:'test@example.invalid',subject:'Persisté',html:'Persisté',text:'Persisté'}
 const rpc=async(name,args)=>{
  calls.push({name,args})
  if(name==='lire_echeances_cartes')return [{plan,carte:card,publication,envoi:true}]
  if(name==='preparer_publication_collective')return {celebration,carte:card,actor:owner,revision:6}
  if(name==='publier_carte_collective')return {version,revoked:false}
  if(name==='lire_enveloppe_carte')return {celebration,carte:card,version,lien:id(99),secretChiffre:crypto.sealCollectiveContent(secret,context,'lien'),address:'test@example.invalid',dueAt}
  if(name==='consulter_carte_collective')return {content:snapshot,expiresAt:view().published.expiresAt}
  if(name==='reserver_email_carte')return state==='reserved'?{state,id:job,token,dueAt,encryptedPayload:crypto.sealCollectiveContent(JSON.stringify(payload),context,'email')}:{state}
  if(name==='engager_email_carte')return {ready:begin,state:begin?'sending':'cancelled'}
  if(name==='finish_email_job'){if(finishError)throw Error('réponse perdue');return null}
  throw Error(name)
 }
 const component=harness('lib/collective-card-worker.ts',{overrides:{'server-only':{},'@/lib/collective-card-server':{collectiveServiceRpc:()=>{},publishCollective:async(api,input)=>api.service('publier_carte_collective',input)}},globals:global}).component
 let sent=0
 return {calls,run:()=>component.processCollectiveBatch({rpc,now:Date.now,send:async(p,opts)=>{calls.push({name:'send',payload:p,options:opts});sent++;if(sendError)throw Error('timeout');return {data:{id:'provider-fixture'}}}}),sent:()=>sent}
}
test('collectif worker : publication avant email, charge persistée et clé UUID stable',async()=>{
 const s=worker({publication:true});const result=await s.run();assert.equal(result.publications,1);assert.equal(result.acceptes,1)
 const names=s.calls.map(c=>c.name);assert.ok(names.indexOf('publier_carte_collective')<names.indexOf('engager_email_carte'));assert.ok(names.indexOf('engager_email_carte')<names.indexOf('send'))
 const sent=s.calls.find(c=>c.name==='send');assert.equal(sent.payload.subject,'Persisté');assert.equal(sent.options.idempotencyKey,'email/'+job);assert.equal(sent.payload.tags[0].value,job)
})
test('collectif worker : aucun envoi pour bail occupé, refus, email accepté ou incertain',async()=>{
 for(const state of ['busy','accepted','uncertain','failed','cancelled','a_reprogrammer']){const s=worker({state});await s.run();assert.equal(s.sent(),0)}
 const s=worker({begin:false});await s.run();assert.equal(s.sent(),0)
})
test('collectif worker : panne après engagement ou acceptation, jamais de deuxième transmission',async()=>{
 const lost=worker({sendError:true});assert.equal((await lost.run()).incertains,1);assert.equal(lost.sent(),1);assert.equal(lost.calls.at(-1).args.p_outcome,'uncertain')
 const saved=worker({finishError:true});assert.equal((await saved.run()).erreurs,1);assert.equal(saved.sent(),1)
})
test('collectif export 13 : contributions propres uniquement et arrêt global sur révocation',async()=>{
 const db=pageDatabase({});db.auth={getUser:async()=>({data:{user:{id:owner}},error:null})};let refused=false
 const api=loadPure('lib/user-data.ts','exportOwnData',{...p2Helpers,supabase:db,CELEBRATIONS_ENABLED:true,COLLECTIVE_CARDS_ENABLED:true,exportCelebrations:async()=>[{celebration:{id:celebration}}],collectiveService:{export:async()=>{if(refused)throw Error('Révoqué');return {id:card,title:'Carte',contributions:[snapshot.contributions[0]]}}}})
 const r=await api.exportOwnData();assert.equal(r.version,13);assert.equal(r.contributions_collectives.length,1);assert.doesNotMatch(JSON.stringify(r.contributions_collectives),/secret|compte|members|reports/)
 refused=true;await assert.rejects(api.exportOwnData(),/Révoqué/)
})
test('collectif éditeur : réponse perdue puis révision actualisée conserve toute la commande du réessai',async()=>{
 const calls=[],ui=harness('components/celebrations/CollectiveCardPanel.tsx',{globals:{Error,crypto:{randomUUID:()=>operation}}})
 const props={view:view(),command:async input=>{calls.push(structuredClone(input));if(calls.length===1)throw Object.assign(new Error('Résultat inconnu'),{status:503})},verify:async()=>snapshot,chooseAvatar:async()=>null}
 ui.render(props);await ui.flush()
 const click=()=>ui.find(n=>n.type==='button'&&ui.text(n)==='Publier maintenant · lien valable 30 jours').props.onClick()
 click();await ui.flush();ui.render({...props,view:{...view(),revision:7}});click();await ui.flush()
 assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);assert.equal(calls[1].revision,6);ui.unmount()
})
test('collectif connecté : réponse tardive après démontage ignorée, aucun contenu ni lien conservé',async()=>{
 let release,signal
 const service={read:async(o,c,s)=>{signal=s;return new Promise(resolve=>{release=resolve})},command:async()=>{},link:async()=>{throw Error('inattendu')}}
 const ui=harness('components/celebrations/CollectiveCardExperience.tsx',{overrides:{'@/lib/collective-card-data':{collectiveService:service},'@/lib/avatar-data':{avatarForCard:async()=>null}}})
 const props={owner,celebration,organizer:true};ui.render(props);await ui.flush();ui.unmount();assert.equal(signal.aborted,true);release(view());await new Promise(resolve=>setImmediate(resolve));ui.render(props)
 assert.equal(ui.nodes().some(n=>n.props.view?.published),false)
})
