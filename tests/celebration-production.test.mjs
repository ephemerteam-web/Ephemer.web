import test from 'node:test'
import assert from 'node:assert/strict'
import {loadPure,p2Helpers} from './p2-helpers.mjs'
import {harness} from './ui-harness.mjs'
const contract=loadPure('lib/celebration-contract.ts','celebrationDetail,celebrationUuid',{...p2Helpers,TextEncoder})
const A='61000000-0000-4000-8000-000000000001',B='61000000-0000-4000-8000-000000000002',C='62000000-0000-4000-8000-000000000001',T='63000000-0000-4000-8000-000000000001'
const row=()=>({celebration:{id:C,titre:'Titre courant',date:null,dateCanonique:null,heure:null,lieu:null,mode:'partage',surprise:false,destinataire:null,etat:'active',revision:2,role:'participant',maintenance:false},participants:[{id:A,compte:A,identite:'Alice',role:'participant',etat:'active'},{id:B,compte:B,identite:'Bruno',role:'organisateur',etat:'active'}],taches:[{id:T,titre:'Ma tâche actuelle',type:'cadeau',responsable:B,echeance:null,etat:'a_faire',revision:2,auteur:A},{id:B,titre:'Tâche tierce',type:'repas',responsable:A,echeance:null,etat:'a_faire',revision:1,auteur:B}],commentaires:[{id:T,auteur:A,identite:'Alice',texte:'Texte actuel',revision:2},{id:B,auteur:B,identite:'Bruno',texte:'Texte tiers',revision:1}],demandes:[{id:T,demandeur:A,motif:'Mon motif',etat:'attente',revision:1},{id:B,demandeur:B,motif:'Motif tiers',etat:'attente',revision:1}],invitations:[],transferts:[],actions:[],notifications:[]})
function transport(read){return loadPure('lib/celebration-data.ts','exportCelebrations,ownCelebrationProjection,celebrationService',{...p2Helpers,...contract,celebrationCommand:x=>x,celebrationResult:x=>x,celebrationItems:(x,parse)=>x.items.map(parse),celebrationSummary:x=>x,celebrationInvitation:x=>x,socialRequest:read})}
test('production : export reconstruit avec textes actuels et sans contributions ou motifs tiers',async()=>{
  let pages=0
  const old=row();old.commentaires[0].texte='Texte obsolète';old.celebration.titre='Ancien titre'
  const api=transport(async(owner,url)=>url.includes('/export?')?{items:pages++===0?[old]:[]}:row())
  const result=await api.exportCelebrations(A)
  assert.equal(result[0].celebration.titre,'Titre courant');assert.equal(result[0].commentaires[0].texte,'Texte actuel')
  assert.equal(result[0].participants.length,1);assert.equal(result[0].taches.length,1);assert.equal(result[0].taches[0].responsable,null);assert.equal(result[0].demandes.length,1)
  assert.doesNotMatch(JSON.stringify(result),/Texte tiers|Motif tiers|Tâche tierce|obsolète|Ancien titre/)
})
test('production : changement de destinataire masque les cadeaux, surprise ou révocation annulent tout export',async()=>{
  const api=transport(async()=>{})
  const ordinary=row();ordinary.celebration.destinataire=A
  assert.equal(api.ownCelebrationProjection(ordinary,A).taches.length,0)
  ordinary.celebration.surprise=true;assert.throws(()=>api.ownCelebrationProjection(ordinary,A),/accès/i)
  let pages=0
  const revoked=transport(async(owner,url)=>{if(url.includes('/export?'))return {items:pages++===0?[row()]:[]};throw Object.assign(new Error('Révoqué'),{status:404})})
  await assert.rejects(revoked.exportCelebrations(A),/Révoqué/)
})
test('production : interblocage, verrou occupé et résultat incertain gardent un statut exact',()=>{
  const api=loadPure('lib/celebration-server.ts','celebrationRpcError',{})
  for(const code of ['40P01','55P03','40001','23505']){const e=api.celebrationRpcError(code);assert.equal(e.status,409);assert.match(e.message,/saisie.*conservée/)}
  assert.equal(api.celebrationRpcError('42501').status,404)
  assert.equal(api.celebrationRpcError('P1130').status,429)
  const timeout=api.celebrationRpcError('57014');assert.equal(timeout.status,503);assert.match(timeout.message,/ne peut pas être confirmé/)
})
test('production : révocation invalide une lecture tardive même si le transport ignore AbortSignal',async()=>{
  let resolve,signal
  const source=harness('components/celebrations/CelebrationExperience.tsx',{extra:'\nexport function QueryFixture(){return useQuery(globalThis.loader)}',globals:{loader:s=>{signal=s;return new Promise(r=>{resolve=r})}},overrides:{'@/lib/celebration-data':{celebrationService:{}}}})
  try{
    let state=source.render({},'QueryFixture');await source.flush();state=source.render({},'QueryFixture')
    state.invalidate();assert.equal(signal.aborted,true);resolve(row());await source.flush();state=source.render({},'QueryFixture')
    assert.equal(state.data,null);assert.match(state.error,/indisponible/)
  }finally{source.unmount()}
})
test('production : conflit conserve le réessai, refus de droits le purge et retire le contenu',async()=>{
  let denied=409,sequence=0,invalidations=0;const calls=[]
  const api={commander:async(owner,command)=>{calls.push(command);if(denied)throw Object.assign(new Error(denied===409?'Conflit':'Révoqué'),{status:denied});return {ok:true,id:C}}}
  const ui=harness('components/celebrations/CelebrationExperience.tsx',{extra:`\nexport function ActionFixture(){return useActions('${A}',globalThis.api,()=>{},globalThis.invalidate)}`,overrides:{'@/lib/celebration-data':{celebrationService:api}},globals:{api,invalidate:()=>invalidations++,crypto:{randomUUID:()=>`64000000-0000-4000-8000-${String(++sequence).padStart(12,'0')}`}}})
  let actions=ui.render({},'ActionFixture');await ui.flush()
  const data={id:C,commentaire:T,texte:'Mon texte privé'}
  await assert.rejects(actions.run('commenter',data),/Conflit/);assert.equal(invalidations,0)
  denied=0;actions=ui.render({},'ActionFixture');await actions.run('commenter',data)
  assert.equal(calls[0].operation,calls[1].operation)
  denied=404;data.texte='Autre texte privé'
  await assert.rejects(actions.run('commenter',data),/Révoqué/);assert.equal(invalidations,1)
  denied=0;actions=ui.render({},'ActionFixture');await actions.run('commenter',data)
  assert.notEqual(calls[2].operation,calls[3].operation);ui.unmount()
})

test('pilote : modifier une tâche sans responsable conserve ce choix pour organisateur et auteur participant',async()=>{
 for(const role of ['organisateur','participant']){
  const detail=row();detail.celebration.role=role;const task={...detail.taches[0],responsable:null};const calls=[]
  const ui=harness('components/celebrations/CelebrationExperience.tsx',{extra:'\nexport {TaskForm}',overrides:{'@/lib/celebration-data':{celebrationService:{}},'@/components/DashboardUserContext':{useDashboardUser:()=>({id:A})}}})
  try{
   const tree=ui.render({task,detail,run:async(action,data)=>calls.push({action,data})},'TaskForm');await ui.flush()
   if(role==='organisateur')assert.equal(ui.find(n=>n.type==='select'&&n.props.name==='responsable').props.defaultValue,'')
   const values=new FormData();for(const [name,value] of Object.entries({titre:'Titre modifié',etat:'faite',echeance:'',responsable:''}))values.set(name,value)
   await tree.props.save(values)
   assert.equal(calls[0].action,'modifier_tache');assert.equal(calls[0].data.responsable,null);assert.equal(calls[0].data.etat,'faite')
  }finally{ui.unmount()}
 }
})
