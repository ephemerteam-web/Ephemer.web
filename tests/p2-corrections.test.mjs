import assert from 'node:assert/strict'
import test from 'node:test'
import { loadPure, p2Helpers as h, pageDatabase } from './p2-helpers.mjs'

test('préférences : défauts confirmés, valeurs enregistrées préservées, J-3 basculable', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(h.resolvePreferences(null))), { canal_email: true, canal_push: false, rappel_j7: true, rappel_j3: true, rappel_j1: false, rappel_jourj: true, newsletter_mensuelle: false })
  assert.equal(h.resolvePreferences({ rappel_j3: false, canal_email: false }).rappel_j3, false)
  const policy = loadPure('lib/reminder-policy.ts', 'enabledMilestones',h)
  assert.ok(policy.enabledMilestones({ rappel_j3: true }).some(p => p.jours === 3 && p.enabled))
  assert.ok(!policy.enabledMilestones({ rappel_j3: false }).some(p => p.jours === 3 && p.enabled))
})
test('relation historique amis et occasions cadeaux partagent les constantes', () => {
  assert.equal(h.normalizeRelation('amis'), 'ami')
  for (const occasion of h.TYPES_EVENEMENT) assert.ok(h.giftOccasion(occasion.value))
  assert.equal(h.giftOccasion('fete_prenom'), h.giftOccasion('fete_prenomale'))
  assert.equal(h.giftOccasion('inconnu'), null)
})
test('occurrence civile : 29 février, changements de siècle et années 1–9999', () => {
  for (const [year, expected] of [[2024,'2024-02-29'],[2025,'2025-03-01'],[2100,'2100-03-01'],[2000,'2000-02-29'],[1,'0001-03-01'],[9999,'9999-03-01']]) assert.equal(h.birthdayInYear('2000-02-29',year), expected)
  assert.equal(h.nextBirthdayDay('2000-02-29','2025-03-02'), '2026-03-01')
  assert.throws(() => h.birthdayInYear('2000-02-29',0))
})
test('API mensuelle : limites, paramètres présents invalides et minuit UTC', () => {
  for (const invalid of ['mois=12','mois=-1','mois=','mois=2.5','annee=0','annee=10000','annee=NaN','annee=']) assert.throws(() => h.requestedMonth(new URLSearchParams(invalid),'2025-03-01'))
  assert.deepEqual(JSON.parse(JSON.stringify(h.requestedMonth(new URLSearchParams(),'2025-03-01'))),{ mois: 2, annee: 2025 })
  const contact = { id: 1, prenom: 'SansSaintXYZ', date_naissance: '2000-02-29' }
  assert.equal(h.monthEvents([contact],1,2025).length,0)
  const event = h.monthEvents([contact],2,2025)[0]
  assert.equal(event.jour,1); assert.equal(event.dateComplete,'2025-03-01T00:00:00.000Z')
})
test('cadeaux : éliminer les idées inutilisables et limiter à six', () => {
  const valid = { idee: ' Livre ', raison: ' Lecture ', categorie: 'loisir', recherche: ' livre ' }
  for (const value of [null,{},[],[{ ...valid, idee: ' ' }],[{ ...valid, categorie: 'xxx' }],[{ ...valid, recherche: null }]]) assert.equal(h.usableGiftIdeas(value).length,0)
  assert.equal(h.usableGiftIdeas(Array(12).fill(valid)).length,0)
  assert.equal(h.usableGiftIdeas([valid])[0].idee,'Livre')
})
test('API cadeaux : JSON invalide, tableau vide et idées rejetées renvoient 502 ; chaque occasion réussit', async () => {
  const valid = { idee:'Livre', raison:'Lecture', categorie:'loisir', recherche:'livre' }
  for (const [content,status] of [['{incorrect',502],['[]',502],[JSON.stringify([{...valid,raison:''}]),502],[JSON.stringify([valid]),200]]) {
    const { POST } = loadPure('app/api/generate-gift-ideas/route.ts','POST',{
      ...h, verifierGardeIA:async()=>({ok:true}), process:{env:{}}, AbortSignal,
      NextResponse:{json:(body,options)=>({body,status:options?.status??200})},
      fetch:async()=>Response.json({choices:[{message:{content}}]}),console:{error(){},log(){}}
    })
    for (const occasion of [...h.TYPES_EVENEMENT.map(o=>o.value),'fete_prenom']) {
      const response=await POST(new Request('https://test.invalid', { method: 'POST', body: JSON.stringify({eventType:occasion,relation:'amis'}) }))
      assert.equal(response.status,status)
      if(status===200) assert.equal(response.body.ideas.length,1)
    }
  }
})
test('API mensuelle : authentification, paramètres invalides et erreur après plusieurs lots', async () => {
  const rows=Array.from({length:1205},(_,id)=>({id,user_id:'u1',prenom:'SansSaintXYZ',date_naissance:'2000-02-29'}))
  const db=pageDatabase({contacts:rows},{cap:41})
  db.auth={getUser:async()=>({data:{user:{id:'u1'}},error:null})}
  const ctx={...h,supabaseAdmin:db,parisDay:()=> '2025-03-01',NextResponse:{json:(body,options)=>({body,status:options?.status??200})}}
  const {GET}=loadPure('app/api/evenements-mois/route.ts','GET',ctx)
  const request=(params='',token=true)=>({headers:new Headers(token?{authorization:'Bearer synthetic'}:{}),nextUrl:new URL('https://test.invalid/?'+params)})
  assert.equal((await GET(request('',false))).status,401)
  assert.equal((await GET(request('annee=0'))).status,400)
  const result=await GET(request()); assert.equal(result.status,200); assert.equal(result.body.evenements.length,1205)
  assert.equal(result.body.evenements[0].dateComplete,'2025-03-01T00:00:00.000Z')
  const failed=pageDatabase({contacts:rows},{cap:41,failAt:4}); failed.auth=db.auth
  const broken=loadPure('app/api/evenements-mois/route.ts','GET',{...ctx,supabaseAdmin:failed})
  const error=await broken.GET(request()); assert.equal(error.status,500); assert.equal(error.body.evenements,undefined)
})
test('collections : 1 205 lignes avec un plafond de 37, arrêt seulement à vide', async () => {
  const rows = Array.from({length:1205},(_,id) => ({id, relation:'amis'})), lengths=[]
  const db = pageDatabase({ contacts:rows },{cap:37,onRead:page=>lengths.push(page.length)})
  const data = await h.readAllRows(()=>db.from('contacts').select('*'))
  assert.equal(data.length,1205); assert.equal(data[0].relation,'ami'); assert.equal(lengths.at(-1),0)
})
test('file mutable : chaque statut traité une fois ; erreur tardive explicite', async () => {
  const rows = Array.from({length:1205},(_,id)=>({id,statut:'programme'})), db = pageDatabase({ rappels:rows },{cap:53})
  let count=0
  for await (const page of h.readPages(()=>db.from('rappels').select('*').eq('statut','programme'))) { for (const row of page) row.statut='envoye'; count+=page.length }
  assert.equal(count,1205)
  const failed = pageDatabase({contacts:rows},{cap:45,failAt:4})
  const result = await h.readAllResult(()=>failed.from('contacts').select('*'))
  assert.equal(result.data,null); assert.match(result.error.message,/incomplet/)
})
test('validation globale et correspondances internes/externes sans fusion', () => {
  const q=loadPure('lib/contact-quality.ts','validateContactBatch,contactMatches',h)
  const input=[{prenom:'Jean',email:'invalide',date_naissance:'2025-02-29'},{prenom:'',email:'ok@example.invalid'}]
  assert.equal(q.validateContactBatch(input,email=>email.includes('@')).length,3)
  const lot=[{prenom:'Hélène',nom:'Martin'},{prenom:'helene',nom:'Martin',email:'shared@example.invalid'}]
  assert.equal(q.contactMatches(lot,[{prenom:'Autre',email:'shared@example.invalid'}]).length,2)
  assert.equal(lot.length,2)
})
test('brouillon versionné : expiration, consultation, effacement et stockage indisponible', () => {
  const d=loadPure('lib/invitation-drafts.ts','DRAFT_TTL,purgeInvitationDrafts,restoreInvitationDraft,saveInvitationDraft,eraseInvitationDraft')
  const map=new Map(), storage={get length(){return map.size},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}
  const data={prenom:'Test',nom:'',jour:'',mois:'',annee:'',relation:'ami',noteLibre:'',email:'',indicatif:'+33',tel:'',interets:[]}
  assert.equal(d.saveInvitationDraft(storage,'test',data,10),true)
  const raw=map.get('invitation-test')
  assert.equal(d.restoreInvitationDraft(storage,'test',20).prenom,'Test')
  d.saveInvitationDraft(storage,'test',data,25); assert.equal(map.get('invitation-test'),raw)
  d.saveInvitationDraft(storage,'test',{...data,nom:'Edité'},30)
  map.set('invitation-legacy',JSON.stringify(data)); map.set('invitation-invalid','xxx')
  d.purgeInvitationDrafts(storage,30+d.DRAFT_TTL); assert.equal(map.size,0)
  d.saveInvitationDraft(storage,'test',data,40); d.eraseInvitationDraft(storage,'test'); assert.equal(map.size,0)
  const blocked={get length(){throw new Error()},getItem(){throw new Error()},setItem(){throw new Error()}}
  assert.equal(d.saveInvitationDraft(blocked,'x',data),false); assert.equal(Object.keys(d.restoreInvitationDraft(blocked,'x')).length,0)
})
