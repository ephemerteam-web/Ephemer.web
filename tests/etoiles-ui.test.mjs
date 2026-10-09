// Vrais composants, RPC/identités fictives. Aucune preuve de concurrence PostgreSQL.
import assert from 'node:assert/strict'
import test from 'node:test'
import { harness } from './ui-harness.mjs'
import { loadPure } from './p2-helpers.mjs'
const A='10000000-0000-4000-8000-000000000001',B='10000000-0000-4000-8000-000000000002',D='2026-10-09T10:00:00Z',token='a'.repeat(42)+'A'
const empty={actives:[],recues:[],associations:[],loading:false,error:'',offline:false,contactSeed:null,setContactSeed(){},refresh:async()=>{}}
function events(){const listeners=new Map();return {listeners,addEventListener(name,fn){const set=listeners.get(name)??new Set();set.add(fn);listeners.set(name,set)},removeEventListener(name,fn){listeners.get(name)?.delete(fn)},emit(name){listeners.get(name)?.forEach(fn=>fn())}}}
const context=social=>({'@/components/etoiles/EtoilesContext':{useEtoiles:()=>social}})
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
test('commande UI : retry garde son UUID, échec garde le contenu, résultat et conflit relisent l’état',async()=>{
 const calls=[]
 const api=loadPure('lib/etoiles-data.ts','EtoilesRequestError',{Error}),social={...empty,refresh:async()=>calls.push('read')};let fail=503,serial=0
 const h=harness('components/etoiles/EtoileAction.tsx',{overrides:{...context(social),'@/components/ContactDraftProvider':{useContactDraft:()=>({confirm:async()=>true})},'@/lib/etoiles-data':{...api,sendEtoileCommand:async(_id,command)=>{calls.push(JSON.parse(JSON.stringify(command)));if(fail)throw new api.EtoilesRequestError('Échec simulé',fail);return {ok:true}}}},globals:{Error,navigator:{onLine:true},AbortController,TextEncoder,crypto:{randomUUID:()=>`20000000-0000-4000-8000-${String(++serial).padStart(12,'0')}`}}})
 const props={action:'demander',donnees:{email:' A@EX.ORG '},children:'Envoyer'};h.render(props);await h.flush()
 h.find(n=>n.type==='button').props.onClick();await h.flush();h.render(props);assert.match(h.text(),/Échec simulé/)
 fail=0;h.find(n=>n.type==='button').props.onClick();await h.flush();h.render(props)
 assert.equal(calls[0].operation,calls[2].operation);assert.equal(calls[0].donnees.email,'a@ex.org');assert.deepEqual(calls.filter(c=>typeof c==='string'),['read','read'])
 fail=409;h.find(n=>n.type==='button').props.onClick();await h.flush();assert.equal(calls.at(-1),'read');h.unmount()
})
test('commande UI : confirmation annulée et hors ligne ne déclenchent aucune écriture',async()=>{
 let writes=0,allow=false;const social={...empty}
 const h=harness('components/etoiles/EtoileAction.tsx',{overrides:{...context(social),'@/components/ContactDraftProvider':{useContactDraft:()=>({confirm:async()=>allow})},'@/lib/etoiles-data':{sendEtoileCommand:async()=>{writes++;return {ok:true}},EtoilesRequestError:class extends Error {}}},globals:{navigator:{onLine:true},AbortController,TextEncoder}})
 const props={action:'retirer',donnees:{etoileId:B},children:'Retirer',confirmation:'Confirmer le retrait ?'};h.render(props);await h.flush();h.find(n=>n.type==='button').props.onClick();await h.flush();assert.equal(writes,0)
 social.offline=true;allow=true;h.render(props);assert.equal(h.find(n=>n.type==='button').props.disabled,true);h.find(n=>n.type==='button').props.onClick();await h.flush();assert.equal(writes,0);h.unmount()
})
test('révocation/association : le panneau est libéré avant que son bouton disparaisse',async()=>{
 const states=[],social={...empty};let h
 h=harness('components/etoiles/EtoileAction.tsx',{overrides:{...context(social),'@/components/ContactDraftProvider':{useContactDraft:()=>({confirm:async()=>true})},'@/lib/etoiles-data':{sendEtoileCommand:async()=>({ok:true}),EtoilesRequestError:class extends Error {}}},globals:{AbortController,TextEncoder,navigator:{onLine:true},crypto:{randomUUID:()=>A}}})
 const props={action:'revoquer_lien',donnees:{lienId:B},onBusy:value=>states.push(value),onResult:()=>{states.push('result');h.unmount()},children:'Révoquer'}
 h.render(props);await h.flush();h.find(n=>n.type==='button').props.onClick();await h.flush();assert.deepEqual(states,[true,false,'result'])
})
test('état social : reconnaissance sérialisée, actualisation visible 60 s, ancien compte ignoré',async()=>{
 const win=events(),doc={...events(),visibilityState:'visible'},pending=deferred();let reads=0,tick,recognitions=0
 const h=harness('components/etoiles/EtoilesContext.tsx',{overrides:{'@/lib/etoiles-data':{recogniseEtoiles:async()=>{recognitions++;await pending.promise},readEtoiles:async()=>{reads++;return []}},'@/components/etoiles/EtoilesContext':undefined},globals:{AbortController,navigator:{onLine:true},window:{...win,setInterval(fn,delay){assert.equal(delay,60000);tick=fn;return 1},clearInterval(){}},document:doc}})
 const props={ownerId:A};h.render(props,'AccountEtoiles');await h.flush();win.emit('focus');assert.equal(recognitions,1)
 pending.resolve();await h.flush();await h.flush();const state=h.render(props,'AccountEtoiles').props.value;assert.equal(state.loading,false);assert.equal(reads,6);assert.equal(recognitions,2)
 doc.visibilityState='hidden';tick();await h.flush();assert.equal(recognitions,2)
 doc.visibilityState='visible';tick();await h.flush();assert.equal(recognitions,3)
 win.emit('offline');assert.equal(h.render(props,'AccountEtoiles').props.value.actives.length,0);assert.equal(h.render(props,'AccountEtoiles').props.value.offline,true);h.unmount()
 const late=deferred(),old=harness('components/etoiles/EtoilesContext.tsx',{overrides:{'@/lib/etoiles-data':{recogniseEtoiles:async()=>{},readEtoiles:async()=>late.promise}},globals:{AbortController,navigator:{onLine:true},window:{...events(),setInterval:()=>1,clearInterval(){}},document:{...events(),visibilityState:'visible'}}})
 old.render(props,'AccountEtoiles');await old.flush();old.unmount();late.resolve([{id:B,identite:'Ancien compte'}]);await old.flush();assert.equal(old.render(props,'AccountEtoiles').props.value.actives.length,0)
})
test('création volontaire : prénom seul en brouillon, choix existant proposé et aucun contact inséré',async()=>{
 const calls=[],social={...empty,actives:[{id:A,etoile_id:B,identite:'Camille',origine:'demande',created_at:D}],setContactSeed:seed=>calls.push(['seed',seed])}
 const draft={contacts:[],prenom:'',confirm:async()=>true,setContacts:rows=>calls.push(['draft',rows]),setPrenom:()=>{},navigate:async path=>calls.push(['navigate',path]),registerPrivateDraft:()=>{}}
 const h=harness('components/etoiles/EtoilesScreen.tsx',{overrides:{...context(social),'@/lib/hooks/useClock':{useClock:()=>Date.parse(D)},'@/components/ContactDraftProvider':{useContactDraft:()=>draft},'@/lib/hooks/useContacts':{useContacts:()=>({contacts:[{id:4,prenom:'Fiche existante'}],loading:false,error:''})},'@/lib/etoiles-data':{readEtoiles:async()=>[]},'@/components/Modal':{default:'dialog'},'next/link':{default:'a'}},globals:{AbortController,navigator:{onLine:true},window:events()}})
 h.render();await h.flush();h.render();h.find(n=>n.type==='button'&&h.text(n)==='Ajouter à mon carnet').props.onClick();h.render()
 assert.ok(h.nodes().some(n=>n.type==='option'&&n.props.value==='4'));h.find(n=>n.type==='button'&&h.text(n)==='Préparer une nouvelle fiche').props.onClick();await h.flush()
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1].map(c=>Object.keys(c).sort()))),[['id','prenom','relation']]);assert.equal(calls[0][1][0].prenom,'Camille');assert.equal(calls.at(-1)[1],'/dashboard/contacts/nouveau');h.unmount()
})
function publicHarness({initial=A}={}) {
 const win=events(),doc={...events(),visibilityState:'visible'},location={hash:'#'+token,pathname:'/etoile'},requests=[];let current=initial,listener
 const h=harness('components/etoiles/PublicEtoileScreen.tsx',{overrides:{'next/link':{default:'a'},'@/lib/supabase-browser':{supabase:{auth:{getUser:async()=>({data:{user:current?{id:current,email_confirmed_at:D}:null},error:null}),onAuthStateChange(fn){listener=fn;return {data:{subscription:{unsubscribe(){}}}}}}}},'@/lib/etoiles-data':{sendEtoileCommand:async(owner,command)=>{requests.push({owner,command});return {ok:true,message:'Demande enregistrée.'}},EtoilesRequestError:class extends Error {}}},globals:{AbortController,TextEncoder,navigator:{onLine:true},window:win,document:doc,location,history:{replaceState:()=>location.hash=''},crypto:{randomUUID:()=>A}}})
 return {h,win,doc,location,requests,switchAccount(value){current=value;listener('SIGNED_IN',{user:{id:value}})}}
}
test('entrée publique : fragment effacé, aucune demande à l’ouverture, clic explicite authentifié',async()=>{
 const {h,location,requests}=publicHarness();h.render();await h.flush();h.render();assert.equal(location.hash,'');assert.equal(requests.length,0)
 h.find(n=>n.type==='button'&&h.text(n)==='Demander à devenir une étoile').props.onClick();await h.flush();h.render();assert.equal(requests.length,1);assert.equal(requests[0].command.donnees.token,token);assert.match(h.text(),/Demande enregistrée/);h.unmount()
})
test('entrée publique : connexion, page cachée et changement de compte exigent de rouvrir le lien',async()=>{
 const unauth=publicHarness({initial:null});unauth.h.render();await unauth.h.flush();unauth.h.render();assert.equal(unauth.h.nodes().filter(n=>n.type==='button').length,0);assert.match(unauth.h.text(),/ouvre à nouveau/);unauth.h.unmount()
 for(const mode of ['hidden','account']){const p=publicHarness();p.h.render();await p.h.flush();p.h.render();if(mode==='hidden'){p.doc.visibilityState='hidden';p.doc.emit('visibilitychange')}else p.switchAccount(B);await new Promise(r=>setTimeout(r,5));await p.h.flush();p.h.render();assert.equal(p.h.nodes().filter(n=>n.type==='button').length,0);assert.equal(p.requests.length,0);p.h.unmount()}
})
