// 🧪 Fournisseur entièrement simulé : aucun appel IA, quota ou compte distant.
import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPure, p2Helpers, pageDatabase } from './p2-helpers.mjs'
import { harness } from './ui-harness.mjs'
import { giftRoute } from './cadeaux-test-helpers.mjs'

const amounts = loadPure('lib/attention-utils.ts','CURRENCIES,parseCents,centsInput,merchantLink')
const options = p2Helpers
const gift = loadPure('lib/gift-ideas.ts','giftTitleKey,filterGiftIdeas,usableGiftIdeas',p2Helpers)
const safe = loadPure('lib/ai-privacy.ts','minimalAIInput',p2Helpers)
const idea={idee:'Livre',raison:'Un moment de lecture',categorie:'loisir',recherche:'livre',emoji:'📖'}
const request=body=>new Request('https://test.invalid',{method:'POST',body:JSON.stringify(body)})
function route(name,{context='',responseText,gate={ok:true,userId:'A'},providerResponse}={}) {
  if (name === 'generate-gift-ideas') return giftRoute({responseText,gate,providerResponse})
  const sent=[],seen=[]
  const loaded=loadPure(`app/api/${name}/route.ts`,'POST',{
    ...p2Helpers, MESSAGES_UI:{erreur_genérique:'Erreur'}, AbortSignal,
    verifierGardeIA:async()=>gate,personalAIContext:async(body,owner)=>{seen.push({body,owner});return context},
    NextResponse:{json:(body,opts)=>({body,status:opts?.status??200})},
    fetch:async(url,init)=>{sent.push({url,...init});return providerResponse??Response.json({choices:[{message:{content:responseText??(name==='generate-message'?'Bonne journée !':JSON.stringify([idea]))}}]})},
  })
  return {...loaded,sent,seen}
}
test('options fermées : défauts compatibles et chaque valeur inconnue refusée',()=>{
  assert.equal(options.messageAIOptions({}).length,'short')
  assert.equal(options.messageAIOptions({relation:'pro'}).addressing,'vous')
  for(const input of [{tone:'secret'},{length:'unlimited'},{addressing:'auto'},{emojis:'yes'},{relation:'secret'},{eventType:{}},{eventType:'unknown'}])assert.throws(()=>options.messageAIOptions(input))
  for(const input of [{giftMode:'unknown'},{currency:'JPY'},{budgetCents:1.5},{budgetCents:-1},{budgetCents:Number.MAX_SAFE_INTEGER+1}])assert.throws(()=>options.giftAIOptions(input))
  assert.equal(options.giftAIOptions({giftMode:'no_purchase',budgetCents:900}).budgetCents,0)
  assert.equal(options.giftAIOptions({budgetCents:0}).budgetCents,0)
})
test('message : paramètres réels transmis ; signature et données non consenties exclues',async()=>{
  const api=route('generate-message')
  const body=safe.minimalAIInput({eventType:'mariage',relation:'ami',tone:'poetique',length:'long',addressing:'vous',emojis:true,signature:'SIGNATURE_PRIVEE',firstName:'PRENOM_PRIVE',note:'NOTE_PRIVEE',history:'HISTORIQUE',interests:['tech']})
  const result=await api.POST(request(body));assert.equal(result.status,200)
  const outbound=api.sent[0].body
  assert.match(outbound,/5 à 6/);assert.match(outbound,/vouvoiement/);assert.match(outbound,/emojis/)
  for(const value of ['SIGNATURE_PRIVEE','PRENOM_PRIVE','NOTE_PRIVEE','HISTORIQUE','tech'])assert.ok(!outbound.includes(value))
  assert.equal(options.localMessage(result.body.message,'Alice','Amitiés, Léa'),'Alice, Bonne journée !\n\nAmitiés, Léa')
  assert.equal(options.localMessage(result.body.message,'',''),'Bonne journée !')
})
test('consentement réel : seul le contact du propriétaire et le champ coché atteignent le fournisseur',async()=>{
  const client=pageDatabase({contacts:[{id:1,user_id:'A',prenom:'PRENOM_A',note:'NOTE_A',date_naissance:'2000-10-07'},{id:2,user_id:'B',prenom:'PRENOM_B',note:'NOTE_B'}]})
  client.from=((from)=>table=>{const q=from(table);q.single=q.maybeSingle;return q})(client.from)
  const consent=loadPure('lib/ai-consent-server.ts','personalAIContext',{...p2Helpers,supabaseAdmin:client,parisDay:()=> '2026-10-06'})
  const api=route('generate-message',{context:await consent.personalAIContext({contactId:1,consentFields:['note']},'A')})
  assert.equal((await api.POST(request({contactId:1,consentFields:['note']}))).status,200)
  assert.match(api.sent[0].body,/NOTE_A/);assert.doesNotMatch(api.sent[0].body,/PRENOM_A|2000-10-07|NOTE_B/)
  await assert.rejects(()=>consent.personalAIContext({contactId:2,consentFields:['note']},'A'))
})
test('cadeaux : objectif exact transmis, historique et intérêts exclus, aucune réponse prix acceptée',async()=>{
  const api=route('generate-gift-ideas')
  assert.equal((await api.POST(request(safe.minimalAIInput({budgetCents:amounts.parseCents('0,29'),currency:'CHF',giftMode:'experience',history:'HISTORIQUE',categories:['tech']})))).status,200)
  assert.match(api.sent[0].body,/0.29 CHF/);assert.doesNotMatch(api.sent[0].body,/HISTORIQUE/)
  for(const item of [{...idea,prix:29},{...idea,stock:true},{...idea,livraison:'demain'},{...idea,idee:'Livre à 29 €'},{...idea,raison:'x'.repeat(501)}]){
    const invalid=route('generate-gift-ideas',{responseText:JSON.stringify([item])})
    assert.equal((await invalid.POST(request({}))).status,502)
  }
})
test('limites : requêtes et réponses bornées, JSON/type/vide refusés sans appel supplémentaire',async()=>{
  for(const name of ['generate-message','generate-gift-ideas']){
    const invalid=route(name)
    assert.equal((await invalid.POST(request({note:'x'.repeat(17000)}))).status,413);assert.equal(invalid.sent.length,0)
    assert.equal((await invalid.POST(request({relation:'unknown'}))).status,400);assert.equal(invalid.sent.length,0)
    const denied=route(name,{gate:{ok:false,message:'Quota',status:429}})
    assert.equal((await denied.POST(request({}))).status,429);assert.equal(denied.sent.length,0)
    for(const content of ['',{},'x'.repeat(70000)]){
      const bad=route(name,{providerResponse:Response.json({choices:[{message:{content}}]})})
      assert.equal((await bad.POST(request({}))).status,502)
    }
  }
})
test('lecture en flux : arrêt à la limite, même sans Content-Length',async()=>{
  let cancelled=false
  const response=new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(100));},cancel(){cancelled=true}}))
  await assert.rejects(()=>p2Helpers.limitedJSON(response,20,502));assert.equal(cancelled,true)
})
test('tri local : catégories et historique normalisé, prix inconnu conservé comme inconnu',()=>{
  assert.equal(gift.filterGiftIdeas([idea],['tech'],[],false).length,0)
  assert.equal(gift.filterGiftIdeas([idea],[],['LIVRE !'],true).length,0)
  assert.equal(gift.filterGiftIdeas([idea],[],['Coffret'],true).length,1)
  assert.equal(gift.usableGiftIdeas([{...idea,price:0}]).length,0)
})
test('affiliation : uniquement tag configuré, encodé ; lien marchand valide',()=>{
  for(const tag of ['', 'test-21&injection=x']){
    const config=loadPure('lib/gift-config.ts','marchandsPourCategorie',{process:{env:{NEXT_PUBLIC_AMAZON_TAG:tag}}})
    const amazon=config.marchandsPourCategorie('loisir').find(m=>m.id==='amazon')
    const url=new URL(amazon.url('livre & café'))
    assert.equal(amazon.affilie,Boolean(tag));assert.equal(url.searchParams.get('tag'),tag||null)
    assert.equal(url.searchParams.get('injection'),null);assert.ok(amounts.merchantLink(url.href))
    for (const merchant of config.marchandsPourCategorie()) assert.ok(amounts.merchantLink(merchant.url("thé & atelier d'art")))
  }
})
test('bibliothèque : plafond exact, devises séparées et inconnu distinct du zéro',async()=>{
  const db=pageDatabase({contacts:[],idees_cadeaux:[
    {id:'1',user_id:'u1',titre:'Gratuit',archivee:false,contact_id:null,prix_estime_centimes:0,devise_estimee:'EUR'},
    {id:'2',user_id:'u1',titre:'Inconnu',archivee:false,contact_id:null,prix_estime_centimes:null,devise_estimee:'EUR'},
    {id:'3',user_id:'u1',titre:'USD',archivee:false,contact_id:null,prix_estime_centimes:10,devise_estimee:'USD'},
  ]})
  const h=harness('components/GiftLibrary.tsx',{overrides:{'@/lib/supabase-browser':{supabase:db},'@/components/ContactDraftProvider':{useContactDraft:()=>({hasPrivateDraft:()=>false})}}})
  h.render({},'IdeaLibrary');await h.flush();h.render({},'IdeaLibrary');assert.match(h.text(),/Inconnu/)
  h.find(n=>n.type==='input'&&n.props.inputMode==='decimal').props.onChange({target:{value:'0'}})
  h.render({},'IdeaLibrary');assert.match(h.text(),/Gratuit/);assert.doesNotMatch(h.text(),/Inconnu estimé|USD estimé/)
})
