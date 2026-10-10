// Recette navigateur des vrais formulaires, sans base, compte ou envoi réel.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),root=process.cwd(),dir=path.join(root,'out/invitations-preview')
fs.mkdirSync(dir,{recursive:true})
fs.writeFileSync(path.join(dir,'loader.cjs'),"const ts=require('typescript');module.exports=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText")
fs.writeFileSync(path.join(dir,'mocks.js'),`import React from 'react';
export const user={id:'10000000-0000-4000-8000-000000000001',email:'camille@example.invalid',email_confirmed_at:'2026-10-01',is_anonymous:false};
let signed=sessionStorage.getItem('fixture-signed')==='true';const listeners=new Set();export function login(){signed=true;sessionStorage.setItem('fixture-signed','true');listeners.forEach(fn=>fn('SIGNED_IN',{user}))}
export function logout(){signed=false;sessionStorage.removeItem('fixture-signed');listeners.forEach(fn=>fn('SIGNED_OUT',null))}
export const supabase={auth:{getUser:async()=>({data:{user:signed?user:null},error:null}),onAuthStateChange:fn=>{listeners.add(fn);return {data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}}},signInWithPassword:async()=>{login();return {data:{user},error:null}}}};
export const useDashboardUser=()=>user;
export const router={replace:url=>{location.href=url},push:url=>{location.href=url},back:()=>history.back()};
export const useRouter=()=>router;export const usePathname=()=>location.pathname;
export function Link({children,prefetch,...props}){return React.createElement('a',props,children)}
export default function Layout({children}){return React.createElement('div',null,children)}
export const data={prenom:'Camille',nom:'Martin',anniversaire:{day:29,month:2,year:null},relation:'ami',interets:['Romans','Cuisine'],noteLibre:'Du thé, des livres et de longues promenades.',email:user.email,indicatif:'+33',tel:'612345678',conserver:true};
export const recovery={id:'10000000-0000-4000-8000-000000000003',createdAt:'2026-10-10T10:00:00Z',expiresAt:'2026-11-09T10:00:00Z',donnees:data};
export const row={id:recovery.id,revision:3,donnees:data,candidats:[{...data,id:'9007199254740993',empreinte:'fixture-contact',note:'Note privée de mon carnet',tel:'699999999'}]};
export const readFirstProfile=async()=>({complete:false,prenom:'',nom:'',anniversaire:null,email:user.email,indicatif:'+33',tel:'',passions:'',presentation:'',revisionUnivers:0,empreinte:'fixture-profile'});
export const readRecoveries=async()=>[recovery];export const readPendingAnswers=async()=>[row];
export const continueAfterAuth=async()=>'/etoile';
export const invitationRpc=async(name,args)=>{window.fixtureCalls.push({name,args});if(window.fixtureFailure)throw Error('Panne simulée. Ta saisie est conservée.');return {ok:true,succes:true}};
export const sendEtoileCommand=async(owner,command)=>{window.fixtureCalls.push({name:'etoile',command});return {ok:true,message:'Demande déjà envoyée ou prise en compte.'}};
export class EtoilesRequestError extends Error{};
export function notifyContactsChanged(){};export function notifyNotificationsChanged(){};
`)
fs.writeFileSync(path.join(dir,'entry.js'),`import React from 'react';import {createRoot} from 'react-dom/client';
import Profile from '../../app/completer-profil/page';import Public from '../../app/invitation/[token]/FormulaireInvitation';import Star from '../../components/etoiles/PublicEtoileScreen';import Connexion from '../../app/connexion/page';import {Answer} from '../../components/InvitationAnswers';import {login,row} from './mocks';
window.fixtureCalls=[];window.fixtureFailure=false;const p=location.pathname;if(p!='/etoile'&&p!='/connexion')login();
const content=p==='/profile'?React.createElement(Profile):p==='/conflict'?React.createElement(Answer,{row,owner:'10000000-0000-4000-8000-000000000001',onSaved:()=>document.querySelector('[data-fixture-status]').textContent='Fiche traitée'}):p==='/etoile'?React.createElement(Star):p==='/connexion'?React.createElement(Connexion):React.createElement(Public,{token:'fixture',prenomHote:'Alex'});
createRoot(document.getElementById('root')).render(React.createElement('div',null,React.createElement('div',{className:'flex gap-3 p-3',style:{flexWrap:'wrap'}},React.createElement('button',{onClick:()=>document.documentElement.dataset.theme=document.documentElement.dataset.theme==='light'?'dark':'light'},'Thème'),React.createElement('button',{onClick:()=>window.fixtureFailure=!window.fixtureFailure},'Simuler une panne'),React.createElement('p',{'data-fixture-status':true})),content));
`)
const webpack=require('next/dist/compiled/webpack/webpack').webpack
fs.writeFileSync(path.join(dir,'link.js'),"export {Link as default} from './mocks'")
webpack({mode:'development',entry:path.join(dir,'entry.js'),output:{path:dir,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':root}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(dir,'loader.cjs')}]},devtool:false,plugins:[new webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})}),new webpack.NormalModuleReplacementPlugin(/^next\/link$|^next\/navigation$|supabase-browser$|invitation-data$|etoiles-data$|DashboardUserContext$|contact-changes$|notification-changes$|AppLayout$/,resource=>{
 resource.request=path.join(dir,resource.request==='next/link'?'link.js':'mocks.js')
})]},async(error,stats)=>{
 if(error||stats.hasErrors()){console.error(error||stats.toString({all:false,errors:true}));process.exitCode=1;return}
 const css=await require('postcss')([require('@tailwindcss/postcss')()]).process(fs.readFileSync(path.join(root,'app/globals.css'),'utf8'),{from:path.join(root,'app/globals.css')});fs.writeFileSync(path.join(dir,'style.css'),css.css)
 const html='<!doctype html><html lang="fr" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recette invitations</title><link rel="stylesheet" href="/style.css"></head><body style="margin:0;font-family:system-ui"><div id="root"></div><script src="/bundle.js"></script></body></html>'
 http.createServer((req,res)=>{const pathname=new URL(req.url,'http://127.0.0.1:3219').pathname;const file=pathname.startsWith('/')&&!pathname.includes('..')?path.join(dir,pathname.slice(1)):'';const asset=fs.existsSync(file)&&fs.statSync(file).isFile();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',asset?(file.endsWith('.css')?'text/css':'text/javascript'):'text/html; charset=utf-8');res.end(asset?fs.readFileSync(file):html)}).listen(3219,'127.0.0.1',()=>console.log('PREVIEW_READY http://127.0.0.1:3219'))
})
