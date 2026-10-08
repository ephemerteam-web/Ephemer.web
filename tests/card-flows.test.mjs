// 🧪 HTTP/clients/rendu réels ; base et identité fictives. Aucun accès distant en écriture.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto'
import { harness } from './ui-harness.mjs'
import { loadPure, pageDatabase, p2Helpers } from './p2-helpers.mjs'
const ownerId=randomUUID(), otherId=randomUUID(), cardId=randomUUID(), prepId=randomUUID(), versionId=randomUUID()
const snapshot={format:1,templateId:'clair_de_lune',templateVersion:1,renderVersion:1,message:'Publié <script>hostile</script>',signature:'Choisie'}
const contract={...harness('lib/cards.ts').component,...harness('lib/card-snapshot-v2.ts').component}
const crypt=loadPure('lib/card-link-crypto.ts','newCardSecret,cardSecretHash,encryptCardSecret,decryptCardSecret,isCardSecret',{Buffer,createCipheriv,createDecipheriv,createHash,randomBytes})
const row=(values={})=>({id:cardId,user_id:ownerId,preparation_id:prepId,modele_id:snapshot.templateId,modele_version:1,rendu_version:1,message:snapshot.message,signature:snapshot.signature,revision:1,...values})
const request=(body,auth=ownerId,method='POST')=>new Request('https://ephemer.test/api/cartes/'+cardId+'/lien',{method,headers:{...(auth?{Authorization:'Bearer '+auth}:{}),'Content-Type':'application/json'},...(method==='GET'||method==='DELETE'?{}:{body:JSON.stringify(body)})})
function serverMock(key=randomBytes(32).toString('hex')){
  const db=pageDatabase({cartes_individuelles:[row()],versions_cartes:[{id:versionId,user_id:ownerId,carte_id:cardId,contenu:snapshot}]})
  const calls=[], operations=new Map();let state={versionId,linkId:null,state:'absent',expiresAt:null},revision=1,projection=null
  db.auth={getUser:async token=>({data:{user:token===ownerId?{id:ownerId}:token===otherId?{id:otherId}:null},error:null})}
  db.rpc=async(name,args)=>{
    calls.push({name,args:{...args}})
    if(name==='consulter_carte_lot08')return {data:projection,error:null}
    if(name==='exporter_liens_cartes_lot08')return {data:[{id:state.linkId,carte_id:cardId,version_id:versionId,expires_at:state.expiresAt,revoked_at:null,created_at:new Date().toISOString(),empreinte:'FORBIDDEN',secret_chiffre:'FORBIDDEN'}],error:null}
    if(name==='lire_partage_carte_lot08')return {data:{...state},error:null}
    if(name==='gerer_partage_carte_lot08'||name==='publier_carte_lot09'){
      if(operations.has(args.p_operation))return {data:operations.get(args.p_operation),error:null}
      if(args.p_revision!==revision)return {data:null,error:{code:'40001',message:'PRIVATE ERROR'}}
      revision++
      await db.from('cartes_individuelles').update({revision}).eq('id',cardId)
      state={versionId,linkId:args.p_lien??state.linkId,state:args.p_action==='revoquer'?'revoque':'actif',expiresAt:new Date(Date.now()+86400000).toISOString(),secretHash:args.p_empreinte,
        encryptedSecret:{format:1,ciphertext:args.p_secret_chiffre,nonce:args.p_nonce,tag:args.p_tag}}
      operations.set(args.p_operation,{revision,versionId,linkId:state.linkId})
      return {data:operations.get(args.p_operation),error:null}
    }
    throw new Error('RPC inattendue')
  }
  const api=harness('lib/card-server.ts',{overrides:{'server-only':{},'@/lib/supabase-admin':{supabaseAdmin:db}},globals:{Request,Response,URL,Buffer,TextDecoder,process:{env:{EPHEMER_CARD_LINK_KEY:key}}}}).component
  return {db,calls,api,operations,setProjection:value=>{projection=value},getState:()=>state,setState:value=>{state=value}}
}
test('API publique : sans session, projection publiée uniquement et refus homogènes à l’expiration exacte',async()=>{
  const mock=serverMock(),secret=crypt.newCardSecret()
  mock.setProjection({content:snapshot,expiresAt:new Date(Date.now()+60000).toISOString(),draft:'BROUILLON',profile:{note:'PRIVEE'}})
  const response=await mock.api.cardEndpoint(request({secret},null),'consulter','',mock.db)
  assert.equal(response.status,200);const body=await response.json()
  assert.deepEqual(Object.keys(body).sort(),['content','expiresAt']);assert.equal(body.content.message,snapshot.message)
  assert.doesNotMatch(JSON.stringify(body),/BROUILLON|PRIVEE|user_id|carte_id/)
  assert.match(response.headers.get('Cache-Control'),/private.*no-store/);assert.equal(response.headers.get('Referrer-Policy'),'no-referrer')
  assert.match(response.headers.get('X-Robots-Tag'),/noindex/)
  assert.equal(mock.calls[0].args.p_empreinte,crypt.cardSecretHash(secret))
  const refused=[]
  for(const value of [null,{content:snapshot,expiresAt:new Date(0).toISOString()},{content:{...snapshot,message:''},expiresAt:new Date(Date.now()+60000).toISOString()}]){
    mock.setProjection(value);const res=await mock.api.cardEndpoint(request({secret},null),'consulter','',mock.db);refused.push(await res.text());assert.equal(res.status,404)
  }
  for(const body of [{secret:'x'},{secret,ownerId},{},{secret:7}]){const res=await mock.api.cardEndpoint(request(body,null),'consulter','',mock.db);assert.equal(res.status,404);refused.push(await res.text())}
  assert.equal(new Set(refused).size,1)
  assert.throws(()=>contract.publicCard({content:snapshot,expiresAt:'2026-10-07T12:00:00Z'},Date.parse('2026-10-07T12:00:00Z')))
})
test('API : corps bornés, origine étrangère, session invalide et isolation propriétaire',async()=>{
  const mock=serverMock()
  for(const auth of [null,'invalid'])assert.equal((await mock.api.cardEndpoint(request({},auth,'GET'),'lien',cardId,mock.db)).status,401)
  assert.equal((await mock.api.cardEndpoint(request({},otherId,'GET'),'lien',cardId,mock.db)).status,404)
  assert.equal(mock.calls.length,0)
  const foreign=request({},ownerId);foreign.headers.set('Origin','https://evil.invalid')
  assert.equal((await mock.api.cardEndpoint(foreign,'lien',cardId,mock.db)).status,403)
  const huge=new Request('https://ephemer.test/api/cartes/consulter',{method:'POST',body:'x'.repeat(2049)})
  assert.equal((await mock.api.cardEndpoint(huge,'consulter','',mock.db)).status,413)
  const streamed=new Request('https://ephemer.test/api/cartes/consulter',{method:'POST',body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('x'.repeat(2049)));c.close()}}),duplex:'half'})
  assert.equal((await mock.api.cardEndpoint(streamed,'consulter','',mock.db)).status,413)
  for(const body of [{revision:1,operationId:randomUUID(),expiryDays:31},{revision:1,operationId:randomUUID(),expiryDays:30,user_id:otherId}])assert.equal((await mock.api.cardEndpoint(request(body),'publication',cardId,mock.db)).status,400)
})
test('publication et retry : secret de la tentative perdante jamais renvoyé, récupération du même droit',async()=>{
  const mock=serverMock(),body={revision:1,operationId:randomUUID(),expiryDays:30}
  for(let i=0;i<2;i++){
    const response=await mock.api.cardEndpoint(request(body),'publication',cardId,mock.db)
    assert.equal(response.status,200);const value=await response.json();assert.equal(value.revision,2);assert.equal(value.published.message,snapshot.message)
    assert.doesNotMatch(JSON.stringify(value),/secret|ciphertext|secretHash|empreinte|nonce|tag/)
  }
  assert.equal(mock.operations.size,1)
  const mutations=mock.calls.filter(call=>call.name==='publier_carte_lot09')
  assert.equal(mutations[0].args.p_operation,mutations[1].args.p_operation);assert.notEqual(mutations[0].args.p_lien,mutations[1].args.p_lien)
  const recover=()=>mock.api.cardEndpoint(request({action:'recuperer'}),'lien',cardId,mock.db)
  const a=await (await recover()).json(),b=await (await recover()).json()
  assert.equal(a.secret,b.secret);assert.equal(a.linkId,mutations[0].args.p_lien);assert.equal(crypt.cardSecretHash(a.secret),mutations[0].args.p_empreinte)
  assert.deepEqual(Object.keys(a).sort(),['expiresAt','linkId','secret'])
  const conflict=await mock.api.cardEndpoint(request({revision:1,operationId:randomUUID(),expiryDays:30}),'publication',cardId,mock.db)
  assert.equal(conflict.status,409);assert.doesNotMatch(await conflict.text(),/PRIVATE ERROR/)
  mock.setState({...mock.getState(),state:'revoque'})
  const retry=await mock.api.cardEndpoint(request(body),'publication',cardId,mock.db)
  assert.equal((await retry.json()).state,'revoque') // ne réactive pas le résultat historique
  assert.equal((await recover()).status,404)
})
test('clé absente : publication/récupération refusées, révocation possible ; chiffrement altéré refusé',async()=>{
  const missing=serverMock('')
  assert.equal((await missing.api.cardEndpoint(request({revision:1,operationId:randomUUID(),expiryDays:30}),'publication',cardId,missing.db)).status,503)
  assert.equal(missing.operations.size,0)
  assert.equal((await missing.api.cardEndpoint(request({action:'revoquer',revision:1,operationId:randomUUID()}),'lien',cardId,missing.db)).status,200)
  assert.equal(missing.calls.find(c=>c.name==='gerer_partage_carte_lot08').args.p_nonce,undefined)
  const mock=serverMock();await mock.api.cardEndpoint(request({revision:1,operationId:randomUUID(),expiryDays:30}),'publication',cardId,mock.db)
  const state=mock.getState();mock.setState({...state,encryptedSecret:{...state.encryptedSecret,tag:'0'.repeat(32)}})
  assert.equal((await mock.api.cardEndpoint(request({action:'recuperer'}),'lien',cardId,mock.db)).status,503)
  mock.setState({...state,secretHash:'0'.repeat(64)})
  assert.equal((await mock.api.cardEndpoint(request({action:'recuperer'}),'lien',cardId,mock.db)).status,503)
})
test('deux remplacements pour une révision : un conflit, version conservée et retry sans rotation répétée',async()=>{
  const mock=serverMock()
  await mock.api.cardEndpoint(request({revision:1,operationId:randomUUID(),expiryDays:30}),'publication',cardId,mock.db)
  const previous=mock.getState().linkId
  const a={action:'remplacer',revision:2,operationId:randomUUID(),expiryDays:7},b={...a,operationId:randomUUID()}
  const results=await Promise.all([mock.api.cardEndpoint(request(a),'lien',cardId,mock.db),mock.api.cardEndpoint(request(b),'lien',cardId,mock.db)])
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409])
  const current=mock.getState().linkId;assert.notEqual(current,previous);assert.equal(mock.getState().versionId,versionId)
  const winner=results[0].status===200?a:b
  assert.equal((await mock.api.cardEndpoint(request(winner),'lien',cardId,mock.db)).status,200)
  assert.equal(mock.getState().linkId,current);assert.equal(mock.operations.size,2)
})
test('suppression : DELETE filtré par propriétaire ; visiteur et autre compte refusés',async()=>{
  const mock=serverMock(),filters=[],deletions=[]
  mock.db.from=()=>{
    let where={},remove=false
    const q={select:()=>q,eq:(k,v)=>{where[k]=v;filters.push([k,v]);return q},delete:()=>{remove=true;return q},maybeSingle:()=>q,single:()=>q,
      then(resolve){const found=where.id===cardId&&where.user_id===ownerId; if(remove&&found)deletions.push({...where});return Promise.resolve({data:found?(remove?{id:cardId}:row()):null,error:null}).then(resolve)}}
    return q
  }
  assert.equal((await mock.api.cardEndpoint(request({},otherId,'DELETE'),'supprimer',cardId,mock.db)).status,404)
  assert.equal((await mock.api.cardEndpoint(request({},null,'DELETE'),'supprimer',cardId,mock.db)).status,401)
  assert.equal(deletions.length,0)
  const response=await mock.api.cardEndpoint(request({},ownerId,'DELETE'),'supprimer',cardId,mock.db)
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{deleted:true});assert.deepEqual(deletions,[{user_id:ownerId,id:cardId}]);assert.ok(filters.length)
})
test('export serveur : propriétaire vérifié, projection fermée sans empreinte ni enveloppe',async()=>{
  const mock=serverMock();await mock.api.cardEndpoint(request({revision:1,operationId:randomUUID(),expiryDays:30}),'publication',cardId,mock.db)
  const response=await mock.api.cardEndpoint(request({},ownerId,'GET'),'export','',mock.db),body=await response.json()
  assert.equal(response.status,200);assert.equal(body.rows[0].statut,'actif');assert.doesNotMatch(JSON.stringify(body),/FORBIDDEN|secret|empreinte|nonce|tag/)
  assert.equal(mock.calls.at(-1).args.p_user_id,ownerId)
})
function clientMock(){
  const rows=[],calls=[];let identity=ownerId,lose=false
  const db={auth:{getUser:async()=>({data:{user:{id:identity}},error:null})},from(table){
    let filters=[],action='read',values
    const q={select:()=>q,eq:(key,value)=>{filters.push(r=>r[key]===value);return q},maybeSingle:()=>q,single:()=>q,insert:value=>{action='insert';values=value;return q},update:value=>{action='update';values=value;return q},then(resolve){
      calls.push({table,action,values});let selected=rows.filter(r=>filters.every(f=>f(r)))
      if(action==='insert'){
        if(rows.some(r=>r.id===values.id||(r.user_id===values.user_id&&r.preparation_id===values.preparation_id)))return Promise.resolve({data:null,error:{code:'23505'}}).then(resolve)
        const created={...values,revision:1};rows.push(created);selected=[created]
      }
      if(action==='update')selected.forEach(r=>Object.assign(r,values))
      if(action!=='read'&&lose){lose=false;return Promise.resolve({data:null,error:{code:'NETWORK'}}).then(resolve)}
      return Promise.resolve({data:selected[0]?{...selected[0]}:null,error:action!=='read'&&!selected.length?{code:'PGRST116'}:null}).then(resolve)
    }};return q
  }}
  const api=loadPure('lib/card-data.ts','saveCard,draftSnapshot,cardRequest,exportCardLinks',{...contract,supabase:db,requireOwner:async id=>{if(identity!==id)throw new Error('session a changé')},AbortController,setTimeout,clearTimeout})
  return {api,rows,calls,changeOwner:id=>{identity=id},loseNext:()=>{lose=true}}
}
test('brouillon : réponse perdue sans doublon, révision filtrée, conflit et isolation A/B',async()=>{
  const mock=clientMock();mock.loseNext()
  const created=await mock.api.saveCard(ownerId,prepId,cardId,null,snapshot)
  assert.equal(created.revision,1);assert.equal(mock.rows.length,1)
  const changed={...snapshot,message:'Nouveau brouillon'};mock.loseNext()
  const updated=await mock.api.saveCard(ownerId,prepId,cardId,1,changed);assert.equal(updated.revision,2)
  assert.equal(mock.calls.find(c=>c.action==='insert').values.revision,undefined)
  assert.ok(!('preparation_id' in mock.calls.find(c=>c.action==='update').values))
  await assert.rejects(mock.api.saveCard(ownerId,prepId,cardId,1,{...snapshot,message:'Conflit'}),/conflit/)
  assert.equal(mock.rows[0].message,changed.message)
  await assert.rejects(mock.api.saveCard(ownerId,prepId,randomUUID(),null,snapshot),/conflit/)
  await assert.rejects(mock.api.saveCard(ownerId,prepId,cardId,null,snapshot),/autre saisie/)
  mock.changeOwner(otherId);await assert.rejects(mock.api.saveCard(ownerId,prepId,cardId,2,snapshot),/session a changé/)
})
test('client : réponse d’un ancien compte ignorée et panne réseau expliquée en français',async()=>{
  let changed=false
  const db={auth:{getSession:async()=>({data:{session:{user:{id:ownerId},access_token:'fictive'}}})}}
  const api=loadPure('lib/card-data.ts','cardRequest',{supabase:db,requireOwner:async()=>{if(changed)throw new Error('La session a changé.')},AbortController,setTimeout,clearTimeout,
    fetch:async()=>{changed=true;return Response.json({secret:'FICTIVE'})}})
  await assert.rejects(api.cardRequest(ownerId,'/api/cartes/'+cardId+'/lien'),/session a changé/)
  changed=false
  const offline=loadPure('lib/card-data.ts','cardRequest',{supabase:db,requireOwner:async()=>{},AbortController,setTimeout,clearTimeout,fetch:async()=>{throw new TypeError('Failed to fetch')}})
  await assert.rejects(offline.cardRequest(ownerId,'/api/cartes/'+cardId+'/lien'),/Réponse non confirmée/)
})
test('export version 7 : cartes/versions isolées, droits paginés et secrets exclus',async()=>{
  const db=pageDatabase({cartes_individuelles:[row(),row({id:randomUUID(),user_id:otherId})],versions_cartes:[{id:versionId,carte_id:cardId,user_id:ownerId,contenu:snapshot}]})
  db.auth={getUser:async()=>({data:{user:{id:ownerId}}})}
  const exported=await loadPure('lib/user-data.ts','exportOwnData,readOwnRows',{...p2Helpers,supabase:db,exportCardLinks:async()=>[{id:randomUUID(),statut:'revoque'}]}).exportOwnData()
  assert.equal(exported.version,7);assert.equal(exported.cartes_individuelles.length,1);assert.equal(exported.versions_cartes.length,1);assert.equal(exported.liens_cartes[0].statut,'revoque')
  const pages=[{rows:[{id:'b',statut:'actif',secret:'FORBIDDEN',empreinte:'FORBIDDEN'}]},{rows:[{id:'c',statut:'expire',secret_chiffre:'FORBIDDEN'}]},{rows:[]}],paths=[]
  const source=harness('lib/card-data.ts',{overrides:{'@/lib/supabase-browser':{supabase:{auth:{getSession:async()=>({data:{session:{user:{id:ownerId},access_token:'fictive'}}})}}},'@/lib/attention-data':{requireOwner:async()=>{}}},globals:{AbortController,fetch:async path=>{paths.push(path);return Response.json(pages.shift())}}}).component
  const rights=await source.exportCardLinks(ownerId);assert.equal(rights.length,2);assert.doesNotMatch(JSON.stringify(rights),/FORBIDDEN|secret|empreinte/);assert.ok(paths[1].endsWith('?apres=b'))
})
function readerFixture(){
  let secret=crypt.newCardSecret(),visible=true,online=true,now=Date.now(),seq=0
  const requests=[],displays=[],timers=new Map()
  const api=loadPure('lib/card-public-reader.ts','createCardReader',{...contract,AbortController})
  const reader=api.createCardReader({secret:()=>secret,visible:()=>visible,online:()=>online,now:()=>now,display:(card,message)=>displays.push({card,message}),
    fetch:(path,options)=>new Promise(resolve=>requests.push({path,options,resolve})),setTimer:(fn,ms)=>{timers.set(++seq,{fn,ms});return seq},clearTimer:id=>timers.delete(id)})
  return {reader,requests,displays,timers,setSecret:value=>{secret=value},setVisible:value=>{visible=value},setOnline:value=>{online=value},setNow:value=>{now=value},now:()=>now}
}
test('lecture : POST sans session/stockage, retour masqué/offline/expiration efface le contenu',async()=>{
  const f=readerFixture(),expiresAt=new Date(f.now()+5000).toISOString(),pending=f.reader.validate()
  assert.equal(f.requests[0].path,'/api/cartes/consulter');assert.equal(f.requests[0].options.credentials,'omit');assert.equal(f.requests[0].options.cache,'no-store')
  f.requests[0].resolve(Response.json({content:snapshot,expiresAt}));await pending;assert.equal(f.displays.at(-1).card.content.message,snapshot.message)
  f.setNow(Date.parse(expiresAt));[...f.timers.values()][0].fn();assert.equal(f.displays.at(-1).card,null)
  f.setOnline(false);await f.reader.validate();assert.match(f.displays.at(-1).message,/Hors ligne/);assert.equal(f.requests.length,1)
  f.reader.dispose()
})
test('lecture : réponses anciennes ignorées après navigation/token et échec retire la carte',async()=>{
  const f=readerFixture(),a=f.reader.validate();f.reader.hide();f.setSecret(crypt.newCardSecret());const b=f.reader.validate()
  f.requests[0].resolve(Response.json({content:snapshot,expiresAt:new Date(f.now()+60000).toISOString()}));await a;assert.equal(f.displays.at(-1).card,null)
  f.requests[1].resolve(Response.json({content:snapshot,expiresAt:new Date(f.now()+60000).toISOString()}));await b;assert.ok(f.displays.at(-1).card)
  const c=f.reader.validate();assert.equal(f.displays.at(-1).card,null);f.requests[2].resolve(Response.json({error:'indisponible'},{status:404}));await c;assert.equal(f.displays.at(-1).card,null)
  f.setVisible(false);await f.reader.validate();assert.equal(f.requests.length,3);f.reader.dispose()
})
function editorMock(initial=null){
  let draft=initial,failSave=false,losePublish=false,share=null,failLoad=false,confirm=true,avatar=harness('lib/avatars.ts').component.DEFAULT_AVATAR_V1
  const calls=[],drafts=new Map(),listeners=new Map()
  const helpers={draftSnapshot:r=>contract.supportedCardSnapshot({format:r.rendu_version,templateId:r.modele_id,templateVersion:1,renderVersion:r.rendu_version,message:r.message,signature:r.signature,...(r.rendu_version===2?{avatar:r.avatar_signature}:{})}),
    loadCard:async()=>{if(failLoad)throw new Error('offline');return {draft,share}},
    saveCard:async(o,p,id,revision,value)=>{calls.push({action:'save',value});if(failSave)throw new Error('Conflit simulé : saisie conservée');draft=row({id,revision:(revision??0)+1,message:value.message,signature:value.signature,modele_id:value.templateId,rendu_version:value.renderVersion,avatar_signature:value.avatar??null});return draft},
    cardOperation:async(o,id,operation)=>{calls.push({action:operation.action,operation:{...operation}});if(losePublish){losePublish=false;throw new Error('Réponse perdue')};share={revision:operation.revision+1,versionId,linkId:randomUUID(),state:'actif',expiresAt:new Date(Date.now()+60000).toISOString(),published:helpers.draftSnapshot(draft)};return share},
    recoverCardLink:async()=>({secret:crypt.newCardSecret(),linkId:randomUUID(),expiresAt:new Date(Date.now()+60000).toISOString()}),cardRequest:async()=>({deleted:true})}
  const h=harness('components/cards/CardEditor.tsx',{overrides:{'@/lib/card-data':helpers,'@/lib/avatar-data':{avatarForCard:async()=>harness('lib/avatar-render-config.ts').component.avatarRenderConfig(avatar)},'@/components/ContactDraftProvider':{useContactDraft:()=>({registerPrivateDraft:(id,value)=>drafts.set(id,value)})}},globals:{Error,window:{location:{origin:'https://ephemer.test'},confirm:()=>confirm,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)},document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},navigator:{clipboard:{writeText:async()=>{}},share:async()=>{throw {name:'AbortError'}}},crypto:{randomUUID}}})
  const props={ownerId,preparationId:prepId,preparedMessage:'Texte préparé',onClose(){},onDirtyChange(){}}
  const render=()=>h.render(props),click=async label=>{h.find(n=>n.type==='button'&&h.text(n)===label).props.onClick();await h.flush();render();await h.flush()}
  return {...h,render,click,calls,drafts,listeners,setFailSave:value=>{failSave=value},loseNextPublish:()=>{losePublish=true},setConfirm:value=>{confirm=value},setFailLoad:value=>{failLoad=value},setAvatar:value=>{avatar=value}}
}
test('éditeur : reprise/enregistrement explicites, conflits gardent le texte et publication bloquée tant que sale',async()=>{
  const h=editorMock();h.render();await h.flush();h.render();await h.flush()
  assert.equal(h.find(n=>n.type==='textarea').props.value,'');assert.equal(h.calls.length,0)
  await h.click('Reprendre mon message préparé');assert.equal(h.find(n=>n.type==='textarea').props.value,'Texte préparé');assert.equal(h.calls.length,0)
  h.setFailSave(true);await h.click('Enregistrer le brouillon');assert.match(h.text(),/Conflit simulé/);assert.equal(h.find(n=>n.type==='textarea').props.value,'Texte préparé')
  h.setFailSave(false);await h.click('Enregistrer le brouillon');assert.match(h.text(),/Brouillon enregistré/)
  h.find(n=>n.type==='textarea').props.onChange({target:{value:'Nouvelle saisie'}});h.render();await h.flush()
  assert.equal(h.find(n=>n.type==='button'&&h.text(n)==='Publier le brouillon enregistré').props.disabled,true)
  h.setConfirm(false);await h.click('Reprendre mon message préparé');assert.equal(h.find(n=>n.type==='textarea').props.value,'Nouvelle saisie')
  assert.ok([...h.drafts.values()].some(Boolean));h.unmount();assert.equal([...h.drafts.values()].some(Boolean),false)
})
test('éditeur : réponse perdue reprend le même UUID, publié distinct du brouillon, partage annulé',async()=>{
  const h=editorMock();h.render();await h.flush();h.render();await h.flush();await h.click('Reprendre mon message préparé');await h.click('Enregistrer le brouillon')
  h.loseNextPublish();await h.click('Publier le brouillon enregistré');assert.match(h.text(),/Résultat non confirmé/)
  await h.click('Reprendre la même opération');const publish=h.calls.filter(c=>c.action==='publier');assert.equal(publish[0].operation.operationId,publish[1].operation.operationId)
  assert.equal(h.nodes().filter(n=>n.props.snapshot).length,2)
  await h.click('Récupérer mon lien');await h.click('Partager…');assert.match(h.text(),/Partage annulé/)
  h.find(n=>n.type==='textarea').props.onChange({target:{value:'Brouillon suivant'}});h.render();assert.equal(h.nodes().filter(n=>n.props.snapshot).at(-1).props.snapshot.message,'Texte préparé')
  h.unmount();const fresh=editorMock();fresh.render();assert.equal(fresh.find(n=>n.type==='textarea').props.value,'');fresh.unmount()
})

