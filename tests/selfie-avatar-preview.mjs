// Composant réel, compte et fournisseur fictifs ; aucun réseau externe ni selfie personnel.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'
const pageMode = process.argv.includes('--page'), previewPort = pageMode ? 3221 : 3220
const require = createRequire(import.meta.url), root = process.cwd(), dir = path.join(root, pageMode ? 'out/avatar-choice-preview' : 'out/selfie-avatar-preview')
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, 'loader.cjs'), `const ts=require('typescript');module.exports=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText`)
fs.writeFileSync(path.join(dir, 'supabase.js'), `export const supabase={auth:{getUser:async()=>({data:{user:window.fixtureSignedOut?null:{id:window.fixtureOwner}},error:null}),getSession:async()=>({data:{session:window.fixtureSignedOut?null:{user:{id:window.fixtureOwner},access_token:'fixture-session'}},error:null}),onAuthStateChange:fn=>{window.fixtureAuthListeners.add(fn);return{data:{subscription:{unsubscribe:()=>window.fixtureAuthListeners.delete(fn)}}}}}}`)
fs.writeFileSync(path.join(dir, 'link.js'), `import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}`)
fs.writeFileSync(path.join(dir, 'draft.js'), `export function useContactDraft(){return{registerPrivateDraft(){}}}`)
fs.writeFileSync(path.join(dir, 'avatar-data.js'), `const rows=new Map();window.fixtureAvatarWrites=0;window.fixtureAvatarRows=rows;export async function loadAvatar(owner){return rows.get(owner)??null}export async function saveAvatar(owner,revision,configuration){window.fixtureAvatarWrites++;const row={user_id:owner,revision:(revision??0)+1,configuration:JSON.parse(JSON.stringify(configuration)),portrait_ia:null};rows.set(owner,row);return row}
export async function savePortraitAvatar(owner,revision,portrait,signal){if(window.fixtureSaveDelay)await new Promise(resolve=>window.fixtureSaveRelease=resolve);signal.throwIfAborted();if(owner!==window.fixtureOwner)throw new Error('Session expirée.');if(window.fixturePortraitMissing)throw new Error('L’enregistrement du portrait attend l’installation du script Avatar IA dans Supabase.');const current=rows.get(owner);if((current?.revision??null)!==revision)throw new Error('Ton avatar a changé. Recharge la page avant de valider ce portrait.');window.fixtureAvatarWrites++;const row={...current,user_id:owner,revision:(revision??0)+1,configuration:current?.configuration??window.fixtureDefaultAvatar,portrait_ia:portrait};rows.set(owner,row);return row}`)
fs.writeFileSync(path.join(dir, 'entry.js'), `
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import SelfieAvatarGenerator from '../../components/avatars/SelfieAvatarGenerator';import AvatarPage from '../../components/avatars/AvatarPage';import {DashboardUserContext} from '../../components/DashboardUserContext';import AvatarProvider from '../../components/avatars/DashboardAvatarContext';import Badge from '../../components/avatars/AccountAvatarBadge';import {DEFAULT_AVATAR_V3} from '../../lib/avatar-collection-v3';window.fixtureDefaultAvatar=DEFAULT_AVATAR_V3;
window.fixtureOwner='compte-a';window.fixtureOnline=true;window.fixtureSignedOut=false;window.fixtureAuthListeners=new Set();window.fixtureCalls=[];window.fixtureGenerated=[];window.fixtureActiveURLs=new Set();
const createURL=URL.createObjectURL.bind(URL),revokeURL=URL.revokeObjectURL.bind(URL);URL.createObjectURL=b=>{const url=createURL(b);window.fixtureActiveURLs.add(url);return url};URL.revokeObjectURL=url=>{window.fixtureActiveURLs.delete(url);revokeURL(url)};
Object.defineProperty(navigator,'onLine',{get:()=>window.fixtureOnline,configurable:true});
const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const context=canvas.getContext('2d');context.fillStyle='#173456';context.fillRect(0,0,1024,1024);context.fillStyle='#d8b568';context.beginPath();context.arc(700,300,160,0,Math.PI*2);context.fill();const avatarBlob=new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
window.fetch=async(url,options)=>{if(url!=='/api/avatars/generate')throw new Error('Réseau externe interdit');const photo=options.body.get('photo'),digest=await crypto.subtle.digest('SHA-256',await photo.arrayBuffer());window.fixtureCalls.push({consent:options.body.get('consent'),photoType:photo.type,photoSize:photo.size,photoDigest:Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join(''),cache:options.cache,method:options.method,fields:Array.from(options.body.keys()).sort()});
if(window.fixtureDelay)await new Promise(resolve=>{window.fixtureRelease=resolve});
if(window.fixtureError){const status=window.fixtureError;window.fixtureError=null;return Response.json({error:{message:status===429?'Quota fictif atteint.':'Session expirée. Reconnecte-toi.'}},{status})}
return new Response(await avatarBlob,{headers:{'Content-Type':'image/png','X-Ephemer-Avatar-Prompt':'celeste-cartoon-v1'}})};
function App(){const[owner,setOwner]=useState('compte-a'),[shown,setShown]=useState(true);window.fixtureOwner=owner;return React.createElement('main',{className:'mx-auto max-w-3xl p-3'},React.createElement('nav',{className:'mb-4 flex flex-wrap gap-2'},...[
['Thème',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark'}],
['Changer de compte',()=>setOwner(owner==='compte-a'?'compte-b':'compte-a')],
['Hors ligne',()=>{window.fixtureOnline=!window.fixtureOnline;window.dispatchEvent(new Event(window.fixtureOnline?'online':'offline'))}],
['Fermer',()=>setShown(false)],['Ouvrir',()=>setShown(true)],
['Déconnexion',()=>{window.fixtureSignedOut=true;for(const fn of window.fixtureAuthListeners)fn('SIGNED_OUT',null)}]
].map(([label,onClick])=>React.createElement('button',{key:label,type:'button',className:'min-h-11 rounded-xl border border-line px-3',onClick},label))),shown&&(${pageMode}?React.createElement(DashboardUserContext.Provider,{value:{id:owner,email:owner+'@example.invalid'}},React.createElement(AvatarProvider,{ownerId:owner},React.createElement('div',{'data-profile-badge':true,className:'h-16 w-16'},React.createElement(Badge,{initiale:'A'})),React.createElement(AvatarPage))):React.createElement(SelfieAvatarGenerator,{ownerId:owner,onGenerated:r=>window.fixtureGenerated.push({owner,fileName:r.file.name,promptVersion:r.promptVersion})}))) };createRoot(document.getElementById('root')).render(React.createElement(App));
`)
const webpack = require('next/dist/compiled/webpack/webpack').webpack
webpack({ mode: 'development', entry: path.join(dir, 'entry.js'), output: { path: dir, filename: 'bundle.js' }, resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': root } }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(dir, 'loader.cjs') }] }, devtool: false, plugins: [new webpack.DefinePlugin({ 'process.env': JSON.stringify({ NODE_ENV: 'development' }) }), new webpack.NormalModuleReplacementPlugin(/supabase-browser$|avatar-data$|ContactDraftProvider$|^next\/link$/, r => { r.request = path.join(dir, r.request.endsWith('supabase-browser') ? 'supabase.js' : r.request.endsWith('avatar-data') ? 'avatar-data.js' : r.request === 'next/link' ? 'link.js' : 'draft.js') })] }, async (error, stats) => {
  if (error || stats.hasErrors()) { console.error(error || stats.toString({ all: false, errors: true })); process.exitCode = 1; return }
  const css = await require('postcss')([require('@tailwindcss/postcss')()]).process(fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8'), { from: path.join(root, 'app/globals.css') })
  fs.writeFileSync(path.join(dir, 'style.css'), css.css)
  const html = '<!doctype html><html lang="fr" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aperçu fictif avatar céleste</title><link rel="stylesheet" href="/style.css"></head><body style="margin:0;font-family:system-ui"><div id="root"></div><script src="/bundle.js"></script></body></html>'
  http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1:' + previewPort), file = ['/bundle.js', '/style.css'].includes(url.pathname) ? path.join(dir, url.pathname.slice(1)) : null
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' blob: data:")
    res.setHeader('Content-Type', file?.endsWith('.css') ? 'text/css' : file ? 'text/javascript' : 'text/html; charset=utf-8')
    res.end(file ? fs.readFileSync(file) : html)
  }).listen(previewPort, '127.0.0.1', () => console.log('PREVIEW_READY http://127.0.0.1:' + previewPort + ' — avatar et compte fictifs'))
})
