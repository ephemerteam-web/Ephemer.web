import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import React from 'react'
import ts from 'typescript'
const nativeRequire=createRequire(import.meta.url)
export function harness(file,{overrides={},globals={},extra='',sources={}}={}) {
  const emptyAvatar={config:null,savedConfig:null,updateAvatar:()=>{}}
  // Les tests UI n'utilisent jamais une connexion Supabase réelle implicitement.
  const unavailableUnivers=async()=>{throw new Error('Transport univers non fourni dans cette simulation')}
  overrides={ '@/lib/univers-data':{readUniversPartage:unavailableUnivers,universService:{lire:unavailableUnivers,commander:unavailableUnivers}},...overrides }
  const emptySocial={actives:[],recues:[],associations:[],loading:false,error:'',offline:false,refresh:async()=>{},contactSeed:null,setContactSeed:()=>{}}
  overrides = { '@/components/etoiles/EtoilesContext': { useEtoiles:()=>emptySocial, default:({children})=>children }, ...overrides }
  overrides = { '@/components/DashboardUserContext': { useDashboardUser: () => ({ id: 'u1', email: 'test@example.invalid' }) }, '@/components/avatars/DashboardAvatarContext':{useDashboardAvatar:()=>emptyAvatar,default:({children})=>children}, ...overrides }
  const slots=[], effects=[], modules=new Map(); let cursor=0,tree
  const hooks={...React,
    useState(initial){const i=cursor++; if(!(i in slots)) slots[i]=typeof initial==='function'?initial():initial; return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
    useRef(initial){return hooks.useState(()=>({current:initial}))[0]}, useMemo(fn){return fn()},useCallback(fn,deps){const ref=hooks.useRef(null);if(!ref.current || deps.some((dep,i)=>!Object.is(dep,ref.current.deps[i]))) ref.current={fn,deps};return ref.current.fn},useId(){return hooks.useState('synthetic-title')[0]},
    useEffect(fn,deps){const i=cursor++; if(!slots[i] || !deps || deps.some((dep,index)=>!Object.is(dep,slots[i].deps[index]))) {slots[i]?.cleanup?.(); slots[i]={deps}; effects.push(()=>{slots[i].cleanup=fn()})}}
  }
  function load(path){
    if(modules.has(path)) return modules.get(path)
    const resolved=/\.tsx?$/.test(path)?path:existsSync(new URL(`../${path}.tsx`,import.meta.url))?`${path}.tsx`:`${path}.ts`
    const source=(sources[resolved]??readFileSync(new URL(`../${resolved}`,import.meta.url),'utf8'))+(path===file?extra:'')
    const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText
    const compiledModule={exports:{}}; modules.set(path,compiledModule.exports)
    const require=name=>name==='react'?hooks:overrides[name]??(name.startsWith('@/')?load(name.slice(2)):name.startsWith('.')?(overrides['@/'+new URL(name,`https://test/${resolved}`).pathname.slice(1)]??load(new URL(name,`https://test/${resolved}`).pathname.slice(1))):nativeRequire(name))
    const mockWindow = new EventTarget(); mockWindow.setInterval=()=>1; mockWindow.clearInterval=()=>{}
    const mockDocument = new EventTarget(); mockDocument.visibilityState='visible'
    runInNewContext(compiled,{module:compiledModule,exports:compiledModule.exports,require,URLSearchParams,TextEncoder,TextDecoder,Response,AbortSignal,AbortController,window:mockWindow,document:mockDocument,navigator:{onLine:true},console:{error(){},warn(){},log(){}},process:{env:{}},setTimeout,clearTimeout,crypto:{randomUUID:()=> 'draft-id'},...globals})
    return compiledModule.exports
  }
  const component=load(file)
  function render(props={},name='default'){cursor=0;tree=component[name](props);return tree}
  function nodes(node=tree){return React.isValidElement(node)?[node,...React.Children.toArray(node.props.children).flatMap(child=>nodes(child))]:[]}
  function text(node){return Array.isArray(node)?node.map(text).join(''):React.isValidElement(node)?text(node.props.children):node==null?'':String(node)}
  function find(predicate){const found=nodes().find(predicate);assert.ok(found,'Élément absent');return found}
  async function flush(){effects.splice(0).forEach(fn=>fn());await new Promise(resolve=>setImmediate(resolve))}
  return {render,find,nodes,text:(node=tree)=>text(node),flush,component,unmount:()=>slots.forEach(slot=>slot?.cleanup?.())}
}
