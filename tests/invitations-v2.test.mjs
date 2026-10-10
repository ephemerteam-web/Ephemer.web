// Parcours réels avec transport fictif. Le SQL a sa recette distincte sur une copie de base.
import assert from 'node:assert/strict'
import test from 'node:test'
import { harness } from './ui-harness.mjs'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
const A='10000000-0000-4000-8000-000000000001', B='10000000-0000-4000-8000-000000000002'
const token='a'.repeat(42)+'A'
const plain=value=>JSON.parse(JSON.stringify(value))
function storage(){const map=new Map();return {map,get length(){return map.size},key:i=>[...map.keys()][i]??null,getItem:key=>map.get(key)??null,setItem:(key,v)=>map.set(key,v),removeItem:key=>map.delete(key)}}
function module(file,options={}){return harness(file,options).component}
const empty=()=>module('lib/invitation-contract.ts').emptyInvitationAnswer()
const profile={complete:false,prenom:'',nom:'',anniversaire:null,email:'camille@example.invalid',indicatif:'+33',tel:'',passions:'',presentation:'',revisionUnivers:0,empreinte:'profile-v1'}
const recovery={id:A,createdAt:'2026-10-10T10:00:00Z',expiresAt:'2026-11-09T10:00:00Z',donnees:{...empty(),prenom:'Camille',nom:'Martin',email:profile.email,anniversaire:{day:29,month:2,year:null},interets:['Romans'],noteLibre:'Mes envies',tel:'612345678'}}
test('retours auth : liste fermée, reset préservé, aucun secret dans la destination',()=>{
 const a=module('lib/auth-return.ts')
 for(const bad of ['https://evil.invalid','//evil.invalid','/etoile#'+token,'/dashboard?email=x','/etoile?token=x',null])assert.equal(a.authReturn(bad),'/dashboard')
 assert.equal(a.profileDestination(false,'/etoile'),'/completer-profil?next=%2Fetoile')
 assert.equal(a.profileDestination(false,'/reset-password'),'/reset-password')
 assert.equal(a.authPage('/connexion','/etoile'),'/connexion?next=%2Fetoile')
})
test('étoile : stockage limité à trente minutes, compte lié une seule fois, expiration sans renouvellement',()=>{
 const a=module('lib/etoile-context.ts'),store=storage(),now=1000
 a.startEtoileContext(store,token,now)
 assert.equal(a.readEtoileContext(store,now).owner,null)
 assert.equal(a.bindEtoileContext(store,A,now+1).expiresAt,now+a.ETOILE_CONTEXT_TTL)
 assert.equal(a.bindEtoileContext(store,B,now+2),null);assert.equal(store.length,0)
 a.startEtoileContext(store,token,now);assert.equal(a.readEtoileContext(store,now+a.ETOILE_CONTEXT_TTL),null);assert.equal(store.length,0)
 a.startEtoileContext(store,token,now);a.clearEtoileContext(store);assert.equal(store.length,0)
 assert.equal(a.readEtoileContext({getItem(){throw Error('interdit')},removeItem(){throw Error('interdit')}}),null)
})
test('anniversaire : année nullable, 29 février valide, refus des dates impossibles et futures',()=>{
 const a=module('lib/invitation-contract.ts'),input={...a.emptyInvitationAnswer(),prenom:' C ',email:' TEST@EXAMPLE.INVALID ',anniversaire:{day:29,month:2,year:null}}
 assert.deepEqual(plain(a.invitationAnswer(input).anniversaire),{day:29,month:2,year:null})
 assert.equal(a.invitationAnswer(input).email,'test@example.invalid')
 for(const birth of [{day:31,month:4,year:null},{day:29,month:2,year:2023},{day:1,month:1,year:9999}])assert.throws(()=>a.invitationAnswer({...input,anniversaire:birth}))
 assert.throws(()=>a.invitationAnswer({...input,email:'',conserver:true}),/e-mail/)
 assert.equal(a.invitationAnswer({...input,noteLibre:'a'.repeat(900)},true).noteLibre.length,900)
 assert.throws(()=>a.invitationAnswer({...input,noteLibre:'a'.repeat(501)}))
})
test('reprise : les valeurs du compte passent avant la réponse originale, sans notes privées',()=>{
 const h=harness('app/completer-profil/page.tsx',{extra:'\nexport { prepare };',overrides:{'@/lib/supabase-browser':{supabase:{}}}})
 const existing={...profile,prenom:'Déjà saisi',nom:'Compte',anniversaire:{day:4,month:3,year:null},passions:'Passion personnelle',presentation:'Présentation conservée',tel:'123',indicatif:'+41'}
 const draft=h.component.prepare(existing,recovery)
 assert.equal(draft.prenom,'Déjà saisi');assert.equal(draft.nom,'Compte');assert.equal(draft.jour,'4');assert.equal(draft.annee,'')
 assert.equal(draft.noteLibre,'Présentation conservée');assert.equal(draft.passionsLibre,'Passion personnelle');assert.equal(draft.tel,'123');assert.equal(draft.indicatif,'+41')
 const fresh=h.component.prepare(profile,recovery)
 assert.equal(fresh.noteLibre,recovery.donnees.noteLibre);assert.equal(fresh.prenom,'Camille');assert.deepEqual(plain(fresh.interets),['Romans'])
})
test('auth continuée : ancien compte terminé, compte incomplet et reprises multiples',async()=>{
 let complete=true,rows=[]
 const supabase={auth:{getUser:async()=>({data:{user:{id:A}},error:null})},rpc:async name=>({data:name==='lire_premier_profil'?{...profile,complete}:rows,error:null})}
 const a=module('lib/invitation-data.ts',{overrides:{'@/lib/supabase-browser':{supabase}}})
 assert.equal(await a.continueAfterAuth(A,'/etoile'),'/etoile')
 complete=false;assert.equal(await a.continueAfterAuth(A,'/etoile'),'/completer-profil?next=%2Fetoile')
 complete=true;rows=[recovery];assert.equal(await a.continueAfterAuth(A,'/etoile'),'/completer-profil?next=%2Fetoile')
 assert.equal(await a.continueAfterAuth(A,'/reset-password'),'/reset-password')
})
test('transport : changement de compte, panne et absence de SQL restent des erreurs visibles',async()=>{
 let who=A,count=0
 const supabase={auth:{getUser:async()=>({data:{user:{id:who}},error:null})},rpc:async()=>{count++;who=B;return {data:[],error:null}}}
 const a=module('lib/invitation-data.ts',{globals:{Error},overrides:{'@/lib/supabase-browser':{supabase}}})
 await assert.rejects(a.readRecoveries(A),/session a changé/);assert.equal(count,1)
 await assert.rejects(a.readRecoveries(A),/session a changé/);assert.equal(count,1)
 who=A;supabase.rpc=async()=>({data:null,error:{code:'PGRST202'}})
 await assert.rejects(a.readRecoveries(A),/SQL invitations/)
 supabase.rpc=async()=>({data:null,error:{code:'40001'}})
 await assert.rejects(a.readRecoveries(A),/informations ont changé/)
})
function publicForm(store,transport){
 const h=harness('app/invitation/[token]/FormulaireInvitation.tsx',{extra:'\nexport { InvitationForm };',globals:{Error,localStorage:store,crypto:{randomUUID:()=>A}},overrides:{'@/lib/invitation-data':{invitationRpc:transport}}})
 const props={token:'fixture-token',prenomHote:'Alex'},render=()=>h.render(props,'InvitationForm')
 render()
 const next=()=>{h.find(n=>n.type==='button'&&h.text(n)==='Continuer').props.onClick();render()}
 return {h,render,next}
}
test('public : double clic et réponse perdue après rechargement conservent le même UUID',async()=>{
 const store=storage(),d=module('lib/invitation-drafts.ts'),calls=[]
 d.saveInvitationDraft(store,'fixture-token',{prenom:'Camille',nom:'Martin',jour:'29',mois:'2',annee:'',relation:'ami',interets:[],noteLibre:'',email:'camille@example.invalid',indicatif:'+33',tel:'',conserver:true})
 let resolve
 const first=publicForm(store,async(name,args)=>{calls.push(plain(args));return new Promise(r=>resolve=r)})
 await first.h.flush()
 for(let i=0;i<3;i++)first.next()
 const send=first.h.find(n=>n.type==='button'&&/envoy/i.test(first.h.text(n))).props.onClick
 send();send();assert.equal(calls.length,1);assert.equal(calls[0].p_donnees.anniversaire.year,null)
 first.h.unmount();resolve({succes:true});await first.h.flush()
 const second=publicForm(store,async(name,args)=>{calls.push(plain(args));return {succes:true}})
 await second.h.flush();for(let i=0;i<3;i++)second.next()
 second.h.find(n=>n.type==='button'&&/envoy/i.test(second.h.text(n))).props.onClick()
 await second.h.flush();second.render();await second.h.flush()
 assert.equal(calls.length,2);assert.equal(calls[0].p_operation,calls[1].p_operation);assert.deepEqual(calls[0].p_donnees,calls[1].p_donnees)
 assert.match(second.h.text(),/C'est noté/);assert.equal(store.length,0);second.h.unmount()
})
test('premier profil : seul le prénom suffit, goûts et année absente enregistrés avant retour étoile',async()=>{
 const calls=[],routes=[],router={replace:url=>routes.push(url)},user={id:A}
 const h=harness('app/completer-profil/page.tsx',{globals:{Error,window:{location:{search:'?next=%2Fetoile'},confirm:()=>true},crypto:{randomUUID:()=>B}},overrides:{
  'next/navigation':{useRouter:()=>router},'@/lib/supabase-browser':{supabase:{auth:{getUser:async()=>({data:{user},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}},
  '@/lib/invitation-data':{readFirstProfile:async()=>profile,readRecoveries:async()=>[],invitationRpc:async(name,args)=>{calls.push(plain(args));return {ok:true}}}
 }})
 h.render();await h.flush();h.render()
 h.find(n=>n.type==='input'&&n.props.autoComplete==='given-name').props.onChange({target:{value:'C'}});h.render()
 const submit=()=>h.find(n=>n.type==='form').props.onSubmit({preventDefault(){}})
 submit();h.render();submit();h.render();submit();await h.flush()
 assert.equal(calls.length,1);assert.equal(calls[0].p_donnees.prenom,'C');assert.equal(calls[0].p_donnees.anniversaire,null);assert.deepEqual(routes,['/etoile']);h.unmount()
})
test('hôte : pas de remplacement implicite, empreinte et revision protégées',async()=>{
 const calls=[],row={id:A,revision:3,donnees:recovery.donnees,candidats:[{...recovery.donnees,id:'9007199254740993',empreinte:'contact-v1',note:'Note privée conservée'}]}
 let saved=0
 const h=harness('components/InvitationAnswers.tsx',{globals:{Error,window:{confirm:()=>true}},overrides:{
  '@/lib/invitation-data':{invitationRpc:async(name,args)=>{calls.push(plain(args));return {ok:true}}},
  '@/lib/contact-changes':{notifyContactsChanged(){}},'@/lib/notification-changes':{notifyNotificationsChanged(){}}
 }})
 const props={row,owner:A,onSaved:()=>saved++};h.render(props,'Answer');await h.flush()
 assert.ok(h.nodes().filter(n=>n.type==='input'&&n.props.type==='checkbox').every(n=>!n.props.checked))
 h.find(n=>n.type==='button'&&h.text(n)==='Compléter cette fiche').props.onClick();await h.flush()
 assert.equal(calls[0].p_contact,'9007199254740993');assert.deepEqual(calls[0].p_champs,[]);assert.equal(calls[0].p_empreinte,'contact-v1');assert.equal(calls[0].p_revision,3);assert.equal(saved,1);h.unmount()
})
function confirm(verify){
 const src=stripTypeScriptTypes(readFileSync(new URL('../app/auth/confirm/route.ts',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'').replace(/^export /gm,'')
 const authReturn=value=>value==='/etoile'||value==='/reset-password'?value:'/dashboard'
 const writes=[],GET=runInNewContext(src+';GET',{URL,URLSearchParams,process:{env:{}},cookies:async()=>({getAll:()=>[],set:(...args)=>writes.push(args)}),authReturn,
  createServerClient:(_a,_b,options)=>({auth:{verifyOtp:async args=>{options.cookies.setAll([{name:'fixture-session',value:'fixture',options:{}}]);return verify(args)}}}),
  NextResponse:{redirect:(url,options)=>({url:url.toString(),headers:options.headers})}})
 return {GET,writes}
}
test('confirmation autre appareil : hash à usage unique sans verifier PKCE, cookies et retour étoile',async()=>{
 let args
 const {GET,writes}=confirm(value=>{args=value;return {error:null}})
 const r=await GET({url:'https://example.invalid/auth/confirm?next=%2Fetoile&token_hash=fixture-hash&type=email'})
 assert.deepEqual(plain(args),{token_hash:'fixture-hash',type:'email'});assert.equal(writes.length,1)
 assert.equal(r.url,'https://example.invalid/auth/continuer?next=%2Fetoile');assert.equal(r.headers['Referrer-Policy'],'no-referrer')
})
test('confirmation refusée ou en panne : pas de page technique ni de retour externe',async()=>{
 for(const verify of [()=>({error:{message:'expired'}}),()=>{throw Error('network')}]){
  const {GET}=confirm(verify),r=await GET({url:'https://example.invalid/auth/confirm?next=https://evil.invalid&token_hash=fixture&type=email'})
  assert.equal(r.url,'https://example.invalid/connexion?auth_error=1&next=%2Fdashboard')
 }
})

test('SQL préparé : corps délimités, surface publique fermée et ancien ajout sans droits',()=>{
 // Contrôle statique de livraison ; ce test ne prétend pas exécuter PostgreSQL.
 const sql=readFileSync(new URL('../docs/sql/invitations-v2.sql',import.meta.url),'utf8')
 const definitions=[...sql.matchAll(/CREATE FUNCTION ([\w.]+)\([\s\S]*?\bAS (\$[a-zA-Z_]*\$)([\s\S]*?)\2;/g)]
 assert.equal(definitions.length,[...sql.matchAll(/CREATE FUNCTION /g)].length,'Un corps SQL est mal délimité')
 for(const [,name,,body] of definitions){
  if(['ephemer_invites.reprises_lire','ephemer_invites.reponses_lire','ephemer_invites.traiter','ephemer_invites.profil_lire','ephemer_invites.profil_enregistrer'].includes(name))assert.match(body,/ephemer_social\.acteur\(\)/)
 }
 assert.match(sql,/REVOKE ALL ON ALL TABLES IN SCHEMA ephemer_invites FROM PUBLIC,anon,authenticated,service_role/)
 assert.match(sql,/p\.proname IN \('soumettre_invitation','repondre_invitation'\)/)
 assert.match(sql,/WHERE email=address AND expires_at>now\(\)/)
 assert.match(sql,/GRANT EXECUTE ON FUNCTION ephemer_invites\.purger\(\),public\.purger_reprises_invitation\(\) TO service_role/)
 // PL/pgSQL lit THEN comme fin du IF hors parenthèses, même à l'intérieur d'un CASE SQL.
 assert.match(sql,/char_length\(d->>'noteLibre'\)>\(CASE WHEN profil THEN 1000 ELSE 500 END\)/)
 const recipe=readFileSync(new URL('../docs/sql/invitations-v2-recette.sql',import.meta.url),'utf8')
 assert.ok(recipe.indexOf("to_regprocedure('public.soumettre_invitation_v2(text,uuid,jsonb)')")<recipe.indexOf('INSERT INTO auth.users'),'Vérifier les prérequis avant les fixtures')
})
