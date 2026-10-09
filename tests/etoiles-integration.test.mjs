// Contrats HTTP et transport réels, Auth/RPC simulés : aucun JWT ni compte distant.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { loadPure, pageDatabase, p2Helpers } from './p2-helpers.mjs'
const names='commandeEtoile,etoilesItems,resultatEtoile,reconnaissanceEtoiles,exportEtoilesItems,contactIdEtoile,uuidEtoile,tokenEtoile,lectureEtoiles,ETOILES_EXPORT_VUES'
const contract=loadPure('lib/etoiles-contract.ts',names,{TextEncoder})
const A='10000000-0000-4000-8000-000000000001',B='10000000-0000-4000-8000-000000000002',D='2026-10-09T10:00:00Z',TOKEN='a'.repeat(42)+'A'
const uid=i=>'20000000-0000-4000-8000-'+String(i).padStart(12,'0')
function server({verified={id:A,email_confirmed_at:D},result={items:[]},code=null}={}) {
 const calls=[],clients=[]
 const api=loadPure('lib/etoiles-server.ts','etoilesEndpoint',{
  ...contract,limitedJSON:p2Helpers.limitedJSON,Request,Response,URL,AbortSignal,
  process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://test.supabase.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fictional-anon'}},
  createClient:(_url,_key,options)=>{clients.push(options);return {auth:{getUser:async token=>{calls.push(['verify',token]);return {data:{user:verified},error:null}}}}},
  fetch:async(url,options)=>{calls.push([url,JSON.parse(options.body),options.headers,options.cache]);return Response.json(code?{code,message:'SECRET SQL'}:result,{status:code?400:200})},
 })
 return {...api,calls,clients}
}
const request=(path='',body,headers={})=>new Request('https://ephemer.test/api/etoiles'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer fake-jwt',...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})})
test('HTTP social : session vérifiée, client propre par requête et JWT utilisé dans chaque RPC',async()=>{
 const api=server();await api.etoilesEndpoint(request('?vue=actives&limite=100'),'liste');await api.etoilesEndpoint(request('?vue=recues',undefined,{Authorization:'Bearer another-fake-jwt'}),'liste')
 assert.equal(api.clients.length,2);assert.notEqual(api.clients[0],api.clients[1]);assert.equal(api.clients[0].auth.persistSession,false)
 assert.equal(api.calls[1][2].Authorization,'Bearer fake-jwt');assert.equal(api.calls[3][2].Authorization,'Bearer another-fake-jwt');assert.equal(api.calls[1][3],'no-store')
 assert.doesNotMatch(readFileSync(new URL('../lib/etoiles-server.ts',import.meta.url),'utf8'),/supabase-admin|SERVICE_ROLE/)
})
test('HTTP social : absence de session, origine étrangère et adresse non vérifiée refusées',async()=>{
 const api=server();const absent=await api.etoilesEndpoint(new Request('https://ephemer.test/api/etoiles?vue=actives'),'liste');assert.equal(absent.status,401);assert.equal(api.clients.length,0)
 assert.equal((await api.etoilesEndpoint(request('',{}, {Origin:'https://evil.test'}),'commande')).status,403);assert.equal(api.clients.length,0)
 for(const verified of [null,{id:A},{id:A,email_confirmed_at:D,is_anonymous:true}]) {const s=server({verified});const r=await s.etoilesEndpoint(request('?vue=actives'),'liste');assert.equal(r.status,verified?403:401);assert.equal(s.calls.length,1)}
})
test('HTTP social : corps et paramètres fermés, taille et types stricts, bigint intact',async()=>{
 for(const body of ['{', 'x'.repeat(4097),{action:'creer_lien',donnees:{},operation:A,user_id:B}]){const api=server();const r=await api.etoilesEndpoint(request('',body),'commande');assert.equal(r.status,typeof body==='string'&&body.length>4096?413:400);assert.equal(api.calls.length,1)}
 for(const query of ['?vue=actives&vue=recues','?vue=actives&user_id='+B,'?vue=actives&limite=101','?vue=actives&apres=12']){const api=server();assert.equal((await api.etoilesEndpoint(request(query),'liste')).status,400)}
 for(const limite of ['100',null,0,101,1.5]){const api=server();assert.equal((await api.etoilesEndpoint(request('/reconnaitre',{apres:null,limite}),'reconnaitre')).status,400)}
 const api=server();assert.equal((await api.etoilesEndpoint(request('/associations?apres=9007199254740993'),'associations')).status,200);assert.equal(api.calls[1][1].p_apres,'9007199254740993')
})
test('HTTP social : réponses neutres identiques et sans résolution privée pour les trois demandes',async()=>{
 const results=[]
 for(const [action,donnees] of [['demander',{email:' A@EX.ORG '}],['demander_contact',{contactId:'9223372036854775807'}],['demander_lien',{token:TOKEN}]]) {
  const api=server({result:{ok:true,message:'SQL',destinataire_id:B,existe:true,token:TOKEN}}),r=await api.etoilesEndpoint(request('',{action,donnees,operation:A}),'commande')
  assert.equal(r.status,202);assert.match(r.headers.get('cache-control'),/private, no-store/);results.push(await r.json());assert.equal(api.calls[1][1].p_operation,A)
 }
 assert.deepEqual(results,[{ok:true,message:'Demande enregistrée.'},{ok:true,message:'Demande enregistrée.'},{ok:true,message:'Demande enregistrée.'}])
})
test('HTTP social : conflits, quota et liens indisponibles ne divulguent pas le message SQL',async()=>{
 for(const [code,status] of [['P1009',409],['P1020',429],['42501',403],['22023',400],['28000',403],['XX000',503]]) {
  const api=server({code}),r=await api.etoilesEndpoint(request('',{action:'creer_lien',donnees:{},operation:A}),'commande');assert.equal(r.status,status);assert.doesNotMatch(await r.text(),/SECRET SQL/)
 }
})
test('HTTP social : secret remis une fois, repris sans token, projections débarrassées des champs privés',async()=>{
 for(const token of [TOKEN,undefined]) {const api=server({result:{ok:true,lienId:B,expiresAt:D,token,empreinte:'secret'}}),r=await api.etoilesEndpoint(request('',{action:'creer_lien',donnees:{},operation:A}),'commande');const data=await r.json();assert.equal(data.token,token);assert.equal(data.empreinte,undefined)}
 const rows=contract.etoilesItems({items:[{id:A,adresse_cible:'a@ex.org',etat:'en_attente',created_at:D,expires_at:D,destinataire_id:B,profil:'SECRET'}]},'envoyees')
 assert.doesNotMatch(JSON.stringify(rows),/destinataire|profil|SECRET/)
 assert.throws(()=>contract.etoilesItems({items:[{id:A,created_at:D,revision:'1'}]},'actives'))
})
function client({result=()=>({items:[]}),after=A,fail=false}={}) {
 const calls=[];let sessions=0
 const api=loadPure('lib/etoiles-data.ts','readEtoiles,recogniseEtoiles,sendEtoileCommand,exportEtoiles,EtoilesRequestError',{
  ...contract,limitedJSON:p2Helpers.limitedJSON,URLSearchParams,navigator:{onLine:true},
  supabase:{auth:{getSession:async()=>({data:{session:{user:{id:++sessions%2?A:after},access_token:'fake-jwt'}},error:null})}},
  fetch:async(path,options)=>{calls.push({path,options});return Response.json(await result(path,options,calls.length),{status:fail?503:200})},
 })
 return {...api,calls}
}
test('lectures sociales : 245 lignes et curseurs bigint textuels, jamais de tri lexical',async()=>{
 const ids=Array.from({length:245},(_,i)=>(9007199254740993n+BigInt(i)).toString())
 const api=client({result:path=>{const p=new URL(path,'https://test').searchParams;const start=p.has('apres')?ids.indexOf(p.get('apres'))+1:0;return {items:ids.slice(start,start+100).map(contact_id=>({contact_id,etoile_id:B,relation_id:A}))}}})
 const rows=await api.readEtoiles(A,'associations');assert.equal(rows.length,245);assert.equal(rows[0].contact_id,ids[0]);assert.equal(api.calls.length,3);assert.equal(new URL(api.calls[1].path,'https://test').searchParams.get('apres'),ids[99])
 const bad=client({result:()=>({items:Array.from({length:100},(_,i)=>({id:uid(i),created_at:D}))})});await assert.rejects(bad.readEtoiles(A,'bloquees'),/Pagination incohérente/)
})
test('reconnaissance : toutes les pages de 100 parcourues, curseur répété refusé',async()=>{
 const api=client({result:(_p,_o,n)=>({ok:true,nouvelles:1,apres:n===3?null:String(n*100)})});await api.recogniseEtoiles(A);assert.equal(api.calls.length,3);assert.deepEqual(api.calls.map(r=>JSON.parse(r.options.body)),[{apres:null,limite:100},{apres:'100',limite:100},{apres:'200',limite:100}])
 await assert.rejects(client({result:()=>({ok:true,nouvelles:0,apres:'100'})}).recogniseEtoiles(A),/incohérente/)
})
test('client social : changement de compte et panne de page empêchent un résultat partiel',async()=>{
 await assert.rejects(client({after:B}).readEtoiles(A,'actives'),/session a changé/)
 const api=client({result:(_p,_o,n)=>n===1?{items:Array.from({length:100},(_,i)=>({id:uid(i),created_at:D}))}:{items:[{}]}})
 await assert.rejects(api.readEtoiles(A,'bloquees'));assert.equal(api.calls.length,2)
})
test('export social : les cinq vues paginées, sans secret, profil tiers ni cible résolue',async()=>{
 const api=client({result:path=>{const p=new URL(path,'https://test').searchParams,vue=p.get('vue');const count=vue==='liens'&&!p.has('apres')?100:1;return {items:Array.from({length:count},(_,i)=>({id:uid(p.has('apres')?100+i:i),created_at:D,updated_at:D,expires_at:D,etoile_id:B,contact_id:'9007199254740993',etat:vue==='relations'?'retiree':'expiree',origine:'demande',direction:'envoyee',adresse_cible:'a@ex.org',auteur_id:B,destinataire_id:B,revoque:true,token:TOKEN,empreinte:'SECRET',profil:'SECRET'}))}}})
 const result=await api.exportEtoiles(A);assert.equal(result.liens.length,101);assert.equal(api.calls.length,6);assert.equal(result.demandes[0].auteur_id,null);assert.equal(result.associations[0].contact_id,'9007199254740993');assert.doesNotMatch(JSON.stringify(result),/token|empreinte|profil|destinataire|SECRET/)
})
test('export version 9 : notifications des deux sources isolées et export social obligatoire',async()=>{
 const db=pageDatabase({notifications_etoiles:[{id:A,user_id:A,type:'demande_etoile',lue:false},{id:B,user_id:B,lue:false}]});db.auth={getUser:async()=>({data:{user:{id:A,email:'a@ex.org'}},error:null})}
 const api=loadPure('lib/user-data.ts','exportOwnData',{...p2Helpers,supabase:db,exportEtoiles:async owner=>{assert.equal(owner,A);return {relations:[{id:B,etat:'retiree'}]}}})
 const exported=await api.exportOwnData();assert.equal(exported.version, 9);assert.equal(exported.notifications_etoiles.length,1);assert.equal(exported.etoiles.relations[0].etat,'retiree')
 await assert.rejects(loadPure('lib/user-data.ts','exportOwnData',{...p2Helpers,supabase:db,exportEtoiles:async()=>{throw new Error('Étoiles indisponibles')}}).exportOwnData(),/indisponibles/)
})
test('notifications : mêmes IDs séparés par source, marquage propriétaire et aucune suppression sociale',async()=>{
 const db=pageDatabase({notifications:[{id:A,user_id:A,lue:null,created_at:D,message:'Rappel',contact_id:2,event_date:D}],notifications_etoiles:[{id:A,user_id:A,lue:false,type:'demande_etoile',created_at:D},{id:B,user_id:B,lue:false,type:'nouvelle_etoile',created_at:D}]})
 const api=loadPure('lib/social-notifications.ts','readNotifications,markNotificationRead,markAllMergedNotificationsRead,notificationKey',{...p2Helpers,...loadPure('lib/notifications.ts','compareNotificationDates')})
 const rows=await api.readNotifications(db,A);assert.equal(rows.length,2);assert.equal(new Set(rows.map(api.notificationKey)).size,2)
 await api.markNotificationRead(db,A,rows.find(n=>n.source==='etoile'));const after=await api.readNotifications(db,A);assert.equal(after.find(n=>n.source==='rappel').lue,null);assert.equal(after.find(n=>n.source==='etoile').lue,true)
 await api.markAllMergedNotificationsRead(db,A);assert.ok((await api.readNotifications(db,A)).every(n=>n.lue));await assert.rejects(api.markNotificationRead(db,A,{source:'etoile',id:B}))
 assert.doesNotMatch(readFileSync(new URL('../lib/social-notifications.ts',import.meta.url),'utf8'),/\.delete\(/)
})