test('cartes V2 : la réponse publique accepte seulement une copie valide et ne lit aucun profil',async()=>{
  const mock=serverMock(),avatar={...harness('lib/avatars.ts').component.DEFAULT_AVATAR_V1},v2={...snapshot,format:2,renderVersion:2,avatar}
  await mock.db.from('versions_cartes').update({contenu:v2}).eq('id',versionId)
  const tables=[],originalFrom=mock.db.from;mock.db.from=table=>{tables.push(table);return originalFrom(table)}
  const body={revision:1,operationId:randomUUID(),expiryDays:30}
  const published=await mock.api.cardEndpoint(request(body),'publication',cardId,mock.db)
  assert.equal(published.status,200);assert.equal((await published.json()).published.avatar.hairId,avatar.hairId)
  assert.equal(mock.calls.find(c=>c.name==='publier_carte_lot09').args.p_action,undefined)
  assert.ok(!tables.includes('avatars_utilisateurs')&&!tables.includes('profiles'))
  const secret=crypt.newCardSecret(),expiresAt=new Date(Date.now()+60000).toISOString()
  mock.setProjection({content:v2,expiresAt,profile:{email:'PRIVATE'}})
  const response=await mock.api.cardEndpoint(request({secret},null),'consulter','',mock.db),result=await response.json()
  assert.equal(response.status,200);assert.deepEqual(Object.keys(result.content).sort(),['avatar','format','message','renderVersion','signature','templateId','templateVersion'])
  assert.equal(result.content.avatar.hairId,avatar.hairId);assert.doesNotMatch(JSON.stringify(result),/PRIVATE|user_id|profile/)
  for(const content of [{...v2,avatar:{...avatar,profil:'PRIVATE'}},{...v2,avatar:{...avatar,catalogVersion:9}},{...v2,user_id:ownerId}]){
    mock.setProjection({content,expiresAt});assert.equal((await mock.api.cardEndpoint(request({secret},null),'consulter','',mock.db)).status,404)
  }
})

