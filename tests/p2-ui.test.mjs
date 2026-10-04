// Exécuter les composants réels avec événements et services simulés ; aucune écriture distante.
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import React from 'react'
import ts from 'typescript'
import { pageDatabase } from './p2-helpers.mjs'
const nativeRequire=createRequire(import.meta.url)
function harness(file,{overrides={},globals={},extra=''}={}) {
  const slots=[], effects=[], modules=new Map(); let cursor=0,tree
  const hooks={...React,
    useState(initial){const i=cursor++; if(!(i in slots)) slots[i]=typeof initial==='function'?initial():initial; return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
    useRef(initial){return hooks.useState(()=>({current:initial}))[0]}, useMemo(fn){return fn()},useCallback(fn,deps){const ref=hooks.useRef(null);if(!ref.current || deps.some((dep,i)=>!Object.is(dep,ref.current.deps[i]))) ref.current={fn,deps};return ref.current.fn},useId(){return hooks.useState('synthetic-title')[0]},
    useEffect(fn,deps){const i=cursor++; if(!slots[i] || !deps || deps.some((dep,index)=>!Object.is(dep,slots[i].deps[index]))) {slots[i]?.cleanup?.(); slots[i]={deps}; effects.push(()=>{slots[i].cleanup=fn()})}}
  }
  function load(path){
    if(modules.has(path)) return modules.get(path)
    const resolved=/\.tsx?$/.test(path)?path:`${path}.ts`
    const source=readFileSync(new URL(`../${resolved}`,import.meta.url),'utf8')+(path===file?extra:'')
    const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText
    const compiledModule={exports:{}}; modules.set(path,compiledModule.exports)
    const require=name=>name==='react'?hooks:overrides[name]??(name.startsWith('@/')?load(name.slice(2)):name.startsWith('.')?load(new URL(name,`https://test/${resolved}`).pathname.slice(1)):nativeRequire(name))
    runInNewContext(compiled,{module:compiledModule,exports:compiledModule.exports,require,console:{error(){},warn(){},log(){}},process:{env:{}},setTimeout,clearTimeout,crypto:{randomUUID:()=> 'draft-id'},...globals})
    return compiledModule.exports
  }
  const component=load(file)
  function render(props={},name='default'){cursor=0;tree=component[name](props);return tree}
  function nodes(node=tree){return React.isValidElement(node)?[node,...React.Children.toArray(node.props.children).flatMap(child=>nodes(child))]:[]}
  function text(node){return Array.isArray(node)?node.map(text).join(''):React.isValidElement(node)?text(node.props.children):node==null?'':String(node)}
  function find(predicate){const found=nodes().find(predicate);assert.ok(found,'Élément absent');return found}
  async function flush(){effects.splice(0).forEach(fn=>fn());await new Promise(resolve=>setImmediate(resolve))}
  return {render,find,nodes,text:(node=tree)=>text(node),flush,component}
}

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

test('carte cadeau : bouton réel et face masquée inerte pour le clavier',()=>{
  const h=harness('app/dashboard/gift-ideas/page.tsx',{extra:'\nexport { FlipCard };',overrides:{'next/navigation':{},'@/lib/supabase-browser':{},'@/components/DrawerContext':{},'@/components/AppSelect':{default:'select'}}})
  const props={idea:{idee:'Livre',raison:'Lecture',categorie:'loisir',recherche:'livre'},index:0}
  h.render(props,'FlipCard');assert.ok(h.find(node=>node.props['aria-hidden']===true).props.inert)
  const button=h.find(node=>node.type==='button' && h.text(node).startsWith('Voir les détails'))
  button.props.onClick();h.render(props,'FlipCard');assert.ok(h.find(node=>node.props['aria-hidden']===true).props.inert)
  assert.equal(h.find(node=>node.type==='button' && h.text(node).includes('Revenir')).type,'button')
})
