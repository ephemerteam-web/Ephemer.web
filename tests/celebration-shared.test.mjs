import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPure, p2Helpers } from './p2-helpers.mjs'
import { harness } from './ui-harness.mjs'
const contract=loadPure('lib/celebration-contract.ts','CELEBRATIONS_ENABLED,CELEBRATION_ACTIONS,celebrationUuid,celebrationCommand,celebrationResult,celebrationItems,celebrationSummary,celebrationInvitation,celebrationDetail',{...p2Helpers,TextEncoder})
const A='21000000-0000-4000-8000-000000000001', B='21000000-0000-4000-8000-000000000002', C='21000000-0000-4000-8000-000000000003'
const create=()=>({action:'creer',operation:B,donnees:{id:C,titre:'Repas entre amis',date:null,heure:null,lieu:null,mode:'partage',surprise:false,destinataire:null}})
const summary=()=>({id:C,titre:'Repas entre amis',date:null,dateCanonique:null,heure:null,lieu:null,mode:'partage',surprise:false,destinataire:null,etat:'active',revision:1,role:'organisateur',maintenance:false})
const detail=()=>({celebration:summary(),participants:[],taches:[],commentaires:[],invitations:[],transferts:[],demandes:[],actions:[],notifications:[]})

test('B : activation pilote en développement seulement et création sans date sans occurrence fictive',()=>{
  assert.equal(contract.CELEBRATIONS_ENABLED,false)
  for(const [environment,expected] of [['development',true],['production',false],['test',false]]){
    const activation=loadPure('lib/celebration-contract.ts','CELEBRATIONS_ENABLED',{...p2Helpers,TextEncoder,process:{env:{NODE_ENV:environment}}})
    assert.equal(activation.CELEBRATIONS_ENABLED,expected)
  }
  assert.equal(contract.celebrationCommand(create()).donnees.date,null)
  assert.equal('occurrenceId' in contract.celebrationCommand(create()).donnees,false)
  for(const changes of [{date:'2026-02-30'},{heure:'24:00'},{surprise:null},{titre:''},{destinataire:'email@example.invalid'}])assert.throws(()=>contract.celebrationCommand({...create(),donnees:{...create().donnees,...changes}}))
  assert.throws(()=>contract.celebrationCommand({...create(),donnees:{...create().donnees,userId:A}}))
  assert.throws(()=>contract.celebrationCommand({...create(),donnees:{...create().donnees,surprise:true}}))
  assert.equal(contract.celebrationCommand({...create(),donnees:{...create().donnees,titre:'🎉'.repeat(200)}}).donnees.titre.length,400)
  assert.throws(()=>contract.celebrationCommand({...create(),donnees:{...create().donnees,titre:'🎉'.repeat(201)}}))
  assert.throws(()=>contract.celebrationCommand({...create(),donnees:{...create().donnees,titre:'Repas\u0000'}}))
})
test('B : projection de publication fermée, confirmation explicite et sélection sans doublon',()=>{
  const command={...create(),action:'publier',donnees:{...create().donnees,preparation:A,taches:[B],apercuSource:{date:'2026-12-20',taches:[{id:B,titre:'Carte sélectionnée',type:'message'}]},confirmer:true}}
  assert.equal(contract.celebrationCommand(command).donnees.taches.length,1)
  for(const changes of [{confirmer:false},{taches:[B,B]},{note:'Ne pas publier'},{budget:9000},{brouillon:'Privé'}])assert.throws(()=>contract.celebrationCommand({...command,donnees:{...command.donnees,...changes}}))
  for(const apercuSource of [{date:'2026-12-20',taches:[]},{date:'2026-02-30',taches:[]},{date:'2026-12-20',taches:[{id:C,titre:'Autre tâche',type:'message'}]},{date:'2026-12-20',taches:[{id:B,titre:'Carte',type:'message',brouillon:'privé'}]}])assert.throws(()=>contract.celebrationCommand({...command,donnees:{...command.donnees,apercuSource}}))
})
test('B : motifs et contenu tiers inattendu refusés à la frontière de réponse',()=>{
  assert.equal(contract.celebrationDetail(detail()).celebration.id,C)
  assert.throws(()=>contract.celebrationDetail({...detail(),sourcePrivee:'Privée'}))
  assert.throws(()=>contract.celebrationDetail({...detail(),commentaires:[{id:A,auteur:B,revision:1,texte:'Texte',identite:'Étoile',motif:'privé'}]}))
  assert.throws(()=>contract.celebrationSummary({...summary(),token:'Interdit'}))
})
function server(factory,enabled=true){return loadPure('lib/celebration-server.ts','celebrationEndpoint,CelebrationHTTPError',{...contract,limitedJSON:async request=>request.json(),Response,URL,AbortSignal,CELEBRATIONS_ENABLED:enabled,celebrationTransport:factory}).celebrationEndpoint}
const request=(method='GET',body,path='')=>new Request('https://ephemer.invalid/api/celebrations'+path,{method,headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})
test('B API : inactive, sans session ou origine externe, aucun accès DB',async()=>{
  let calls=0;const factory=()=>{calls++;return {verify:async()=>null,rpc:async()=>{throw new Error('Ne pas appeler')}}}
  const endpoint=server(factory,false)
  assert.equal((await endpoint(request(),'liste',factory,false)).status,503)
  assert.equal(calls,0)
  assert.equal((await endpoint(new Request('https://ephemer.invalid/api/celebrations'),'liste',factory,true)).status,401)
  const external=request();external.headers.set('Origin','https://external.invalid');assert.equal((await endpoint(external,'liste',factory,true)).status,403)
  assert.equal((await endpoint(request(),'liste',factory,true)).status,401)
})
test('B API : contrat validé avant commande, JWT vérifié et résultat minimal',async()=>{
  const calls=[],factory=()=>({verify:async()=>({id:A,email_confirmed_at:'2026-01-01'}),rpc:async(name,args)=>{calls.push({name,args});return {ok:true,id:C}}})
  const endpoint=server(factory)
  const rejected=await endpoint(request('POST',{...create(),donnees:{...create().donnees,userId:B}}),'liste',factory,true)
  assert.equal(rejected.status,400);assert.equal(calls.length,0)
  const response=await endpoint(request('POST',create()),'liste',factory,true)
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true,id:C});assert.equal(calls[0].name,'commander_celebrations')
  assert.match(response.headers.get('cache-control'),/no-store/)
  assert.equal(calls[0].args.p_operation,B)
})
test('B API : refus uniformes sans données de surprise ou erreur interne',async()=>{
  const factory=()=>({verify:async()=>({id:A,email_confirmed_at:'2026-01-01'}),rpc:async()=>{throw new Error('Détail interne privé')}})
  const result=await server(factory)(request('GET',undefined,'?id='+C),'detail',factory,true)
  assert.equal(result.status,503);assert.doesNotMatch(JSON.stringify(await result.json()),/privé|interne/)
  const anonymous=()=>({verify:async()=>({id:A,email_confirmed_at:'2026-01-01',is_anonymous:true}),rpc:async()=>detail()})
  assert.equal((await server(anonymous)(request('GET',undefined,'?id='+C),'detail',anonymous,true)).status,401)
})
test('B API : export détaillé une célébration par page, bornes avant lecture',async()=>{
  const calls=[],factory=()=>({verify:async()=>({id:A,email_confirmed_at:'2026-01-01'}),rpc:async(name,args)=>{calls.push({name,args});return {items:[detail()]}}})
  const endpoint=server(factory)
  assert.equal((await endpoint(request(),'export',factory,true)).status,200)
  assert.equal(calls[0].name,'exporter_celebrations');assert.equal(calls[0].args.p_limite,1)
  assert.equal((await endpoint(request('GET',undefined,'?limite=100'),'export',factory,true)).status,400)
  assert.equal(calls.length,1)
  assert.equal((await endpoint(request('GET',undefined,'?apres=autre-compte'),'export',factory,true)).status,400)
  assert.equal(calls.length,1)
})
test('B interface : réseau perdu conserve UUID et charge du réessai, nouveau contenu nouvelle opération',async()=>{
  let fail=true,sequence=0;const calls=[],api={commander:async(owner,command)=>{calls.push(command);if(fail){fail=false;throw new Error('Réponse perdue')}return {ok:true,id:C}}}
  // Appeler le hook exporté avec ses vrais arguments via un petit composant de recette.
  const source=harness('components/celebrations/CelebrationExperience.tsx',{extra:`\nexport function ActionFixture(){return useActions('${A}',globalThis.fixtureAPI,()=>{},()=>{})}`,overrides:{'@/lib/celebration-data':{celebrationService:api}},globals:{fixtureAPI:api,crypto:{randomUUID:()=>`21000000-0000-4000-8000-${String(++sequence).padStart(12,'0')}`}}})
  let actions=source.render({},'ActionFixture');await source.flush()
  await assert.rejects(actions.run('creer',create().donnees),/Réponse perdue/)
  actions=source.render({},'ActionFixture');await actions.run('creer',create().donnees)
  assert.equal(calls[0].operation,calls[1].operation)
  actions=source.render({},'ActionFixture');await actions.run('creer',{...create().donnees,titre:'Autre repas'})
  assert.notEqual(calls[2].operation,calls[1].operation);source.unmount()
})
