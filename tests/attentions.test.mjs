import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPure, p2Helpers, pageDatabase } from './p2-helpers.mjs'
import { harness } from './ui-harness.mjs'

const money = loadPure('lib/attention-utils.ts', 'parseCents,centsInput,money,decimalMoney,merchantLink,attentionError')
const consent = loadPure('lib/ai-consent.ts', 'AI_CONTACT_FIELDS,consentInput,contactAIContext')
test('centimes : précision décimale, zéro distinct de l’inconnu et limite sûre exacte', () => {
  assert.equal(money.parseCents('0,29'),29)
  assert.equal(money.parseCents('10.1'),1010)
  assert.equal(money.parseCents(''),null)
  assert.equal(money.parseCents('0'),0)
  assert.equal(money.parseCents('90071992547409.91'),Number.MAX_SAFE_INTEGER)
  for (const invalid of ['90071992547409.92','-1','1e3','1.001','NaN','1 000']) assert.throws(() => money.parseCents(invalid))
  assert.equal(money.centsInput(Number.MAX_SAFE_INTEGER),'90071992547409.91')
  assert.equal(money.decimalMoney('180143985094819.82','CHF'),'180 143 985 094 819,82 CHF')
  assert.equal(money.money(null,'EUR'),'Montant inconnu')
  assert.equal(money.money(0,'EUR'),'0,00 EUR')
})
test('liens : http/https absolus acceptés, HTML, protocoles dangereux et identifiants refusés', () => {
  for (const value of ['https://example.invalid/a?x=1&y=2','http://localhost:8080/path']) assert.equal(money.merchantLink(value),value)
  assert.equal(money.merchantLink('HTTPS://example.invalid/#gift'),'https://example.invalid/#gift')
  assert.equal(money.merchantLink(''),null)
  for (const value of ['javascript:alert(1)','data:text/html,x','//example.invalid','/a','https://a@b.invalid','https://a.invalid:0','https://a.invalid:65536','https://a.invalid/<img>','https://a.invalid/ a','https://a.invalid/"','https://a.invalid/\\test','https://a.invalid\n/path']) assert.throws(() => money.merchantLink(value))
})
test('consentement : liste fermée, refus par défaut, chaque champ séparé et âge seul sans naissance exacte', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(consent.consentInput({contactId:1,note:'secret',consentFields:[]}))),{})
  assert.deepEqual(JSON.parse(JSON.stringify(consent.consentInput({contactId:1,consentFields:['email','note','note','age']}))),{contactId:1,consentFields:['age','note']})
  const contact={prenom:'Alex',note:'Adore les livres',date_naissance:'2000-10-07',email:'PRIVATE'}
  assert.equal(consent.contactAIContext(contact,['age'],'2026-10-06').age,25)
  assert.equal(consent.contactAIContext(contact,['age'],'2026-10-07').age,26)
  assert.equal(JSON.stringify(consent.contactAIContext(contact,['note'],'2026-10-06')),'{"note":"Adore les livres"}')
  assert.equal(JSON.stringify(consent.contactAIContext({...contact,date_naissance:'1900-10-07'},['age'],'2026-10-06')),'{}')
})
test('IA serveur : rien lu sans consentement ; propriétaire vérifié, champs étrangers refusés', async () => {
  let reads=0
  const db=pageDatabase({contacts:[{id:1,user_id:'A',prenom:'Alex',note:'NOTE_A',date_naissance:'2000-10-07'},{id:2,user_id:'B',prenom:'Bob',note:'NOTE_B'}]},{onRead(){reads++}})
  db.from = ((from) => table => { const q=from(table); q.single=q.maybeSingle; return q })(db.from)
  const server=loadPure('lib/ai-consent-server.ts','personalAIContext',{...consent,supabaseAdmin:db,parisDay:()=> '2026-10-06'})
  assert.equal(await server.personalAIContext({contactId:1,note:'HOSTILE'},'A'),'');assert.equal(reads,0)
  const result=await server.personalAIContext({contactId:1,consentFields:['age'],note:'HOSTILE'},'A')
  assert.ok(result.includes('"age":25')); for(const value of ['NOTE_A','Alex','2000-10-07','HOSTILE'])assert.ok(!result.includes(value))
  await assert.rejects(server.personalAIContext({contactId:2,consentFields:['note']},'A'),/inaccessible/)
})
function writeDB() {
  const rows={idees_cadeaux:[],choix_cadeaux:[],cadeaux_offerts:[]}
  let owner='A', loseNext=false, inserts=0
  const db={ auth:{getUser:async()=>({data:{user:{id:owner}},error:null})}, from(table) {
    const filters=[];let values,action='read',single=false
    const q={
      select:()=>q,eq:(k,v)=>{filters.push(row=>row[k]===v);return q},
      maybeSingle:()=>{single=true;return q},single:()=>{single=true;return q},
      insert:v=>{values=v;action='insert';return q},update:v=>{values=v;action='update';return q},delete:()=>{action='delete';return q},
      then(resolve) {
        let found=rows[table].filter(row=>filters.every(filter=>filter(row)))
        if(action==='insert'){inserts++; const row={...values,revision:1};rows[table].push(row);found=[row]}
        if(action==='update'){ if('preparation_id' in values) return Promise.resolve({data:null,error:{code:'42501'}}).then(resolve); found.forEach(row=>Object.assign(row,values)) }
        if(action==='delete') rows[table]=rows[table].filter(row=>!found.includes(row))
        if(action!=='read' && loseNext){loseNext=false;return Promise.resolve({data:null,error:{code:'NETWORK'}}).then(resolve)}
        return Promise.resolve({data:single?(found[0]?{...found[0]}:null):found.map(row=>({...row})),error:single&&!found.length&&action!=='read'?{code:'PGRST116'}:null}).then(resolve)
      }
    };return q
  }}
  return {db,rows,setOwner:id=>{owner=id},lose:()=>{loseNext=true},insertCount:()=>inserts}
}
test('idée créée sans événement : retry réseau retrouve le même UUID et garde la note', async () => {
  const mock=writeDB(), api=loadPure('lib/attention-data.ts','saveAttention,requireOwner',{supabase:mock.db})
  mock.lose()
  await assert.rejects(api.saveAttention('idees_cadeaux','A','idea-1',null,{titre:'Livre',note:'Privé'}))
  const result=await api.saveAttention('idees_cadeaux','A','idea-1',null,{titre:'Livre',note:'Privé'})
  assert.equal(result.note,'Privé'); assert.equal(mock.insertCount(),1); assert.equal(mock.rows.idees_cadeaux.length,1)
})
test('révisions : modification concurrente refusée, compte changé refusé et filtre propriétaire réel', async () => {
  const mock=writeDB(), api=loadPure('lib/attention-data.ts','saveAttention,requireOwner,removeAttention',{supabase:mock.db})
  mock.rows.choix_cadeaux.push({id:'c',user_id:'A',preparation_id:'p',titre:'Livre',revision:1})
  await api.saveAttention('choix_cadeaux','A','c',1,{titre:'Roman'})
  await assert.rejects(api.saveAttention('choix_cadeaux','A','c',1,{titre:'Écrasement'}),e=>e.code==='PGRST116')
  assert.equal(mock.rows.choix_cadeaux[0].titre,'Roman')
  mock.setOwner('B')
  await assert.rejects(api.saveAttention('choix_cadeaux','A','c',2,{titre:'Vol'}),/session a changé/)
  await assert.rejects(api.saveAttention('choix_cadeaux','B','c',2,{titre:'Vol'}),e=>e.code==='PGRST116')
  await assert.rejects(api.removeAttention('choix_cadeaux','B','c'))
  assert.equal(mock.rows.choix_cadeaux.length,1)
})
test('export version 5 : les cinq objets du lot 04/05 sont inclus et isolés par propriétaire', async () => {
  const tables=['preparations_evenements','taches_preparation','idees_cadeaux','choix_cadeaux','cadeaux_offerts']
  const data=Object.fromEntries(tables.map(table=>[table,[{id:'a',user_id:'A',note:'A_PRIVATE'},{id:'b',user_id:'B',note:'B_PRIVATE'}]]))
  const db=pageDatabase(data,{cap:1});db.auth={getUser:async()=>({data:{user:{id:'A'}}})}
  const api=loadPure('lib/user-data.ts','exportOwnData,readOwnRows',{...p2Helpers,supabase:db})
  const exported=await api.exportOwnData()
  for(const table of tables){assert.equal(exported[table].length,1);assert.equal(exported[table][0].user_id,'A')}
  assert.ok(!JSON.stringify(exported).includes('B_PRIVATE'))
})
test('formulaire : erreur conserve la saisie, pas de faux succès, retry explicite', async () => {
  let saved=0, calls=0, fail=true
  class FormDataMock {constructor(node){this.data=node.data}get(key){return this.data[key]}}
  const h=harness('components/AttentionShared.tsx',{overrides:{'./ContactDraftProvider':{useContactDraft:()=>({registerPrivateDraft(){}})}},globals:{FormData:FormDataMock,window:{addEventListener(){},removeEventListener(){}}}})
  const props={children:'Note privée',onSaved:()=>saved++,save:async data=>{calls++;assert.equal(data.get('note'),'Privé');if(fail)throw {code:'40001'}}}
  h.render(props,'EditForm')
  const submit=()=>h.find(n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:{data:{note:'Privé'}}})
  await submit();h.render(props,'EditForm')
  assert.equal(saved,0);assert.match(h.text(),/Ta saisie est conservée/);assert.match(h.text(),/non enregistrées/)
  fail=false;await submit();h.render(props,'EditForm')
  assert.equal(saved,1);assert.equal(calls,2);assert.ok(!h.text().includes('non enregistrées'))
})
test('consentement UI : trois cases décochées, sélection indépendante et désactivation pendant appel', () => {
  const h=harness('components/AIConsent.tsx')
  let selected=[]
  h.render({fields:[],onChange:fields=>{selected=fields}})
  const checks=h.nodes().filter(n=>n.type==='input')
  assert.equal(checks.length,3);assert.ok(checks.every(n=>n.props.checked===false))
  checks[2].props.onChange({target:{checked:true}});assert.deepEqual(Array.from(selected),['note'])
  h.render({fields:selected,onChange:fields=>{selected=fields},disabled:true})
  assert.equal(h.find(n=>n.type==='fieldset').props.disabled,true)
})

