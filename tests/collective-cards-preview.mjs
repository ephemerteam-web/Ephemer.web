// Composants/CSS/export PNG réels ; mémoire fictive, aucune connexion Supabase/Resend.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url),root=process.cwd(),dir=path.join(root,'out/collective-cards/preview')
fs.mkdirSync(dir,{recursive:true})
fs.writeFileSync(path.join(dir,'loader.cjs'),`const ts=require('typescript');module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText`)
fs.writeFileSync(path.join(dir,'entry.js'),String.raw`
import React,{useState,useRef} from 'react';import{createRoot}from'react-dom/client';
import CollectiveCardPanel from '../../../components/celebrations/CollectiveCardPanel';
import CollectivePublishedCard from '../../../components/cards/CollectivePublishedCard';
import{createCollectiveState,applyCollectiveCommand}from'../../../lib/collective-card-workflow';
import{DEFAULT_AVATAR_V3}from'../../../lib/avatar-collection-v3';
const uid=n=>'72000000-0000-4000-8000-'+String(n).padStart(12,'0'),A=uid(1),B=uid(2),R=uid(3),PA=uid(11),PB=uid(12),C=uid(20);
const actor=id=>({account:id,verified:true,verifiedEmail:id===A?'alice@example.invalid':'bruno@example.invalid'});
const env=()=>({now:Date.now(),members:[{participation:PA,account:A,generation:1,role:'organisateur'},{participation:PB,account:B,generation:1,role:'participant'}],recipientAccount:R,celebrationState:'active',digest:value=>value});
const initial=()=>createCollectiveState(C,actor(A),env(),'Sous les étoiles','clair_de_lune','recipient@example.invalid');
let state=initial(),seq=100;
const run=(data,who=A)=>{state=applyCollectiveCommand(state,actor(who),{operation:uid(++seq),revision:state.revision,data},env())};
run({action:'inviter',participation:PA});run({action:'inviter',participation:PB});run({action:'confirmer',content:{message:'Un souvenir lumineux pour toi.',signature:'Bruno',avatar:null},consent:true},B);
window.fixtureCommands=[];window.fixtureOnline=true;window.fixtureLost=false;window.fixtureRevoked=false;window.fixtureExports=0;window.fixtureShares=0;
Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>window.fixtureOnline});
function view(owner){const version=state.versions.find(row=>!row.revoked);return{id:state.id,revision:state.revision,title:state.title,templateId:state.template,phase:state.phase,validated:!!state.validation,isOrganizer:owner===A,mine:state.contributions.find(row=>row.author===owner)?.content??null,invited:state.invited.includes(owner===A?PA:PB),responsible:'Alice',responsibleParticipation:PA,nextAction:state.phase==='ouverte'?'Compléter les contributions':state.validation?'Publier ou programmer':'Valider l’aperçu',members:env().members.map(row=>({...row,name:row.account===A?'Alice':'Bruno',invited:state.invited.includes(row.participation),signed:state.contributions.some(c=>c.author===row.account),organizer:row.role==='organisateur'})),contributions:state.contributions.map(row=>({...row,name:row.author===A?'Alice':'Bruno',own:row.author===owner})),published:version?{version:version.id,content:version.content,expiresAt:version.expiresAt}:null,publicationState:version?'Publiée':'Non publiée',emailState:state.plan?.emailState??'absent',reports:[]}}
function App(){const[owner,setOwner]=useState(A),[epoch,refresh]=useState(0),[reader,setReader]=useState(false),[long,setLong]=useState(false),[revoked,setRevoked]=useState(false),ownerRef=useRef(owner);ownerRef.current=owner;
 const update=()=>refresh(v=>v+1);
 async function command(value){window.fixtureCommands.push(structuredClone(value));if(!navigator.onLine)throw new Error('Panne réseau fictive. Ta saisie est conservée.');state=applyCollectiveCommand(state,actor(owner),value,env());if(window.fixtureLost){window.fixtureLost=false;throw new Error('Réponse fictive perdue. Réessaie la même commande.')}update()}
 const current=view(owner),published=current.published;
 async function verify(){if(revoked||window.fixtureRevoked||!navigator.onLine||!published)throw new Error('Cette carte est indisponible.');return published.content}
 const controls=[['Changer de compte',()=>{setOwner(owner===A?B:A);setReader(false)}],['Réponse perdue',()=>{window.fixtureLost=true}],['Hors ligne',()=>{window.fixtureOnline=!window.fixtureOnline;window.dispatchEvent(new Event(window.fixtureOnline?'online':'offline'));update()}],['Voir le destinataire',()=>setReader(true)],['Révoquer',()=>{window.fixtureRevoked=true;setRevoked(true)}],['Carte longue',()=>{if(!published)return;state.versions.find(row=>!row.revoked).content.contributions=Array.from({length:30},(_,i)=>({message:('Un beau souvenir pour toi. ').repeat(16),signature:'Signature '+(i+1),avatar:null}));setLong(true);setReader(true);update()}]];
 return React.createElement('main',{className:'mx-auto max-w-4xl space-y-4 p-3 text-ink'},React.createElement('nav',{className:'flex flex-wrap gap-2'},React.createElement('p',{className:'w-full text-sm'},'Recette fictive — aucun service externe'),...controls.map(([label,onClick])=>React.createElement('button',{key:label,className:'min-h-11 rounded-xl border border-line px-3',onClick},label))),!navigator.onLine&&React.createElement('p',{role:'status'},'Hors ligne : connexion requise.'),revoked?React.createElement('p',{role:'status'},'Cette carte est indisponible.'):reader?(published?React.createElement(CollectivePublishedCard,{key:owner+published.version+long,snapshot:published.content,expiresAt:published.expiresAt,accessKey:published.version,verify}):React.createElement('p',null,'Publication requise.')):React.createElement(CollectiveCardPanel,{key:owner,view:current,command,verify,chooseAvatar:async()=>structuredClone(DEFAULT_AVATAR_V3)}))
}createRoot(document.getElementById('root')).render(React.createElement(App));
`)
const webpack=require('next/dist/compiled/webpack/webpack').webpack
webpack({mode:'development',entry:path.join(dir,'entry.js'),output:{path:dir,filename:'bundle.js',publicPath:'/'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':root}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(dir,'loader.cjs')}]},devtool:false,plugins:[new webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'test'})})]},async(error,stats)=>{
 if(error||stats.hasErrors()){console.error(error||stats.toString({all:false,errors:true}));process.exitCode=1;return}
 const css=await require('postcss')([require('@tailwindcss/postcss')()]).process(fs.readFileSync('app/globals.css','utf8'),{from:path.join(root,'app/globals.css')});fs.writeFileSync(path.join(dir,'style.css'),css.css)
 const html='<!doctype html><html lang="fr" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recette carte collective</title><link rel="stylesheet" href="/style.css"></head><body style="margin:0;font-family:system-ui"><div id="root"></div><script src="/bundle.js"></script></body></html>'
 http.createServer((req,res)=>{const pathname=new URL(req.url,'http://127.0.0.1:3224').pathname;const filename=path.basename(pathname),file=/^[\w.-]+\.(?:js|css)$/.test(filename)?path.join(dir,filename):null;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:");res.setHeader('Content-Type',file?.endsWith('.css')?'text/css':file?'text/javascript':'text/html; charset=utf-8');res.end(file&&fs.existsSync(file)?fs.readFileSync(file):html)}).listen(3224,'127.0.0.1',()=>console.log('PREVIEW_READY http://127.0.0.1:3224'))
})
