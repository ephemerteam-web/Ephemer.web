import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { harness } from './ui-harness.mjs'
import { profileFixture } from './profile-fixture.mjs'
const copy=v=>JSON.parse(JSON.stringify(v)), owner='10000000-0000-4000-8000-000000000001'
const c=harness('lib/profile-contract.ts').component
test('profil : prénom seul obligatoire, champs fermés, téléphone cohérent et naissance future refusée',()=>{
 const row=profileFixture(),{revision,...donnees}=row
 assert.doesNotThrow(()=>c.commandeProfil({action:'enregistrer',revision,operation:owner,donnees}))
 for(const change of [{prenom:''},{user_id:owner},{tel:'0'},{partageActif:'true'},{empreinte:'fausse'},{modeIdentite:'prenom',identite:'Autre'}])assert.throws(()=>c.commandeProfil({action:'enregistrer',revision,operation:owner,donnees:{...donnees,...change}}))
 assert.throws(()=>c.commandeProfil({action:'enregistrer',revision,operation:owner,donnees:{...donnees,valeurs:{...donnees.valeurs,anniversaire:{jour:1,mois:1,annee:9999}}}}))
})
test('profil : dix critères indépendants, nom facultatif, année absente et partage général coupe toutes les projections',()=>{
 let row=profileFixture();row.partageActif=true;row.partageNom=true
 for(const key of Object.keys(row.partage))if(key!=='annee')row.partage[key]=true
 assert.equal(Object.keys(c.apercuProfil(row).champs).length,8) // Avatar sans configuration enregistré exclu.
 assert.equal(c.apercuProfil(row).champs.nom,'Martin');assert.equal(c.apercuProfil(row).champs.anniversaire.annee,undefined)
 row.iaCadeaux.identite=true;row.iaCadeaux.passions=true
 const off=c.profilAvecPartage(row,false)
 assert.deepEqual(copy(c.apercuProfil(off)),{identite:'Camille',champs:{}})
 assert.deepEqual(copy(off.partage),row.partage);assert.ok(Object.values(off.iaCadeaux).every(v=>!v))
 assert.ok(Object.values(c.profilAvecPartage(off,true).iaCadeaux).every(v=>!v))
})
test('profil : goût libre conservé avec bulles et pseudonyme indépendant',()=>{
 const p=c.passionsProfil('Romans, Cuisine, Astronomie personnelle')
 assert.deepEqual(copy(p),{interets:['Romans','Cuisine'],libre:'Astronomie personnelle'})
 assert.equal(c.reunirPassions(p.interets,p.libre),'Romans, Cuisine, Astronomie personnelle')
 const row={...profileFixture(),modeIdentite:'pseudonyme',identite:'Polaris'}
 assert.equal(c.apercuProfil(row).identite,'Polaris')
 const {revision,...donnees}=row
 assert.equal(c.commandeProfil({action:'enregistrer',revision,operation:owner,donnees:{...donnees,prenom:' Camille '}}).donnees.prenom,'Camille')
})
test('éditeur profil : dix critères et pseudonyme indépendant de la modification du prénom',()=>{
 let draft={...profileFixture(),modeIdentite:'pseudonyme',identite:'Polaris',partageActif:true}
 const h=harness('components/profil/ProfileEditor.tsx'),render=()=>h.render({draft,disabled:false,onChange:value=>{draft=value}})
 render();assert.equal(h.nodes().filter(n=>n.type==='input'&&n.props['aria-label']?.startsWith('Étoiles : ')).length,10)
 const consent=name=>h.find(n=>n.type==='input'&&n.props['aria-label']==='Autoriser : '+name)
 assert.equal(h.nodes().filter(n=>n.type==='input'&&n.props['aria-label']?.startsWith('Autoriser : ')).length,5)
 assert.equal(consent('Passions').props.disabled,true)
 const passionSharing=h.find(n=>n.type==='input'&&n.props['aria-label']==='Étoiles : Mes passions')
 passionSharing.props.onChange({target:{checked:true}});render();assert.equal(consent('Passions').props.disabled,false)
 consent('Passions').props.onChange({target:{checked:true}});render();assert.equal(draft.iaCadeaux.passions,true);assert.equal(draft.iaCadeaux.plaisirs,false)
 h.find(n=>n.type==='input'&&n.props['aria-label']==='Étoiles : Mes passions').props.onChange({target:{checked:false}});render()
 assert.equal(draft.iaCadeaux.passions,false);assert.equal(consent('Passions').props.disabled,true)
 assert.equal(h.nodes().filter(n=>n.props.id===consent('Passions').props['aria-describedby']).length,1)
 h.find(n=>n.props.autoComplete==='given-name').props.onChange({target:{value:'Autre prénom'}});render();assert.equal(draft.identite,'Polaris');assert.equal(draft.prenom,'Autre prénom')
 const general=h.find(n=>n.type==='label'&&h.text(n)==='Partager mes informations avec mes étoiles').props.children[0]
 general.props.onChange({target:{checked:false}});render();assert.equal(draft.partageActif,false);assert.ok(Object.values(draft.iaCadeaux).every(v=>!v))
})
test('transport profil : SQL absent, panne, changement de compte avant/après, requête annulable',async()=>{
 let who=owner,error=null,calls=0,after=null
 const db={auth:{getUser:async()=>({data:{user:{id:who}},error:null})},rpc:()=>({abortSignal:async signal=>{assert.ok(signal);calls++;if(after)who=after;return {data:profileFixture(),error}}})}
 const api=harness('lib/profile-data.ts',{overrides:{'@/lib/supabase-browser':{supabase:db}}}).component
 error={code:'PGRST202'};await assert.rejects(api.readProfile(owner),/SQL Profil unifié/)
 error={code:'40001'};await assert.rejects(api.readProfile(owner),/changé ailleurs/)
 error=null;after='other';await assert.rejects(api.readProfile(owner),/session a changé/)
 const count=calls;await assert.rejects(api.readProfile(owner),/session a changé/);assert.equal(count,calls)
})
function form(storage){
 let row=profileFixture(),fail=false,lost=false,readsFail=false
 const calls=[],operations=new Map(),win=new EventTarget(),doc=new EventTarget()
 win.setInterval=()=>1;win.clearInterval=()=>{};doc.visibilityState='visible'
 if(storage)win.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}
 const api={lire:async()=>{if(readsFail)throw new Error('Lecture en panne');return copy(row)},commander:async(_,input)=>{
  calls.push(copy(input));if(fail){fail=false;throw new Error('Panne avant écriture')}
  if(!operations.has(input.operation)){row={...copy(input.donnees),revision:row.revision+1,empreinte:'b'.repeat(64)};operations.set(input.operation,row.revision)}
  if(lost){lost=false;throw new Error('Réponse perdue')}return {ok:true,revision:operations.get(input.operation)}
 }}
 const h=harness('components/profil/ProfileForm.tsx',{overrides:{'@/lib/supabase-browser':{supabase:{}},'@/components/ContactDraftProvider':{useContactDraft:()=>({confirm:async()=>true,registerPrivateDraft(){}})}},globals:{Event,window:win,document:doc,crypto:{randomUUID:()=>owner}}})
 const render=()=>h.render({ownerId:owner,api},'AccountProfileForm'),change=patch=>{h.find(n=>n.props.draft).props.onChange({...h.find(n=>n.props.draft).props.draft,...patch});render()},save=()=>h.find(n=>n.type==='form').props.onSubmit({preventDefault(){}})
 return {h,render,change,save,calls,win,setFail:()=>fail=true,setLost:()=>lost=true,setReadsFail:v=>readsFail=v,remote:()=>{row.revision++;row.empreinte='c'.repeat(64)},get row(){return row}}
}
test('profil : tout autoriser reste une proposition valide, sans année inventée ni mutation du profil lu',()=>{
 const original=profileFixture(),row=c.profilToutAutorise(original)
 assert.equal(original.partageActif,false);assert.ok(Object.values(original.iaCadeaux).every(v=>!v))
 assert.equal(row.partageNom,true);assert.equal(row.partage.annee,false);assert.equal(row.partageActif,true)
 assert.ok(Object.values(row.iaCadeaux).every(Boolean));assert.doesNotThrow(()=>c.profilUnifie(row))
 const empty=c.profilToutAutorise({...original,valeurs:{...original.valeurs,anniversaire:null}})
 assert.equal(empty.partage.anniversaire,false);assert.equal(empty.partage.annee,false)
 const year=c.profilToutAutorise({...original,valeurs:{...original.valeurs,anniversaire:{jour:1,mois:1,annee:2000}}})
 assert.equal(year.partage.annee,true);assert.doesNotThrow(()=>c.profilUnifie(year))
})
test('formulaire profil : accords proposés avant sauvegarde, aucun appel automatique et marqueur seulement après confirmation',async()=>{
 const storage=new Map(),f=form(storage);f.render();await f.h.flush();f.render()
 assert.equal(f.row.partageActif,false);assert.equal(f.calls.length,0);assert.equal(storage.size,0)
 assert.ok(Object.values(f.h.find(n=>n.props.draft).props.draft.iaCadeaux).every(Boolean))
 assert.match(f.h.text(),/proposés cochés/)
 f.win.dispatchEvent(new Event('focus'));await f.h.flush();f.render()
 assert.equal(f.h.find(n=>n.props.draft).props.draft.partageActif,true)
 f.change({partageActif:false,iaCadeaux:{...profileFixture().iaCadeaux}});f.setFail();f.save();await f.h.flush();f.render()
 assert.equal(storage.size,0);f.save();await f.h.flush();f.render();assert.equal(storage.size,1)
 assert.deepEqual([...storage.values()],['traite']);assert.doesNotMatch(f.h.text(),/proposés cochés/);f.h.unmount()
 const next=form(storage);next.render();await next.h.flush();next.render()
 assert.equal(next.h.find(n=>n.props.draft).props.draft.partageActif,false);assert.equal(next.calls.length,0);next.h.unmount()
})
test('proposition profil : marqueur isolé par compte et stockage bloqué sans activation automatique',()=>{
 const storage=new Map(),win={localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}}
 const p=harness('lib/profile-permission-proposal.ts',{globals:{window:win}}).component
 assert.equal(p.proposerPermissionsProfil(owner),true);p.permissionsProfilTraitees(owner)
 assert.equal(p.proposerPermissionsProfil(owner),false);assert.equal(p.proposerPermissionsProfil('other'),true)
 const blocked=harness('lib/profile-permission-proposal.ts',{globals:{window:{get localStorage(){throw new Error('Bloqué')}}}}).component
 assert.equal(blocked.proposerPermissionsProfil(owner),false);assert.doesNotThrow(()=>blocked.permissionsProfilTraitees(owner))
})
test('formulaire profil : relire abandonne la proposition et conserve les choix distants sans écriture',async()=>{
 const storage=new Map(),f=form(storage);f.render();await f.h.flush();f.render()
 f.h.find(n=>n.type==='button'&&f.h.text(n)==='Relire les informations enregistrées').props.onClick()
 await f.h.flush();f.render()
 assert.equal(f.h.find(n=>n.props.draft).props.draft.partageActif,false)
 assert.ok(Object.values(f.h.find(n=>n.props.draft).props.draft.iaCadeaux).every(v=>!v))
 assert.equal(f.calls.length,0);assert.equal(storage.size,1);assert.doesNotMatch(f.h.text(),/proposés cochés/);f.h.unmount()
})
test('formulaire profil : double clic, panne avant écriture et réessai conservent UUID et saisie',async()=>{
 const f=form();f.render();await f.h.flush();f.render();f.change({nom:'Nouveau'});f.setFail();f.save();f.save();await f.h.flush();f.render()
 assert.equal(f.calls.length,1);assert.equal(f.h.find(n=>n.props.draft).props.draft.nom,'Nouveau')
 f.save();await f.h.flush();f.render();assert.equal(f.calls[0].operation,f.calls[1].operation);assert.equal(f.row.revision,1);assert.match(f.h.text(),/choix de partage sont enregistrés/);f.h.unmount()
})
test('formulaire profil : réponse perdue confirmée par relecture sans deuxième écriture',async()=>{
 const f=form();f.render();await f.h.flush();f.render();f.change({nom:'Nouveau'});f.setLost();f.save();await f.h.flush();f.render()
 assert.equal(f.calls.length,1);assert.equal(f.row.revision,1);assert.match(f.h.text(),/choix de partage sont enregistrés/);f.h.unmount()
})
test('formulaire profil : changement distant conserve brouillon et bloque la sauvegarde',async()=>{
 const f=form();f.render();await f.h.flush();f.render();f.change({nom:'Mon brouillon'});await f.h.flush();f.remote();f.win.dispatchEvent(new Event('focus'));await f.h.flush();f.render()
 assert.equal(f.h.find(n=>n.props.draft).props.draft.nom,'Mon brouillon');assert.equal(f.h.find(n=>n.type==='button'&&n.props.type==='submit').props.disabled,true);f.h.unmount()
})
test('formulaire profil : une relecture tardive après fermeture ne remplace pas la saisie privée',async()=>{
 const f=form();f.render();await f.h.flush();f.render();f.change({nom:'Brouillon privé'});f.setReadsFail(true);f.win.dispatchEvent(new Event('focus'));f.h.unmount();await f.h.flush();f.render()
 assert.equal(f.h.find(n=>n.props.draft).props.draft.nom,'Brouillon privé');assert.equal(f.calls.length,0)
})
test('SQL profil : toutes les fonctions délimitées, helpers privés, garde propriétaire et transaction',()=>{
 const sql=readFileSync(new URL('../docs/sql/profil-unifie.sql',import.meta.url),'utf8')
 const defs=[...sql.matchAll(/CREATE(?: OR REPLACE)? FUNCTION ([\w.]+)\([\s\S]*?\bAS (\$[a-zA-Z_]*\$)([\s\S]*?)\2;/g)]
 assert.equal(defs.length,[...sql.matchAll(/CREATE(?: OR REPLACE)? FUNCTION /g)].length)
 assert.doesNotMatch(sql,/^\+CREATE|DROP TABLE/m);assert.match(sql,/before_state->>'empreinte' IS DISTINCT FROM d->>'empreinte'/)
 assert.match(sql,/REVOKE ALL ON FUNCTION ephemer_social\.profil_naissance\(uuid\),ephemer_social\.profil_snapshot\(uuid\)/)
 assert.match(sql,/DECLARE a uuid:=ephemer_social\.acteur\(\)/);assert.match(sql,/COMMIT;\s*$/)
})
