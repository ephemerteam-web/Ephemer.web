// Contrôle préparé exclusivement en READ ONLY. Données synthétiques via CTE, jamais de fixtures persistantes.
import fs from 'node:fs'
import {productionFunctions} from './prepare-celebrations-production.mjs'
const {changed}=productionFunctions(fs.readFileSync('docs/evolution/celebrations/schema-propose.sql','utf8'))
let sql="BEGIN READ ONLY;\nSET LOCAL statement_timeout='30s';\n"
let functions=0
// Compiler aussi les blocs de garde/remplacement, sans entrer dans aucune branche.
// Les DDL restent des chaînes SQL inaccessibles ; aucune installation n'est tentée.
let blocks=0
for(const filename of ['correctifs-production.sql','verification-production.sql']){
 const content=fs.readFileSync('docs/evolution/celebrations/'+filename,'utf8')
 for(const match of content.matchAll(/DO \$(\w+)\$([\s\S]*?)\$\1\$;/g)){
  sql+=`-- ${filename} / ${match[1]} : compilation seule.\nDO $bloc_syntaxe$ BEGIN IF false THEN\n${match[2]}\n; END IF; END $bloc_syntaxe$;\n`
  blocks++
 }
}
for(const f of changed.values()){
 if(f.language!=='plpgsql')continue
 const params=f.args.split(',').map(s=>s.trim()+';').join('\n')
 const body=f.body.replace(/RETURN ([^;]+);/g,'PERFORM $1; RETURN;').replace(/END\s*$/,'END;')
 sql+=`-- ${f.name} : syntaxe seule, aucune branche metier executee.\nDO $syntaxe$ DECLARE ${params}\nBEGIN IF false THEN\n${body}\nEND IF; END $syntaxe$;\n`;functions++
}
const A='71000000-0000-4000-8000-000000000001',B='71000000-0000-4000-8000-000000000002',C='72000000-0000-4000-8000-000000000001'
const cases=[
 {name:'organisateur destinataire ordinaire suspendu',surprise:false,target:A,state:'suspendue',member:'maintenance',valid:true,maintenance:true,read:false},
 {name:'destinataire surprise exclu meme organisateur',surprise:true,target:A,state:'suspendue',member:'maintenance',valid:true,maintenance:false,read:false},
 {name:'surprise valide, resolution permise',surprise:true,target:B,state:'suspendue',member:'maintenance',valid:true,maintenance:true,read:false},
 {name:'destinataire efface, cloture seulement',surprise:true,target:B,state:'suspendue',member:'maintenance',absent:true,valid:false,maintenance:true,read:false},
 {name:'destinataire supprime en douceur',surprise:true,target:B,state:'active',member:'active',deleted:true,valid:false,maintenance:true,read:false},
 {name:'destinataire non confirme',surprise:true,target:B,state:'active',member:'active',unconfirmed:true,valid:false,maintenance:true,read:false},
 {name:'destinataire anonyme',surprise:true,target:B,state:'active',member:'active',anonymous:true,valid:false,maintenance:true,read:false},
 {name:'preparation personnelle sans identite',surprise:true,target:null,mode:'seul',state:'active',member:'active',absent:true,valid:true,maintenance:false,read:true},
 {name:'ancien membre refuse',surprise:true,target:B,state:'suspendue',member:'partie',absent:true,valid:false,maintenance:false,read:false},
 {name:'participant ne devient pas organisateur',surprise:true,target:B,state:'suspendue',member:'active',role:'participant',absent:true,valid:false,maintenance:false,read:false},
 {name:'celebration ordinaire active',surprise:false,target:A,state:'active',member:'active',valid:true,maintenance:false,read:true},
 {name:'surprise active autorisee pour son organisateur',surprise:true,target:B,state:'active',member:'active',valid:true,maintenance:false,read:true},
]
function expression(name,valid){
 let text=changed.get('ephemer_celebrations.'+name).body.trim().replace(/;$/,'')
 text=text.replaceAll('ephemer_celebrations.partage_valide(c)','('+valid+')')
 text=text.replaceAll('ephemer_celebrations.celebrations','fixture_celebrations').replaceAll('ephemer_celebrations.participations','fixture_participations').replaceAll('auth.users','fixture_users')
 // Le blocage social n'est pas execute dans ces constantes ; il est teste par la recette pilote.
 text=text.replace('ephemer_social.bloquee(a,autre.compte)','false')
 return text.replace(/\bc\b/g,"'"+C+"'::uuid").replace(/\ba\b/g,"'"+A+"'::uuid")
}
for(const sample of cases){
 const valid=expression('partage_valide','true'),maintenance=expression('maintenance',valid),read=expression('lisible',valid)
 sql+=`-- ${sample.name}\nDO $constantes$ DECLARE v boolean; m boolean; l boolean; BEGIN
 WITH fixture_celebrations AS (SELECT '${C}'::uuid id,${sample.surprise} surprise,${sample.target?"'"+sample.target+"'::uuid":'NULL::uuid'} destinataire,'${sample.mode??'partage'}'::text mode,'${sample.state}'::text etat),
 fixture_participations AS (SELECT '${C}'::uuid celebration,'${A}'::uuid compte,'${sample.role??'organisateur'}'::text role,'${sample.member}'::text etat),
 fixture_users AS (SELECT '${sample.target??B}'::uuid id,${sample.deleted?'now()':'NULL::timestamptz'} deleted_at,${sample.unconfirmed?'NULL::timestamptz':'now()'} email_confirmed_at,${!!sample.anonymous} is_anonymous WHERE ${!sample.absent})
 SELECT (${valid}),(${maintenance}),(${read}) INTO v,m,l;
 IF v IS DISTINCT FROM ${sample.valid} OR m IS DISTINCT FROM ${sample.maintenance} OR l IS DISTINCT FROM ${sample.read} THEN RAISE EXCEPTION 'Constantes de droits divergentes : ${sample.name}'; END IF;
 END $constantes$;\n`
}
sql+=`SELECT 'celebrations_correctif_syntaxe_et_constantes_ok' AS resultat,${functions} AS corps_syntaxe,${blocks} AS blocs_syntaxe,${cases.length} AS scenarios_synthetiques; COMMIT;\n`
fs.mkdirSync('out/celebrations-production',{recursive:true});fs.writeFileSync('out/celebrations-production/syntaxe-constantes-lecture-seule.sql',sql)
console.log(functions+' corps et '+blocks+' blocs en branches inaccessibles, '+cases.length+' scenarios synthetiques ; aucune commande metier ni installation.')
