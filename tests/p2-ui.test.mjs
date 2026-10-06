// Exécuter les composants réels avec événements et services simulés ; aucune écriture distante.
import assert from 'node:assert/strict'
import test from 'node:test'
import { pageDatabase } from './p2-helpers.mjs'
import { harness } from './ui-harness.mjs'

test('ajout : email refermé refusé, doublons présentés, annulation et erreur conservent les saisies',async()=>{
  const draft={prenom:'',contacts:[{id:'draft',prenom:'Jean',email:'incorrect'}]},questions=[],inserts=[]
  let allow=false,fail=true
  const db=pageDatabase({contacts:[{id:1,user_id:'u1',prenom:'Autre',email:'shared@example.invalid'}]})
  const supabase={auth:{getUser:async()=>({data:{user:{id:'u1'}}})},from:table=>{
    const query=db.from(table);query.insert=async rows=>{inserts.push(rows);return {error:fail?new Error('Échec simulé'):null}};return query
  }}
  const draftContext={get contacts(){return draft.contacts},get prenom(){return draft.prenom},setContacts:value=>{draft.contacts=typeof value==='function'?value(draft.contacts):value},setPrenom:value=>{draft.prenom=value},clear:()=>{draft.contacts=[];draft.prenom=''},confirm:async message=>{questions.push(message);return allow}}
  const h=harness('app/dashboard/contacts/nouveau/page.tsx',{overrides:{'@/components/ContactDraftProvider':{useContactDraft:()=>draftContext},'@/lib/supabase-browser':{supabase},'next/navigation':{useRouter:()=>({push(){},refresh(){}})},'next/link':{default:'a'}},globals:{document:{addEventListener(){},removeEventListener(){},createElement:()=>({type:'',value:'',checkValidity(){return /^[^\s@]+@[^\s@]+$/.test(this.value)}})}}})
  h.render();await h.flush();h.render()
  const save=()=>h.find(node=>node.type==='button' && h.text(node).includes('Enregistrer')).props.onClick()
  await save();h.render();assert.match(h.text(),/adresse email invalide/);assert.equal(inserts.length,0)
  draft.contacts=[{id:'draft',prenom:'Jean',email:'shared@example.invalid',relation:'amis'}]
  h.render();await save();h.render();assert.equal(inserts.length,0);assert.match(questions[0],/Autre/);assert.equal(draft.contacts.length,1)
  allow=true;await save();h.render();assert.equal(inserts.length,1);assert.equal(draft.contacts.length,1);assert.equal(inserts[0][0].relation,'ami');assert.match(h.text(),/Une erreur est survenue/)
  fail=false;await save();h.render();assert.equal(draft.contacts.length,0);assert.equal(draft.prenom,'')
})

test('navigation : confirmation annulée bloque liens et menus, brouillon restauré puis effacé',async()=>{
  const listeners=new Map(),routes=[]
  const router={push:path=>routes.push(path)}
  const h=harness('components/ContactDraftProvider.tsx',{overrides:{'next/navigation':{useRouter:()=>router,usePathname:()=> '/dashboard/contacts/nouveau'},'./Modal':{default:'dialog'}},globals:{window:{addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)},document:{addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)},location:{origin:'https://test.invalid'},URL}})
  let tree=h.render({children:null});tree.props.value.setPrenom('Camille');tree.props.value.setContacts([{id:'x',prenom:'Jean'}]);tree=h.render({children:null});await h.flush()
  const pending=tree.props.value.navigate('/dashboard')
  tree=h.render({children:null});h.find(node=>node.type==='button' && h.text(node)==='Annuler').props.onClick();await pending
  assert.equal(routes.length,0)
  let prevented=false;listeners.get('click')({button:0,target:{closest:()=>({href:'https://test.invalid/dashboard',hasAttribute:()=>false})},preventDefault(){prevented=true},stopPropagation(){}})
  h.render({children:null});assert.equal(prevented,true);h.find(node=>node.type==='button' && h.text(node)==='Confirmer').props.onClick();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(routes,['/dashboard'])
  tree=h.render({children:null});assert.equal(tree.props.value.prenom,'Camille');assert.equal(tree.props.value.contacts[0].prenom,'Jean')
  let unload=false;listeners.get('beforeunload')({preventDefault(){unload=true}});assert.equal(unload,true)
  tree.props.value.clear();tree=h.render({children:null});await h.flush();assert.equal(tree.props.value.contacts.length,0);assert.equal(tree.props.value.prenom,'')
})

test('dialogue : ouverture native, focus initial, Échap et retour au déclencheur',async()=>{
  let focused='',opened=0,closed=0,cancelled=false
  const initial={focus(){focused='initial'}},trigger={isConnected:true,focus(){focused='trigger'}}
  class Element {}
  Object.setPrototypeOf(trigger,Element.prototype)
  const h=harness('components/Modal.tsx',{globals:{HTMLElement:Element,document:{activeElement:trigger,body:{style:{overflow:''}}}}})
  const props={open:true,title:'Confirmer',onClose:()=>{cancelled=true},children:'Test'}
  let tree=h.render(props);tree.props.ref.current={showModal(){opened++},close(){closed++},querySelector:()=>initial}
  await h.flush();assert.equal(opened,1);assert.equal(focused,'initial');assert.ok(tree.props['aria-labelledby'])
  tree.props.onCancel({preventDefault(){}});assert.equal(cancelled,true)
  const hidden=h.render({...props,open:false});await h.flush();assert.equal(closed,1);assert.equal(focused,'trigger');assert.equal(hidden.props.style.display,'none')
})

test('carte cadeau : détails visibles et choix de marchand accessible sans retournement',()=>{
  const h=harness('components/GiftSuggestions.tsx',{extra:'\nexport { SuggestionCard };',overrides:{'@/lib/supabase-browser':{},'@/components/ContactDraftProvider':{useContactDraft:()=>({hasPrivateDraft:()=>false})}}})
  const props={idea:{idee:'Livre',raison:'Lecture',categorie:'loisir',recherche:'livre'},contactId:null,recipient:'',occurrenceId:null,noPurchase:false,previous:false}
  h.render(props,'SuggestionCard');assert.match(h.text(),/Lecture/);assert.match(h.text(),/prix et disponibilité à vérifier/)
  assert.equal(h.nodes().filter(node=>node.props['aria-hidden']===true&&node.props.inert).length,0)
  const select=h.find(node=>node.type==='select');select.props.onChange({target:{value:'fnac'}})
  h.render(props,'SuggestionCard');assert.match(h.find(n=>n.type==='a').props.href,/fnac/)
  h.render({...props,noPurchase:true},'SuggestionCard');assert.equal(h.nodes().filter(n=>n.type==='a').length,0)
})
