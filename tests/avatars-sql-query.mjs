// Produit seulement une requete de validation pure, a executer en READ ONLY ; aucune installation.
import fs from 'node:fs'
import { loadPure } from './p2-helpers.mjs'
const { AVATAR_CATALOG_V1:catalog,DEFAULT_AVATAR_V1:defaultAvatar }=loadPure('lib/avatars.ts','AVATAR_CATALOG_V1,DEFAULT_AVATAR_V1')
const schema=fs.readFileSync('docs/evolution/lot-09/schema-propose.sql','utf8')
function expression(name){const start=schema.indexOf('CREATE FUNCTION ephemer_lot09.'+name+'('),begin=schema.indexOf('$fn$',start)+4,end=schema.indexOf('$fn$',begin);return schema.slice(begin,end).trim().replace(/^SELECT\s+/,'').replace(/;$/,'')}
const avatarExpr=expression('avatar_valide')
const snapshotExpr=expression('snapshot_valide').replace("ephemer_lot09.avatar_valide(p->'avatar')",`(SELECT (${avatarExpr}) FROM (SELECT p->'avatar' AS p) AS avatar_parameter)`)
const a={...defaultAvatar},s={format:2,templateId:'clair_de_lune',templateVersion:1,renderVersion:2,message:'Bonjour <script/>',signature:'Signature',avatar:a}
const avCases=[[a,true],[null,false],[[],false],[{},false]]
for(const [key,options] of Object.entries(catalog)){
 for(const option of options)avCases.push([{...a,[key]:option.id},true])
 for(const value of [null,[],{},1,'inconnu'])avCases.push([{...a,[key]:value},false])
 const missing={...a};delete missing[key];avCases.push([missing,false])
}
for(const patch of [{format:'1'},{format:2},{renderVersion:2},{catalogVersion:99},{html:'<svg onload="alert(1)"/>'},{user_id:'PRIVE'}])avCases.push([{...a,...patch},false])
const cardCases=[[s,true],[{...s,avatar:null},true],[{...s,message:''},true],[{...s,templateId:'aurore'},true],[{...s,message:'🌙'.repeat(10000)},true],...[
 {avatar:{...a,hairId:['court']}},{avatar:{...a,format:2}},{format:1},{renderVersion:1},{templateVersion:2},{message:'x'.repeat(10001)},
 {signature:'x'.repeat(201)},{profile:{email:'PRIVE'}},{avatar:'<svg/>'},{templateId:null},
].map(p=>[{...s,...p},false])]
const missing={...s};delete missing.avatar;cardCases.push([missing,false],[null,false],[[],false])
function rows(cases){return cases.map(([p,expected],id)=>`(${id},'${JSON.stringify(p).replaceAll("'","''")}'::jsonb,${expected})`).join(',\n')}
const query=`BEGIN READ ONLY;
WITH avatar_cases(id,p,expected) AS (VALUES ${rows(avCases)}),card_cases(id,p,expected) AS (VALUES ${rows(cardCases)}),results AS (
 SELECT 'avatar' AS type,id,expected,(${avatarExpr}) AS actual FROM avatar_cases
 UNION ALL SELECT 'carte',id,expected,(${snapshotExpr}) AS actual FROM card_cases
)
SELECT type,count(*) AS cas,count(*) FILTER (WHERE actual IS DISTINCT FROM expected) AS divergences,
 coalesce(jsonb_agg(id) FILTER (WHERE actual IS DISTINCT FROM expected),'[]'::jsonb) AS cas_divergents FROM results GROUP BY type;
COMMIT;`
process.stdout.write(JSON.stringify({query}))