test('éditeur : V1 reste V1 sans avatar ; copie/actualisation/retrait explicites gardent la publication figée',async()=>{
  const h=editorMock(row());h.render();await h.flush();h.render();await h.flush()
  assert.equal(h.nodes().find(n=>n.props.snapshot).props.snapshot.format,1)
  await h.click('Ajouter mon avatar');assert.equal(h.calls.length,0)
  let value=h.nodes().find(n=>n.props.snapshot).props.snapshot;assert.equal(value.format,2);assert.equal(value.avatar.hairId,'court')
  const newProfile={...harness('lib/avatars.ts').component.DEFAULT_AVATAR_V1,hairId:'long'};h.setAvatar(newProfile)
  h.render();assert.equal(h.nodes().find(n=>n.props.snapshot).props.snapshot.avatar.hairId,'court')
  await h.click('Actualiser depuis mon profil');assert.equal(h.nodes().find(n=>n.props.snapshot).props.snapshot.avatar.hairId,'long')
  await h.click('Enregistrer le brouillon');await h.click('Publier le brouillon enregistré')
  await h.click('Retirer l’avatar');value=h.nodes().find(n=>n.props.snapshot).props.snapshot
  assert.equal(value.format,2);assert.equal(value.avatar,null);assert.equal(h.nodes().filter(n=>n.props.snapshot).at(-1).props.snapshot.avatar.hairId,'long')
  assert.equal(h.find(n=>n.type==='button'&&h.text(n)==='Publier le brouillon enregistré').props.disabled,true)
  h.unmount()
})

