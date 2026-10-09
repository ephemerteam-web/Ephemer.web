// Régressions P3 : composants réels, aucun compte ni envoi distant.
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { loadPure, pageDatabase, p2Helpers } from './p2-helpers.mjs'
import { harness } from './ui-harness.mjs'
import React from 'react'

const notifications = loadPure('lib/notifications.ts','markAllNotificationsRead,compareNotificationDates')
const diagnostic = loadPure('lib/diagnostic.ts','parseDiagnostic')
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const nav = { push() {}, replace() {}, refresh() {} }
const drawer = { ouvrirDrawer() {} }
const fakeDocument = { addEventListener() {}, removeEventListener() {} }
function realtime(db) {
  let listener
  const channel = { on(_event,_filter,fn) { listener=fn; return channel }, subscribe() { return channel } }
  return { ...db, channel:()=>channel, removeChannel() {}, emit:()=>listener?.() }
}

test('contacts : une deuxième page en panne ne produit pas de résultat partiel ; Réessayer restitue les 245 lignes',async()=>{
  const rows=Array.from({length:245},(_,i)=>({id:i+1,user_id:'u1',est_favori:null,prenom:null}))
  const db=pageDatabase({contacts:rows},{failAt:2})
  const h=harness('lib/hooks/useContacts.ts',{overrides:{'../supabase-browser':{supabase:db}}})
  h.render({},'useContacts');await h.flush()
  let result=h.render({},'useContacts')
  assert.equal(result.loading,false);assert.ok(result.error);assert.equal(result.contacts.length,0)
  result.retry();h.render({},'useContacts');await h.flush()
  result=h.render({},'useContacts')
  assert.equal(result.error,'');assert.equal(result.contacts.length,245);assert.equal(result.contacts[0].est_favori,null)
})

test('contacts : une réponse arrivée après fermeture du compte est ignorée',async()=>{
  const pending=deferred();const db={from(){const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,then:fn=>pending.promise.then(fn)};return q}}
  const h=harness('lib/hooks/useContacts.ts',{overrides:{'../supabase-browser':{supabase:db}}})
  h.render({},'useContacts');await h.flush();h.unmount()
  pending.resolve({data:[{id:1,user_id:'u1',prenom:'Ancien compte'}],error:null});await h.flush()
  assert.equal(h.render({},'useContacts').contacts.length,0)
})

test('invitations : une panne interdit le formulaire incomplet et le réessai récupère la liste',async()=>{
  const db=pageDatabase({invitations:[]},{failAt:1})
  const h=harness('app/dashboard/inviter/page.tsx',{overrides:{'@/lib/supabase-browser':{supabase:db},'./CarteInvitation':{default:'invitation'}}})
  h.render();await h.flush();h.render()
  assert.equal(h.nodes().filter(n=>n.type==='input').length,0)
  h.find(n=>typeof n.props.retry==='function').props.retry();h.render();await h.flush();h.render()
  assert.ok(h.nodes().some(n=>n.type==='input'))
})

test('profil : erreur persistante et réessai, valeurs nullables normalisées seulement dans le formulaire',async()=>{
  const db=pageDatabase({profiles:[{id:'u1',prenom:null,nom:null,date_naissance:null,telephone_indicatif:null,telephone_numero:null}]},{failAt:1})
  const h=harness('app/dashboard/profil/page.tsx',{overrides:{'next/navigation':{useRouter:()=>nav},'@/lib/supabase-browser':{supabase:db},'@/components/Modal':{default:'modal'},'@/components/PersonalDates':{default:'button'}}})
  h.render();await h.flush();h.render();assert.equal(h.nodes().filter(n=>n.type==='input').length,0)
  h.find(n=>typeof n.props.retry==='function').props.retry();h.render();await h.flush();h.render()
  assert.ok(h.nodes().some(n=>n.type==='input' && n.props.value===''))
})

