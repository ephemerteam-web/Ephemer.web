// Prépare uniquement un contrôle syntaxique READ ONLY ; aucun corps métier exécuté.
import fs from 'node:fs'
const sql=fs.readFileSync('docs/evolution/celebrations/schema-propose.sql','utf8')
const functions=[...sql.matchAll(/CREATE FUNCTION ([\w.]+)\((.*?)\) RETURNS ([^\n]+)\nLANGUAGE (\w+)[^]*? AS \$fn\$([^]*?)\$fn\$;/g)]
let output="BEGIN READ ONLY;\nSET LOCAL statement_timeout='30s';\n"
let count=0
for(const [,name,args,returns,language,body] of functions){
  if(language!=='plpgsql')continue
  const params=args?args.replace(/ DEFAULT (NULL|100)/g,'').split(',').map(a=>a.trim()+';').join('\n'):''
  const safeBody=body.replace(/ephemer_celebrations\.[a-z_]+(?=;)/g,'record').replace(/RETURN ([^;]+);/g,'PERFORM $1; RETURN;').replace(/END\s*$/,'END;')
  output+=`-- ${name}, types futurs remplacés par record : liaisons non validées.\nDO $syntaxe$\nDECLARE ${params}\n${returns==='trigger'?'NEW record; OLD record;':''}\nBEGIN IF false THEN\n${safeBody}\nEND IF; END $syntaxe$;\n`
  count++
}
// Vérifier la validation pure sur constantes, sans installer la fonction.
const validator=functions.find(f=>f[1]==='ephemer_celebrations.commande_valide')[5]
  .replace(/RETURN (true|false);/g,'obtenu:=$1; EXIT validation;').replace(/END\s*$/,'END;')
output+=`DO $constantes$ DECLARE cas record; action text; d jsonb; obtenu boolean; BEGIN
FOR cas IN SELECT * FROM (VALUES
 ('creer','{"id":"11000000-0000-4000-8000-000000000001","titre":"Repas","date":null,"heure":null,"lieu":null,"mode":"seul","surprise":false,"destinataire":null}'::jsonb,true),
 ('creer','{"id":"11000000-0000-4000-8000-000000000001","titre":"Repas","date":"2026-02-30","heure":null,"lieu":null,"mode":"seul","surprise":false,"destinataire":null}'::jsonb,false),
 ('creer','{"id":"11000000-0000-4000-8000-000000000001","titre":"Repas","date":null,"heure":null,"lieu":null,"mode":"seul","surprise":null,"destinataire":null}'::jsonb,false),
 ('supprimer','{"id":"11000000-0000-4000-8000-000000000001","revision":1,"confirmer":true,"userId":"autre"}'::jsonb,false),
 ('modifier_commentaire','{"id":"11000000-0000-4000-8000-000000000001","commentaire":"11000000-0000-4000-8000-000000000002","revision":1.5,"texte":"Bonjour"}'::jsonb,false)
) fixtures(a,v,attendu) LOOP action:=cas.a; d:=cas.v; obtenu:=NULL; <<validation>> ${validator}
IF obtenu IS DISTINCT FROM cas.attendu THEN RAISE EXCEPTION 'Validation pure divergente'; END IF; END LOOP; END $constantes$;
`
let recipeBlocks=0
for(const file of ['verification.sql','recette-copie.sql','fixtures-concurrence.sql','concurrence-session-A.sql','concurrence-session-B.sql','concurrence-verification.sql']){
 const content=fs.readFileSync('docs/evolution/celebrations/'+file,'utf8')
 for(const [,label,body] of content.matchAll(/DO \$(\w+)\$([^]*?)\$\1\$;/g)){
  output+=`-- ${file}/${label}, aucune instruction de recette exécutée.\nDO $syntaxe_recette$ BEGIN IF false THEN\n${body.trim().replace(/END\s*$/,'END;')}\nEND IF; END $syntaxe_recette$;\n`
  recipeBlocks++
 }
}
output+="SELECT 'celebrations_syntaxe_et_constantes_ok' AS resultat; COMMIT;\n"
fs.mkdirSync('out/celebrations-b',{recursive:true});fs.writeFileSync('out/celebrations-b/syntaxe-lecture-seule.sql',output)
console.log(count+' corps PL/pgSQL et '+recipeBlocks+' blocs de recette préparés en branches inaccessibles ; aucun objet installé, aucune validation des liaisons futures.')
