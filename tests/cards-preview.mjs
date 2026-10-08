// 🎨 Composants/CSS réels, message fictif et aucune base ou API distante.
// node tests/cards-preview.mjs — http://127.0.0.1:3208
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url),root=process.cwd(),dir=path.join(root,'out/cards-preview')
fs.mkdirSync(dir,{recursive:true})
fs.writeFileSync(path.join(dir,'loader.cjs'),`const ts=require('typescript');module.exports=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText`)
fs.writeFileSync(path.join(dir,'draft.js'),`const drafts=new Set();const registerPrivateDraft=(id,dirty)=>dirty?drafts.add(id):drafts.delete(id);export function useContactDraft(){return {registerPrivateDraft,hasPrivateDraft:()=>drafts.size>0}}`)
fs.writeFileSync(path.join(dir,'link.js'),`import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}`)
fs.writeFileSync(path.join(dir,'avatar.js'),`
import {DEFAULT_AVATAR_V1,avatarConfig} from '../../lib/avatars';
const avatars=new Map();
export async function loadAvatar(owner){return structuredClone(avatars.get(owner)||null)}
export async function saveAvatar(owner,revision,configuration){if(window.previewConflict){window.previewConflict=false;throw new Error('Conflit fictif : relis la version enregistrée.')};const row={user_id:owner,revision:(revision||0)+1,configuration:avatarConfig(configuration)};avatars.set(owner,row);if(window.previewLoseNext){window.previewLoseNext=false;throw new Error('Réponse perdue fictive : relis la version enregistrée.')};return structuredClone(row)}
export async function avatarForCard(owner){return avatarConfig(avatars.get(owner)?.configuration||DEFAULT_AVATAR_V1)}
`)
fs.writeFileSync(path.join(dir,'data.js'),`
const cards=new Map(),operations=new Map();
const blank=()=>({draft:null,share:null});
export const draftSnapshot=r=>({format:r.rendu_version,templateId:r.modele_id,templateVersion:1,renderVersion:r.rendu_version,message:r.message,signature:r.signature,...(r.rendu_version===2?{avatar:structuredClone(r.avatar_signature)}:{})});
export async function loadCard(owner){return structuredClone(cards.get(owner)||blank())}
export async function saveCard(owner,preparation,id,revision,value){
if(window.previewConflict){window.previewConflict=false;throw new Error('Conflit fictif : saisie conservée. Relis la carte.')}
const previous=cards.get(owner)||blank();const draft={id,user_id:owner,preparation_id:preparation,revision:(revision||0)+1,modele_id:value.templateId,modele_version:1,rendu_version:value.renderVersion,avatar_signature:structuredClone(value.avatar||null),message:value.message,signature:value.signature};cards.set(owner,{...previous,draft});return structuredClone(draft)}
export async function cardOperation(owner,id,op){const card=cards.get(owner);if(!operations.has(op.operationId)){
card.draft.revision++;card.share={revision:card.draft.revision,versionId:card.share?.versionId||crypto.randomUUID(),linkId:crypto.randomUUID(),state:op.action==='revoquer'?'revoque':'actif',expiresAt:new Date(Date.now()+60000).toISOString(),published:op.action==='publier'?draftSnapshot(card.draft):card.share.published};operations.set(op.operationId,true)}
if(window.previewLoseNext){window.previewLoseNext=false;throw new Error('Réponse perdue fictive')};return structuredClone(card.share)}
export async function recoverCardLink(owner){const card=cards.get(owner);if(card.share.state!=='actif')throw new Error('Cette carte est indisponible');return {secret:'A'.repeat(43),linkId:card.share.linkId,expiresAt:card.share.expiresAt}}
export async function cardRequest(owner){cards.delete(owner);return {deleted:true}}
export async function fixtureRead(){const card=cards.get(window.previewOwner);return card?.share?.state==='actif'?{content:card.share.published,expiresAt:card.share.expiresAt}:null}
`)
fs.writeFileSync(path.join(dir,'entry.js'),`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import CardPreview from '../../components/cards/CardPreview';import ProfileAvatar from '../../components/avatars/ProfileAvatar';
import PublicCardScreen from '../../components/cards/PublicCardScreen';import {fixtureRead} from './data';
window.fetch=async(path)=>{if(path!=='/api/cartes/consulter')throw new Error('Réseau externe interdit');const data=await fixtureRead();return Response.json(data||{error:'Cette carte est indisponible'},{status:data?200:404})};
function App(){const[owner,setOwner]=useState('A'),[theme,setTheme]=useState('dark'),[visitor,setVisitor]=useState(false);window.previewOwner=owner;return React.createElement(React.Fragment,null,
React.createElement('nav',{className:'flex flex-wrap gap-3 border-b border-line p-3 text-ink'},React.createElement('span',null,'Recette fictive : données en mémoire, aucun compte distant'),
React.createElement('button',{onClick:()=>{const next=theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;setTheme(next)}},'Thème'),
React.createElement('button',{onClick:()=>setOwner(value=>value==='A'?'B':'A')},'Compte '+owner),
React.createElement('button',{onClick:()=>{window.previewLoseNext=true}},'Perdre la prochaine réponse'),
React.createElement('button',{onClick:()=>{window.previewConflict=true}},'Conflit au prochain enregistrement'),
React.createElement('button',{onClick:()=>{location.hash='A'.repeat(43);setVisitor(value=>!value)}},visitor?'Éditeur':'Destinataire fictif')),
visitor?React.createElement(PublicCardScreen):React.createElement('main',{className:'mx-auto max-w-4xl p-4 text-ink'},React.createElement(ProfileAvatar,{key:'avatar-'+owner,ownerId:owner}),React.createElement(CardPreview,{key:owner,ownerId:owner,preparationId:'fixture-preparation',preparedMessage:owner==='A'?'Une journée lumineuse et de belles découvertes !\\nAvec toute mon affection.':undefined})))
};createRoot(document.getElementById('root')).render(React.createElement(App));
`)
const webpack=require('next/dist/compiled/webpack/webpack').webpack
webpack({mode:'development',entry:path.join(dir,'entry.js'),output:{path:dir,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':root}},
 module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(dir,'loader.cjs')}]},devtool:false,
 plugins:[new webpack.NormalModuleReplacementPlugin(/ContactDraftProvider$|card-data$|avatar-data$|^next\/link$/,resource=>{resource.request=path.join(dir,resource.request==='next/link'?'link.js':resource.request.endsWith('card-data')?'data.js':resource.request.endsWith('avatar-data')?'avatar.js':'draft.js')})],
},async(error,stats)=>{
 if(error||stats.hasErrors()){console.error(error||stats.toString({all:false,errors:true}));process.exitCode=1;return}
 const css=await require('postcss')([require('@tailwindcss/postcss')()]).process(fs.readFileSync(path.join(root,'app/globals.css'),'utf8'),{from:path.join(root,'app/globals.css')})
 fs.writeFileSync(path.join(dir,'style.css'),css.css)
 const html='<!doctype html><html lang="fr" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aperçu fictif des cartes Ephemer</title><link rel="stylesheet" href="/style.css"></head><body style="margin:0;font-family:system-ui"><div id="root"></div><script src="/bundle.js"></script></body></html>'
 http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://127.0.0.1:3208').pathname
  const file=['/bundle.js','/style.css'].includes(pathname)?path.join(dir,pathname.slice(1)):null
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'none'")
  res.setHeader('Content-Type',file?.endsWith('.css')?'text/css':file?.endsWith('.js')?'text/javascript':'text/html; charset=utf-8')
  res.end(file?fs.readFileSync(file):html)
 }).listen(3208,'127.0.0.1',()=>console.log('PREVIEW_READY http://127.0.0.1:3208 — message fictif, aucun accès distant'))
})