test('brouillon V2 : copie de l’avatar conservée après réponse perdue et retrait garde le moteur 2',async()=>{
  const mock=clientMock(),avatar={...harness('lib/avatars.ts').component.DEFAULT_AVATAR_V1},v2={...snapshot,format:2,renderVersion:2,avatar}
  mock.loseNext();const created=await mock.api.saveCard(ownerId,prepId,cardId,null,v2)
  avatar.hairId='long';assert.equal(mock.api.draftSnapshot(created).avatar.hairId,'court')
  const updated=await mock.api.saveCard(ownerId,prepId,cardId,1,{...v2,avatar:null})
  assert.equal(updated.rendu_version,2);assert.equal(updated.avatar_signature,null)
  assert.throws(()=>mock.api.draftSnapshot({...updated,rendu_version:1,avatar_signature:avatar}))
})

test('avatar V3 : ajout volontaire et publication HTTP sans lecture de profil, projection fermée',async()=>{
  const avatar=JSON.parse(JSON.stringify(harness('lib/avatar-collection-v3.ts').component.DEFAULT_AVATAR_V3))
  const h=editorMock(row());h.setAvatar(avatar);h.render();await h.flush();h.render();await h.flush()
  assert.equal(h.nodes().find(n=>n.props.snapshot).props.snapshot.format,1)
  await h.click('Ajouter mon avatar');assert.equal(h.calls.length,0)
  await h.click('Enregistrer le brouillon');await h.click('Publier le brouillon enregistré')
  avatar.accessories.headwearId='halo';h.setAvatar(avatar);h.render()
  assert.equal(h.nodes().filter(n=>n.props.snapshot).at(-1).props.snapshot.avatar.accessories.headwearId,'aucun')
  await h.click('Actualiser depuis mon profil')
  assert.equal(h.nodes().find(n=>n.props.snapshot).props.snapshot.avatar.accessories.headwearId,'halo')
  assert.equal(h.nodes().filter(n=>n.props.snapshot).at(-1).props.snapshot.avatar.accessories.headwearId,'aucun');h.unmount()
  const mock=serverMock(),v2={...snapshot,format:2,renderVersion:2,avatar}
  await mock.db.from('versions_cartes').update({contenu:v2}).eq('id',versionId)
  const tables=[],original=mock.db.from;mock.db.from=table=>{tables.push(table);return original(table)}
  const response=await mock.api.cardEndpoint(request({revision:1,operationId:randomUUID(),expiryDays:30}),'publication',cardId,mock.db)
  assert.equal(response.status,200);assert.equal((await response.json()).published.avatar.renderVersion,3)
  assert.ok(!tables.includes('profiles')&&!tables.includes('avatars_utilisateurs'))
  const secret=crypt.newCardSecret(),expiresAt=new Date(Date.now()+60000).toISOString()
  mock.setProjection({content:v2,expiresAt,profile:{email:'PRIVE'}})
  const publicResponse=await mock.api.cardEndpoint(request({secret},null),'consulter','',mock.db)
  assert.equal(publicResponse.status,200);const body=await publicResponse.json()
  assert.equal(body.content.avatar.accessories.headwearId,'halo');assert.doesNotMatch(JSON.stringify(body),/PRIVE|profile|user_id/)
  mock.setProjection({content:{...v2,avatar:{...avatar,profile:{email:'PRIVE'}}},expiresAt})
  assert.equal((await mock.api.cardEndpoint(request({secret},null),'consulter','',mock.db)).status,404)
})