test('cloche : 250 anciennes non-lues, y compris null ; échec de marquage sans faux succès puis compteur synchronisé',async()=>{
  const rows=Array.from({length:260},(_,i)=>({id:String(i+1).padStart(4,'0'),user_id:'u1',created_at:null,lue:i>=250?true:i%2?null:false,message:'Rappel',type:'anniversaire',contact_id:1,jours_restants:7}))
  rows.push({id:'9000',user_id:'autre',created_at:null,lue:null})
  let fail=true
  const db=pageDatabase({notifications:rows})
  const client=realtime({from(table){const q=db.from(table),update=q.update;q.update=value=>{update(value);if(fail)q.then=fn=>Promise.resolve({data:null,error:new Error('Simulation')}).then(fn);return q};return q}})
  const h=harness('components/NotificationBell.tsx',{overrides:{'next/navigation':{useRouter:()=>nav},'@/lib/supabase-browser':{supabase:client},'@/components/DrawerContext':{useDrawer:()=>drawer}},globals:{document:fakeDocument}})
  h.render();await h.flush();h.render()
  const bell=()=>h.find(n=>n.props.title==='Notifications')
  assert.match(bell().props['aria-label'],/^250 /)
  bell().props.onClick();h.render();await h.flush()
  const mark=()=>h.find(n=>n.props['aria-label']==='Tout marquer comme lu')
  await mark().props.onClick();h.render()
  assert.equal(rows.filter(n=>n.user_id==='u1'&&!n.lue).length,250)
  assert.match(h.find(n=>n.props.retry).props.message,/Impossible de tout marquer/)
  fail=false;await mark().props.onClick();h.render()
  assert.match(bell().props['aria-label'],/^0 /);assert.equal(rows.at(-1).lue,null)
  rows[230].lue=null;client.emit();await h.flush();h.render()
  assert.match(bell().props['aria-label'],/^1 /)
  h.unmount()
})

test('dates de notifications nullables et statut inconnu ne plantent pas les écrans',()=>{
  const rows=[{id:'c',created_at:null},{id:'b',created_at:'2026-10-04'},{id:'a',created_at:null}]
  assert.equal(rows.sort(notifications.compareNotificationDates).map(r=>r.id).join(','),'b,a,c')
  assert.match(loadPure('lib/delivery-status.ts','deliveryStatus').deliveryStatus(null),/inconnu/)
})

test('diagnostic : palier, date et destinataire affichés avec absence explicite d’envoi et modification',()=>{
  const preview=diagnostic.parseDiagnostic({simulation:true,preview:[{contact:'Zoé',date:'2026-10-05',jours:1}],recipient:'test@example.invalid'})
  const h=harness('components/DiagnosticPreview.tsx');h.render(preview)
  assert.match(h.text(),/aucun envoi ni modification/i);assert.match(h.text(),/Zoé/);assert.match(h.text(),/J-1/);assert.match(h.text(),/test@example.invalid/)
  assert.throws(()=>diagnostic.parseDiagnostic({simulation:false,preview:[],recipient:null}))
  assert.throws(()=>diagnostic.parseDiagnostic({simulation:true,preview:[{contact:'Zoé',date:'x',jours:null}],recipient:null}))
})

test('journal email absent, exceptions et réservation invalide : aucun appel Resend',async()=>{
  for(const rpc of [async()=>({error:new Error('Fonction absente'),data:null}),async()=>{throw new Error('Réseau')},async()=>({error:null,data:{state:'reserved',id:'x',token:'y',payload:{}}}),async()=>({error:null,data:{state:'inconnu'}})]){
    let sends=0
    const helpers=loadPure('lib/email-delivery.ts','deliverEmail',{...p2Helpers,supabaseAdmin:{rpc},resend:{emails:{send:async()=>{sends++;return {data:{id:'x'}}}}},createHash,console:{error(){}}})
    await assert.rejects(helpers.deliverEmail({key:'test',kind:'message',userId:'u1',rappelId:1,notificationIds:[],eventKeys:[],source:{},expiresOn:'2026-10-05',payload:{from:'a@example.invalid',to:'b@example.invalid',subject:'Test',text:'Test'}}))
    assert.equal(sends,0)
  }
})

test('journal email : démarrage incohérent refusé et historique invalide non affiché',async()=>{
  assert.equal(p2Helpers.validateJournalResponse('begin_email_job',{ready:true,state:'busy'}),false)
  assert.equal(p2Helpers.validateJournalResponse('my_email_status',[{rappel_id:'1',state:'accepted',resend_id:null,delivery_status:'unconfirmed',updated_at:'2026-10-04'}]),false)
  const result=await p2Helpers.emailJournalRpc({rpc:async()=>({error:null,data:[{}]})},'my_email_status',{})
  assert.ok(result.error);assert.equal(result.data,null)
})