test('préparation : occurrence précise stable après report, historique conservé, année suivante distincte', async () => {
  const tables={
    occurrences_evenements:[{id:'o1',user_id:'A',evenement_id:'event',cycle:2026,date_occurrence:'2026-11-05'},{id:'o2',user_id:'A',evenement_id:'event',cycle:2027,date_occurrence:'2027-11-05'}],
    evenements_personnels:[{id:'event',user_id:'A',contact_id:null,titre:'Attention'}],
    taches_preparation:[{id:'task',user_id:'A',preparation_id:'prep-o1',etat:'faite',brouillon_texte:'Privé'}],
  }
  const db=pageDatabase(tables,{cap:1})
  const from=db.from;db.from=table=>{const query=from(table);query.single=query.maybeSingle;return query}
  db.auth={getUser:async()=>({data:{user:{id:'A'}}})}
  const preps=new Map()
  db.rpc=async(name,args)=>{
    assert.equal(name,'ouvrir_preparation_lot04')
    if(!preps.has(args.p_occurrence))preps.set(args.p_occurrence,{id:'prep-'+args.p_occurrence,user_id:'A',occurrence_id:args.p_occurrence,etat:'ouverte',revision:1})
    return {data:preps.get(args.p_occurrence),error:null}
  }
  const api=loadPure('lib/attention-data.ts','loadPreparation,requireOwner',{supabase:db,...p2Helpers})
  const first=await api.loadPreparation('A','o1')
  const same=await api.loadPreparation('A','o1')
  assert.equal(first.preparation.id,same.preparation.id);assert.equal(preps.size,1)
  tables.occurrences_evenements[0].date_occurrence='2027-01-03'
  tables.evenements_personnels[0].titre='Renommé'
  const moved=await api.loadPreparation('A','o1')
  assert.equal(moved.preparation.id,first.preparation.id);assert.equal(moved.occurrence.cycle,2026)
  assert.equal(moved.occurrence.date_occurrence,'2027-01-03');assert.equal(moved.event.titre,'Renommé')
  const next=await api.loadPreparation('A','o2')
  assert.notEqual(next.preparation.id,first.preparation.id);assert.equal(next.tasks.length,0)
  assert.equal((await api.loadPreparation('A','o1')).tasks[0].brouillon_texte,'Privé')
  await assert.rejects(api.loadPreparation('B','o1'),/session a changé/)
})
test('tâche message : sauvegarde explicite avec révision attendue et aucun champ de livraison', async () => {
  const calls=[]
  const task={id:'task',revision:7,type_tache:'message',titre:'Message',etat:'a_faire',brouillon_texte:'Privé'}
  const h=harness('components/PreparationScreen.tsx',{extra:'\nexport { TaskEditor };',overrides:{
    './DashboardUserContext':{useDashboardUser:()=>({id:'A'})},
    '@/lib/attention-data':{requireOwner:async owner=>assert.equal(owner,'A')},
    '@/lib/supabase-browser':{supabase:{rpc:async(name,args)=>{calls.push({name,args});return {data:{...task,revision:8},error:null}}}},
  }})
  h.render({task,onSaved(){}},'TaskEditor')
  const form=h.find(n=>typeof n.props.save==='function')
  assert.equal(calls.length,0)
  const values={title:'Message',draft:'Texte prêt',state:'faite'}
  await form.props.save({get:key=>values[key]})
  assert.equal(calls[0].name,'enregistrer_tache_lot04')
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].args)),{p_id:'task',p_revision:7,p_titre:'Message',p_brouillon:'Texte prêt',p_etat:'faite'})
  assert.match(h.text(),/Aucun envoi ni livraison/)
})

