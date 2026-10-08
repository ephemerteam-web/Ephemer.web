// 🎨 Recette locale des vrais composants/CSS, exemples fictifs et réseau client interdit.
// node tests/avatars-preview.mjs — http://127.0.0.1:3209
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url),root=process.cwd(),dir=path.join(root,'out/avatars-preview')
fs.mkdirSync(dir,{recursive:true})
fs.writeFileSync(path.join(dir,'link.js'),`import React from 'react';export default function Link({children,...props}){return React.createElement('a',{...props,onClick:e=>{e.preventDefault();history.pushState({},'',props.href);window.dispatchEvent(new PopStateEvent('popstate'))}},children)}`)
fs.writeFileSync(path.join(dir,'draft.js'),`export function useContactDraft(){return {registerPrivateDraft:()=>{},contacts:[],prenom:'',hasPrivateDraft:()=>false,navigate:async(path,close)=>{close?.();history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'))}}}`)
fs.writeFileSync(path.join(dir,'navigation.js'),`export function usePathname(){return window.location.pathname}`)
fs.writeFileSync(path.join(dir,'supabase.js'),`export const supabase={}`)
fs.writeFileSync(path.join(dir,'push.js'),`export default function PushPermissionButton(){return null}`)
fs.writeFileSync(path.join(dir,'data.js'),`
const rows=new Map();const copy=value=>JSON.parse(JSON.stringify(value));
export async function loadAvatar(owner){return rows.has(owner)?copy(rows.get(owner)):null}
export async function saveAvatar(owner,revision,configuration){const current=rows.get(owner);if((current?.revision??null)!==revision)throw new Error('Conflit simulé : relis la version enregistrée.');const row={user_id:owner,revision:(revision??0)+1,configuration:copy(configuration)};rows.set(owner,row);return copy(row)}
`)
fs.writeFileSync(path.join(dir,'loader.cjs'),`const ts=require('typescript');module.exports=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText`)
fs.writeFileSync(path.join(dir,'entry.js'),`
import React,{useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';import AvatarPage from '../../components/avatars/AvatarPage';import Badge from '../../components/avatars/AccountAvatarBadge';import AvatarProvider from '../../components/avatars/DashboardAvatarContext';import {DashboardUserContext} from '../../components/DashboardUserContext';import MenuLateral from '../../components/MenuLateral';import Link from './link';
window.fetch=()=>{throw new Error('Réseau interdit dans cet aperçu')};
function App(){const[owner,setOwner]=useState('A'),[theme,setTheme]=useState('dark'),[page,setPage]=useState(location.pathname),[menu,setMenu]=useState(false);useEffect(()=>{const listener=()=>setPage(location.pathname);window.addEventListener('popstate',listener);return()=>window.removeEventListener('popstate',listener)},[]);const user={id:owner,prenom:owner==='A'?'Alex':'Camille',email:owner.toLowerCase()+'@example.invalid'};return React.createElement(DashboardUserContext.Provider,{value:user},React.createElement(AvatarProvider,{ownerId:owner},
React.createElement('nav',{className:'flex flex-wrap gap-3 border-b border-line p-3 text-ink'},React.createElement('span',null,'Recette fictive : sauvegarde simulée en mémoire, aucun compte distant'),
React.createElement('button',{onClick:()=>{const next=theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;setTheme(next)}},'Thème'),
React.createElement('button',{onClick:()=>setOwner(value=>value==='A'?'B':'A')},'Compte '+owner),React.createElement('button',{'aria-label':'Ouvrir le menu',className:'ml-auto h-10 w-10',onClick:()=>setMenu(true)},React.createElement(Badge,{initiale:user.prenom[0]}))),
React.createElement(MenuLateral,{ouvert:menu,onFermer:()=>setMenu(false),user}),
page==='/avatar'?React.createElement(AvatarPage,{key:owner}):React.createElement('main',{className:'mx-auto max-w-2xl p-4 text-ink'},React.createElement('h1',{className:'text-2xl font-bold'},'Mon profil — exemple fictif'),React.createElement('div',{className:'mt-4 flex items-center gap-4'},React.createElement(Link,{href:'/avatar','aria-label':'Personnaliser mon avatar',className:'h-16 w-16 shrink-0'},React.createElement(Badge,{initiale:user.prenom[0],rounded:false})),React.createElement('div',null,React.createElement('p',null,user.prenom),React.createElement('p',null,user.email)))))
)
};createRoot(document.getElementById('root')).render(React.createElement(App));
`)
const webpack=require('next/dist/compiled/webpack/webpack').webpack
webpack({mode:'development',entry:path.join(dir,'entry.js'),output:{path:dir,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':root}},
 module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(dir,'loader.cjs')}]},devtool:false,
 plugins:[new webpack.NormalModuleReplacementPlugin(/^next\/link$|^next\/navigation$|ContactDraftProvider$|avatar-data$|supabase-browser$|PushPermissionButton$/,resource=>{resource.request=path.join(dir,resource.request==='next/link'?'link.js':resource.request==='next/navigation'?'navigation.js':resource.request.endsWith('avatar-data')?'data.js':resource.request.endsWith('supabase-browser')?'supabase.js':resource.request.endsWith('PushPermissionButton')?'push.js':'draft.js')})],
},async(error,stats)=>{
 if(error||stats.hasErrors()){console.error(error||stats.toString({all:false,errors:true}));process.exitCode=1;return}
 const css=await require('postcss')([require('@tailwindcss/postcss')()]).process(fs.readFileSync(path.join(root,'app/globals.css'),'utf8'),{from:path.join(root,'app/globals.css')})
 fs.writeFileSync(path.join(dir,'style.css'),css.css)
 const html='<!doctype html><html lang="fr" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aperçu temporaire des avatars Ephemer</title><link rel="stylesheet" href="/style.css"></head><body style="margin:0;font-family:system-ui"><div id="root"></div><script src="/bundle.js"></script></body></html>'
 http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://127.0.0.1:3209').pathname
  const file=['/bundle.js','/style.css'].includes(pathname)?path.join(dir,pathname.slice(1)):null
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer')
  res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'none'")
  res.setHeader('Content-Type',file?.endsWith('.css')?'text/css':file?.endsWith('.js')?'text/javascript':'text/html; charset=utf-8')
  res.end(file?fs.readFileSync(file):html)
 }).listen(3209,'127.0.0.1',()=>console.log('PREVIEW_READY http://127.0.0.1:3209 — aucun accès distant'))
})
