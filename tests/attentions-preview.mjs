// Recette visuelle isolée : composants réels, données fictives, aucun Supabase ni appel IA.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { compile } from '@tailwindcss/node'
const root=process.cwd(), nativeRequire=createRequire(import.meta.url), cache=new Map()
const occurrenceId='00000000-0000-4000-8000-000000000401'
const preparation={id:'prep-test',occurrence_id:occurrenceId,user_id:'visual-only',revision:1,etat:'ouverte',sans_achat:false}
const idea={id:'idea-test',contact_id:1,titre:'Un livre sur les constellations et une promenade sous les étoiles',note:'Note fictive : aime observer le ciel.',lien_marchand:'https://example.invalid/livre',prix_estime_centimes:2990,devise_estimee:'EUR',archivee:false,revision:1}
const choice={id:'choice-test',preparation_id:preparation.id,titre:'Livre des constellations',prix_estime_centimes:2990,devise_estimee:'EUR',etat:'prevu',montant_depense_centimes:null,devise_depensee:null,date_achat:null,revision:1}
const gift={id:'gift-test',contact_id:1,destinataire_historique:'Camille',titre:'Une sortie au planétarium',date_don:'2025-11-05',reaction:'Une très belle soirée ensemble.',choix_id:null,achat_declare:true,montant_depense_centimes:2500,devise_depensee:'EUR',date_achat:'2025-11-01',revision:1}
const data={preparation,occurrence:{id:occurrenceId,date_occurrence:'2026-11-05',cycle:2026,annulee:false},event:{titre:'Anniversaire de Camille',type_evenement:'anniversaire',archive:false},contact:{id:1,prenom:'Camille',nom:'Martin'},tasks:[
{id:'task1',type_tache:'message',titre:'Préparer un message',etat:'a_faire',brouillon_texte:'Joyeux anniversaire ! Au plaisir de fêter cette journée ensemble.',revision:1},
{id:'task2',type_tache:'cadeau',titre:'Choisir un cadeau',etat:'faite',brouillon_texte:null,revision:1}]}
const budget=['EUR','USD','GBP','CHF','CAD','SANS_DEVISE'].map(devise=>({devise,prevu:devise==='EUR'?'29.90':'0.00',depense:'0.00',nb_prevu_inconnu:devise==='SANS_DEVISE'?1:0,nb_depense_inconnu:0,nb_depense_sans_date:devise==='EUR'?1:0,depense_sans_date:devise==='EUR'?'15.00':'0.00',nb_depense_sans_date_inconnu:0}))
function source(file) {
  if(cache.has(file))return cache.get(file)
  const out={};cache.set(file,out)
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
  const require=name=>{
    if(name==='next/link')return function PreviewLink({children,...props}) { return React.createElement('a',props,children) }
    if(name==='next/navigation')return {useSearchParams:()=>new URLSearchParams(),useRouter:()=>({}),usePathname:()=>'/dashboard/preparer/test'}
    const base=name.startsWith('@/')?path.join(root,name.slice(2)):name.startsWith('.')?path.resolve(path.dirname(file),name):null
    if(base){
      if(base.endsWith('supabase-browser'))return {supabase:{}}
      if(base.endsWith('DashboardUserContext'))return {useDashboardUser:()=>({id:'visual-only',email:'test@example.invalid'})}
      if(base.endsWith('ContactDraftProvider'))return {useContactDraft:()=>({registerPrivateDraft(){}})}
      const target=['.tsx','.ts'].map(ext=>base+ext).find(fs.existsSync)
      if(!target)throw new Error('Aperçu : module absent')
      const result=source(target)
      if(base.endsWith('AttentionShared'))return {...result,useAttentionLoad:scope=>({data:scope.includes(':choices:')||scope.includes(':history:')?{choices:[choice],gifts:[gift]}:scope.includes(':ideas:')?[idea]:scope.includes(':month')||scope.includes(':year')?budget:data,reload(){}})}
      return result
    }
    return nativeRequire(name)
  }
  new Function('require','exports',code)(require,out);return out
}
const candidates=[]
function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())scan(file);else if(entry.name.endsWith('.tsx'))candidates.push(...fs.readFileSync(file,'utf8').split(/[\s"'\x60<>]+/))}}
scan(path.join(root,'app'));scan(path.join(root,'components'))
const compiler=await compile(fs.readFileSync(path.join(root,'app/globals.css'),'utf8'),{base:root,onDependency(){}})
const css=compiler.build(candidates)
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1:3204'), view=url.searchParams.get('view')??'prepare', theme=url.searchParams.get('theme')==='light'?'light':'dark'
  const Shared=source(path.join(root,'components/AttentionShared.tsx')), Gifts=source(path.join(root,'components/GiftLibrary.tsx'))
  const component=view==='budget'?React.createElement(source(path.join(root,'components/BudgetScreen.tsx')).default):view==='ideas'?React.createElement(Gifts.default):view==='edit'?React.createElement('main',{className:'mx-auto max-w-4xl p-4 space-y-4'},React.createElement(Shared.AttentionNav),React.createElement(Gifts.IdeaEditor,{idea,onSaved(){}}),React.createElement(Gifts.GiftEditor,{gift,onSaved(){}}),React.createElement(source(path.join(root,'components/AIConsent.tsx')).default,{fields:[],onChange(){}})):React.createElement(source(path.join(root,'components/PreparationScreen.tsx')).default,{occurrenceId})
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"})
  res.end('<!doctype html><html lang="fr" data-theme="'+theme+'"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recette isolée des attentions</title><style>'+css+'</style><body><p class="p-3 text-center text-sm">Données fictives · aperçu sans mutations</p>'+renderToStaticMarkup(component)+'</body></html>')
})
server.listen(3204,'127.0.0.1',()=>console.log('Recette fictive : http://127.0.0.1:3204'))