test('layout : une vérification à l’ouverture, aucune supplémentaire à la navigation ; compte changé et déconnexion effacent le contexte',async()=>{
  const users=[{id:'u1',email:'a@example.invalid'},{id:'u2',email:'b@example.invalid'}]
  let current=users[0],calls=0,listener
  const client={...pageDatabase({profiles:users}),auth:{getUser:async()=>{calls++;return {data:{user:current},error:null}},onAuthStateChange:fn=>{listener=fn;return {data:{subscription:{unsubscribe(){}}}}}}}
  const overrides={'next/navigation':{useRouter:()=>nav},'@/lib/supabase-browser':{supabase:client},'@/components/DashboardUserContext':{DashboardUserContext:React.createContext(null)}}
  for(const name of ['ContactDraftProvider','CelestialBackdrop','DrawerGlobal','NotificationBell','MenuLateral','MenuNavigation','OfflineBanner'])overrides['@/components/'+name]={default:name}
  overrides['@/components/DrawerContext']={DrawerProvider:'drawers'}
  const h=harness('app/dashboard/layout.tsx',{overrides})
  h.render({children:'Accueil'});await h.flush();h.render({children:'Accueil'})
  assert.equal(calls,1);assert.equal(h.find(n=>n.props.value?.id==='u1').key,'u1')
  h.render({children:'Contacts'});await h.flush();assert.equal(calls,1)
  current=users[1];listener('SIGNED_IN',{user:current});h.render({children:'Contacts'})
  assert.equal(h.nodes().filter(n=>n.props.value?.id).length,0)
  await new Promise(r=>setTimeout(r,10));await h.flush();h.render({children:'Contacts'})
  assert.equal(calls,2);assert.equal(h.find(n=>n.props.value?.id==='u2').key,'u2')
  listener('SIGNED_OUT',null);h.render({children:'Contacts'});assert.equal(h.nodes().filter(n=>n.props.value?.id).length,0);h.unmount()
})

test('layout : une lecture de profil de l’ancien compte ne rétablit pas son identité',async()=>{
  const old=deferred();let listener,current={id:'u1',email:'a@example.invalid'}
  const client={auth:{getUser:async()=>({data:{user:current},error:null}),onAuthStateChange:fn=>{listener=fn;return {data:{subscription:{unsubscribe(){}}}}}},from(){let id;const q={select:()=>q,eq:(_k,value)=>{id=value;return q},maybeSingle:()=>id==='u1'?old.promise:Promise.resolve({data:{prenom:'Nouveau'},error:null})};return q}}
  const overrides={'next/navigation':{useRouter:()=>nav},'@/lib/supabase-browser':{supabase:client},'@/components/DashboardUserContext':{DashboardUserContext:React.createContext(null)},'@/components/DrawerContext':{DrawerProvider:'drawers'}}
  for(const name of ['ContactDraftProvider','CelestialBackdrop','DrawerGlobal','NotificationBell','MenuLateral','MenuNavigation','OfflineBanner'])overrides['@/components/'+name]={default:name}
  const h=harness('app/dashboard/layout.tsx',{overrides});h.render({children:'Page'});await h.flush()
  current={id:'u2',email:'b@example.invalid'};listener('SIGNED_IN',{user:current});await new Promise(r=>setTimeout(r,10));await h.flush()
  old.resolve({data:{prenom:'Ancien'},error:null});await h.flush();h.render({children:'Page'})
  assert.equal(h.find(n=>n.props.value?.id).props.value.id,'u2');h.unmount()
})

test('polices locales : tous les fichiers gardent les empreintes du build de référence',()=>{
  const rows=JSON.parse(readFileSync(new URL('../app/fonts/provenance.json',import.meta.url),'utf8'))
  assert.equal(rows.length,11)
  for(const row of rows)assert.equal(createHash('sha256').update(readFileSync(new URL('../app/fonts/'+row.file,import.meta.url))).digest('hex'),row.sha256)
  assert.doesNotMatch(readFileSync(new URL('../app/layout.tsx',import.meta.url),'utf8'),/next\/font\/google/)
})