test('rappel depuis la préparation : occurrence exacte après report, aucune autre occurrence substituée', async () => {
  const calls=[]
  let views=[
    {contact:{id:1},kind:'anniversaire',date:'2026-11-05',occurrence:{id:'other',revision:1,date_occurrence:'2026-11-05'}},
    {contact:{id:1},kind:'anniversaire',date:'2027-01-03',occurrence:{id:'target',revision:2,date_occurrence:'2027-01-03'}},
  ]
  const h=harness('components/ProgrammerRappel.tsx',{overrides:{
    '@/lib/hooks/usePersonalEvents':{usePersonalEvents:()=>({views,data:{events:[]},loading:false,error:''})},
    '@/lib/rappels':{programmerMessage:async params=>calls.push(params)},
  }})
  const props={session:{user:{id:'A'}},selectedContact:{id:1,prenom:'Camille',nom:'Martin'},message:'Prêt',tone:'familier',eventType:'anniversaire',occurrenceId:'target'}
  h.render(props)
  const action=h.nodes().find(n=>typeof n.props.onClick==='function'&&h.text(n).includes('Programmer'))
  assert.ok(action)
  await action.props.onClick()
  assert.equal(calls.length,1);assert.equal(calls[0].occurrence.id,'target');assert.equal(calls[0].occurrence.revision,2)
  assert.equal(calls[0].eventDate,'2027-01-03')
  views=views.slice(0,1)
  const blocked=harness('components/ProgrammerRappel.tsx',{overrides:{
    '@/lib/hooks/usePersonalEvents':{usePersonalEvents:()=>({views,data:{events:[]},loading:false,error:''})},
    '@/lib/rappels':{programmerMessage:async params=>calls.push(params)},
  }})
  blocked.render(props)
  await blocked.nodes().find(n=>typeof n.props.onClick==='function'&&blocked.text(n).includes('Programmer')).props.onClick()
  assert.equal(calls.length,1)
})
test('budget : limites civiles mensuelles et annuelles, décembre et années invalides', () => {
  const fn=harness('components/BudgetScreen.tsx',{overrides:{'@/lib/supabase-browser':{supabase:{}}}}).component
  assert.equal(JSON.stringify(fn.budgetWindow('2026-12','month')),'{"start":"2026-12-01","end":"2027-01-01"}')
  assert.equal(JSON.stringify(fn.budgetWindow('2028-02','year')),'{"start":"2028-01-01","end":"2029-01-01"}')
  for(const period of ['2026-13','0000-01','9999-01','2026-02-03'])assert.throws(()=>fn.budgetWindow(period,'month'))
})
