// HTTP et composants réels, transport Auth/RPC fictif ; aucun vrai JWT ni écriture distante.
import test from 'node:test'
import assert from 'node:assert/strict'
import { harness } from './ui-harness.mjs'
import { loadPure, p2Helpers, pageDatabase } from './p2-helpers.mjs'
const c = harness('lib/univers-contract.ts', { globals: { TextEncoder } }).component
const A='10000000-0000-4000-8000-000000000001', B='10000000-0000-4000-8000-000000000002'
const copy=v=>JSON.parse(JSON.stringify(v)), own=()=>copy(c.universInitial('Lune'))
const uuidEtoile=loadPure('lib/etoiles-contract.ts','uuidEtoile').uuidEtoile
const api=loadPure('lib/univers-server.ts','universEndpoint',{...c,uuidEtoile,limitedJSON:p2Helpers.limitedJSON,URL,Response,ETOILES_HEADERS:{'Cache-Control':'private, no-store',Vary:'Authorization'},socialTransport:()=>{throw new Error('Transport manquant')}})
const request=(path='',body,headers={})=>new Request('https://ephemer.test/api/univers'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer fake-jwt',...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})})
function transport(result=own(),user={id:A,email_confirmed_at:'2026-10-09T10:00:00Z'}) {
 const calls=[];return {calls,factory:token=>({verify:async()=>{calls.push(['verify',token]);return user},rpc:async(name,args)=>{calls.push([name,copy(args)]);if(result instanceof Error)throw result;return copy(result)}})}
}
test('univers HTTP : auth, origine, query fermée, propre cible et utilisateur vérifié',async()=>{
 for(const [r,mode,status] of [[new Request('https://ephemer.test/api/univers'),'proprietaire',401],[request('',{}, {Origin:'https://evil.test'}),'commande',403],[request('?user_id='+B),'proprietaire',400],[request('/etoile?etoileId='+B+'&etoileId='+A),'etoile',400],[request('/etoile?etoileId='+A),'etoile',403],[request('/etoile?etoileId=abc'),'etoile',400]]){
  const t=transport();const res=await api.universEndpoint(r,mode,t.factory);assert.equal(res.status,status);assert.match(res.headers.get('cache-control'),/private, no-store/);assert.equal(t.calls.some(row=>row[0]==='lire_mon_univers'||row[0]==='consulter_univers_etoile'),false)
 }
 for(const [user,status] of [[null,401],[{id:A},403],[{id:A,email_confirmed_at:'x',is_anonymous:true},403]])assert.equal((await api.universEndpoint(request(),'proprietaire',transport(own(),user).factory)).status,status)
})
test('univers HTTP : contrats distincts et aucun champ propriétaire dans la consultation',async()=>{
 const t=transport();const res=await api.universEndpoint(request(),'proprietaire',t.factory);assert.equal(res.status,200);assert.equal((await res.json()).revision,0);assert.deepEqual(t.calls,[['verify','fake-jwt'],['lire_mon_univers',{}]])
 const shared={identite:'Lune',champs:{anniversaire:{jour:29,mois:2}}};const u=transport(shared);const r=await api.universEndpoint(request('/etoile?etoileId='+B),'etoile',u.factory);assert.deepEqual(await r.json(),shared);assert.equal(u.calls[1][1].p_etoile,B)
 for(const bad of [own(),{...shared,user_id:B},{identite:'Lune',champs:{anniversaire:{jour:29,mois:2,annee:null}}}]){const r=await api.universEndpoint(request('/etoile?etoileId='+B),'etoile',transport(bad).factory);assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/valeurs|annee|revision/)}
})
test('univers HTTP : sauvegarde et masquage conservent révision/UUID, rejettent taille et injection',async()=>{
 const {revision,...donnees}=own();const command={action:'enregistrer',revision,operation:B,donnees};const t=transport({ok:true,revision:1});assert.equal((await api.universEndpoint(request('',command),'commande',t.factory)).status,200);assert.deepEqual(t.calls[1],['commander_mon_univers',{p_action:'enregistrer',p_donnees:donnees,p_revision:0,p_operation:B}])
 for(const [body,status] of [[{...command,user_id:A},400],[{...command,donnees:{...donnees,ia:true}},400],['x'.repeat(32769),413],['{',400]]){const t=transport();assert.equal((await api.universEndpoint(request('',body),'commande',t.factory)).status,status);assert.equal(t.calls.length,1)}
 const masked=transport({ok:true,revision:2});await api.universEndpoint(request('',{action:'masquer',revision:1,operation:B,donnees:{}}),'commande',masked.factory);assert.deepEqual(masked.calls[1][1].p_donnees,{})
 for(const status of [403,409,503]){const error=new Error('SECRET SQL');error.status=status;const r=await api.universEndpoint(request(),'proprietaire',transport(error).factory);assert.equal(r.status,status);assert.doesNotMatch(await r.text(),/SECRET SQL/)}
})
test('univers transport réel : client par requête et JWT utilisateur pour les trois RPC',async()=>{
 const calls=[],clients=[];let result=own()
 const shared=loadPure('lib/etoiles-server.ts','socialTransport',{createClient:(_u,_k,options)=>{clients.push(options);return {auth:{getUser:async()=>({data:{user:{id:A,email_confirmed_at:'x'}},error:null})}}},process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://supabase.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fake-anon'}},AbortSignal,limitedJSON:p2Helpers.limitedJSON,fetch:async(url,options)=>{calls.push({url,options});return Response.json(result)}})
 const first=shared.socialTransport('jwt-a'),second=shared.socialTransport('jwt-b');await first.verify();await first.rpc('lire_mon_univers',{});result={identite:'Lune',champs:{}};await second.rpc('consulter_univers_etoile',{p_etoile:B});result={ok:true,revision:1};await first.rpc('commander_mon_univers',{p_action:'masquer',p_donnees:{},p_revision:0,p_operation:B})
 assert.equal(clients.length,2);assert.notEqual(clients[0],clients[1]);assert.equal(clients[0].auth.persistSession,false);assert.deepEqual(calls.map(x=>x.options.headers.Authorization),['Bearer jwt-a','Bearer jwt-b','Bearer jwt-a']);assert.ok(calls.every(x=>x.options.cache==='no-store'))
})
test('univers navigateur : compte changé, hors ligne et annulation refusent les données',async()=>{
 let after=B,online=true,reads=0
 const browser=loadPure('lib/etoiles-data.ts','socialRequest',{limitedJSON:p2Helpers.limitedJSON,navigator:{get onLine(){return online}},DOMException,supabase:{auth:{getSession:async()=>({data:{session:{user:{id:++reads%2?A:after},access_token:'fake-jwt'}},error:null})}},fetch:async()=>Response.json(own())})
 await assert.rejects(browser.socialRequest(A,'/api/univers'),/session a changé/);after=A;online=false;await assert.rejects(browser.socialRequest(A,'/api/univers'),/Hors ligne/);online=true
 const abort=new AbortController();abort.abort();await assert.rejects(browser.socialRequest(A,'/api/univers',undefined,abort.signal),/abandonnée/)
})
test('export 9 : univers propriétaire complet, aucun tiers/journal et erreur refuse export partiel',async()=>{
 const db=pageDatabase({});db.auth={getUser:async()=>({data:{user:{id:A,email:'a@example.invalid'}},error:null})};const owner=own();owner.revision=4;owner.valeurs.eviter='Valeur privée';owner.valeurs.anniversaire={jour:29,mois:2,annee:2000}
 const data=loadPure('lib/user-data.ts','exportOwnData',{...p2Helpers,supabase:db,readMonUnivers:async id=>{assert.equal(id,A);return copy(owner)}});const result=await data.exportOwnData();assert.equal(result.version,9);assert.deepEqual(result.mon_univers,owner);assert.equal(result.univers_etoiles,undefined);assert.equal(result.operations_univers,undefined)
 await assert.rejects(loadPure('lib/user-data.ts','exportOwnData',{...p2Helpers,supabase:db,readMonUnivers:async()=>{throw new Error('Univers indisponible')}}).exportOwnData(),/Univers indisponible/)
})
function panelSetup() {
 const window=new EventTarget(),document=new EventTarget(),navigator={onLine:true};document.visibilityState='visible';let tick,calls=0,deliver=null,fail=false
 window.setInterval=fn=>{tick=fn;return 1};window.clearInterval=()=>{}
 const h=harness('components/univers/UniversPartagePanel.tsx',{globals:{window,document,navigator,AbortController},overrides:{'@/lib/univers-data':{readUniversPartage:async()=>{calls++;if(fail)throw new Error('403');if(deliver)return deliver;return {identite:'Étoile',champs:{passions:'Musique'}}}}}})
 const props={ownerId:A,etoileId:B,initialOpen:true,revisionSociale:1},render=()=>h.render(props,'AccountUniversPartage')
 return {h,props,render,window,document,navigator,get calls(){return calls},tick:()=>tick(),set fail(value){fail=value},set pending(value){deliver=value}}
}
test('univers partagé : ouvert seulement, focus/60s visibles et effacement hors ligne/masqué/erreur',async()=>{
 const s=panelSetup();s.render();await s.h.flush();s.render();assert.ok(s.h.nodes().some(n=>n.props.value?.champs?.passions==='Musique'))
 s.window.dispatchEvent(new Event('focus'));await s.h.flush();s.tick();await s.h.flush();assert.equal(s.calls,3)
 s.document.visibilityState='hidden';s.document.dispatchEvent(new Event('visibilitychange'));await s.h.flush();s.render();assert.equal(s.h.nodes().some(n=>n.props.value),false);s.tick();await s.h.flush();assert.equal(s.calls,3)
 s.document.visibilityState='visible';s.document.dispatchEvent(new Event('visibilitychange'));await s.h.flush();s.render();s.navigator.onLine=false;s.window.dispatchEvent(new Event('offline'));s.render();assert.equal(s.h.nodes().some(n=>n.props.value),false)
 s.navigator.onLine=true;s.fail=true;s.window.dispatchEvent(new Event('online'));await s.h.flush();s.render();assert.match(s.h.text(),/indisponible/);assert.equal(s.h.nodes().some(n=>n.props.value),false);s.h.unmount()
 const closed=panelSetup();closed.props.initialOpen=false;closed.render();await closed.h.flush();assert.equal(closed.calls,0);closed.h.unmount()
})
test('univers partagé : réponse périmée après fermeture ou démontage ignorée',async()=>{
 const s=panelSetup();let resolve;s.pending=new Promise(r=>{resolve=r});s.render();await s.h.flush();s.h.find(n=>n.type==='button').props.onClick();s.render();await s.h.flush();resolve({identite:'SECRET',champs:{}});await s.h.flush();s.render();assert.equal(s.h.nodes().some(n=>n.props.value),false);s.h.unmount()
 const old=panelSetup();let finish;old.pending=new Promise(r=>{finish=r});old.render();await old.h.flush();old.h.unmount();finish({identite:'Ancien compte',champs:{}});await old.h.flush();old.render();assert.equal(old.h.nodes().some(n=>n.props.value),false)
})
test('univers partagé : relation ou association absente enlève le panneau immédiatement',()=>{
 const social={actives:[{id:A,etoile_id:B}],associations:[{contact_id:'9007199254740993',etoile_id:B,relation_id:A}],error:'',offline:false};const h=harness('components/univers/UniversPartagePanel.tsx',{overrides:{'@/components/DashboardUserContext':{useDashboardUser:()=>({id:A})},'@/components/etoiles/EtoilesContext':{useEtoiles:()=>social}}})
 const props={etoileId:B,contactId:'9007199254740993'};assert.ok(h.render(props));social.associations=[];assert.equal(h.render(props),null);assert.ok(h.render({etoileId:B}));social.actives=[];assert.equal(h.render({etoileId:B}),null);social.actives=[{id:A,etoile_id:B}];social.offline=true;assert.equal(h.render({etoileId:B}),null);h.unmount()
})