test('cadeaux : occasion spéciale sans date ni description, requête sans notes ni intérêts',async()=>{
  const params=new URLSearchParams('contactId=12&eventType=jour_special'),requests=[]
  let tokenCalls=0
  const client={...pageDatabase({contacts:[{id:12,user_id:'u1',prenom:null,nom:null,relation:'ami',date_naissance:null,note:'Privé',interets:'Privé',est_favori:null}]}),auth:{getUser:async()=>({data:{user:{id:'u1'}}}),getSession:async()=>{tokenCalls++;return {data:{session:{user:{id:'u1'},access_token:'simulation'}}}}}}
  const h=harness('components/GiftSuggestions.tsx',{overrides:{'@/lib/supabase-browser':{supabase:client},'@/components/ContactDraftProvider':{useContactDraft:()=>({hasPrivateDraft:()=>false})}},globals:{fetch:async(_url,options)=>{requests.push(JSON.parse(options.body));return Response.json({ideas:[{idee:'Livre',raison:'Lecture',categorie:'loisir',recherche:'livre'}]})}}})
  h.component.default = h.component.AccountGiftSuggestions
  const props={initialContactId:params.get('contactId'),initialEventType:params.get('eventType')}
  h.render(props);await h.flush();h.render(props)
  assert.equal(tokenCalls,0)
  assert.ok(h.nodes().some(n=>n.type==='select'&&n.props.value==='jour_special'))
  assert.equal(h.nodes().filter(n=>n.type==='input'&&n.props.type==='date').length,0)
  const generate=h.find(n=>n.type==='button'&&h.text(n).includes('Trouver des idées'))
  assert.equal(generate.props.disabled,false);await generate.props.onClick();await h.flush();h.render(props)
  assert.equal(tokenCalls,2);assert.equal(requests.length,1);assert.equal(requests[0].eventType,'jour_special')
  assert.deepEqual(Object.keys(requests[0]).sort(),['budgetCents','currency','eventType','giftMode','relation'])
  assert.doesNotMatch(JSON.stringify(requests),/Privé|date|note|interet|prenom/)
})

test('frontière de l’interface : IDs numériques conservés et entrées invalides refusées',()=>{
  assert.equal(p2Helpers.databaseId('12'),12);assert.equal(p2Helpers.databaseId(12),12)
  for(const value of ['abc','','1e3','-1','1.5',0,NaN,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>p2Helpers.databaseId(value))
})

test('erreurs Next : récupération utilisable sans exposer l’exception',()=>{
  let resets=0
  const h=harness('components/ErrorRecovery.tsx');h.render({reset:()=>resets++,dashboard:true})
  h.find(n=>n.type==='button').props.onClick();assert.equal(resets,1);assert.match(h.text(),/Réessayer/)
  const global=harness('app/global-error.tsx');global.render({error:new Error('Détail privé'),reset:()=>resets++})
  assert.doesNotMatch(global.text(),/Détail privé/);assert.ok(global.nodes().some(n=>n.type==='html'))
})

test('cloche : panne initiale explicite, jamais « aucune notification », puis réessai',async()=>{
  const client=realtime(pageDatabase({notifications:[]},{failAt:1}))
  const h=harness('components/NotificationBell.tsx',{overrides:{'next/navigation':{useRouter:()=>nav},'@/lib/supabase-browser':{supabase:client},'@/components/DrawerContext':{useDrawer:()=>drawer}},globals:{document:fakeDocument}})
  h.render();await h.flush();h.render();h.find(n=>n.props.title==='Notifications').props.onClick();h.render()
  assert.doesNotMatch(h.text(),/Aucune notification/)
  await h.find(n=>n.props.retry).props.retry();await h.flush();h.render()
  assert.match(h.text(),/Aucune notification/);h.unmount()
})

test('notifications : synchronisation locale désinscrite à la fermeture',()=>{
  const changes=loadPure('lib/notification-changes.ts','notifyNotificationsChanged,subscribeNotificationChanges'),seen=[]
  const stop=changes.subscribeNotificationChanges((owner,source)=>seen.push([owner,source]))
  changes.notifyNotificationsChanged('u1','centre');stop();changes.notifyNotificationsChanged('u1','bell')
  assert.deepEqual(seen,[['u1','centre']])
})
