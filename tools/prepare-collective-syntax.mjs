// Vérification syntaxique seulement : branches inaccessibles, types futurs remplacés par record.
import fs from 'node:fs'
const dir='docs/evolution/lot-13-14'
let query="BEGIN READ ONLY;\nSET LOCAL statement_timeout='30s';\n",count=0
for(const file of ['01-journal.sql','02-cartes.sql','03-envoi.sql','04-raccordement.sql']){
 const source=fs.readFileSync(dir+'/'+file,'utf8')
 const functions=[...source.matchAll(/CREATE(?: OR REPLACE)? FUNCTION ([\w.]+)\(([^]*?)\)\s+RETURNS ([^]*?)LANGUAGE (\w+)[^]*?\bAS \$(\w*)\$([^]*?)\$\5\$;/g)]
 for(const [,name,args,returns,language,,body] of functions){
  if(language!=='plpgsql')continue
  const params=args.replace(/ DEFAULT (NULL|true|false|\d+)/gi,'').split(',').filter(Boolean).map(value=>value.trim()+';').join('\n')
  const safe=body.replace(/\b(?:ephemer_celebrations|public)\.[a-z_]+(?=;)/g,'record').replace(/RETURN ([^;]+);/g,'PERFORM $1; RETURN;').replace(/END\s*$/,'END;')
  query+=`-- ${name} : syntaxe seulement, aucun objet ni liaison validés.\nDO $syntaxe$ DECLARE ${params}\n${returns.trim()==='trigger'?'NEW record; OLD record; TG_OP text;':''}\nBEGIN IF false THEN\n${safe}\nEND IF; END $syntaxe$;\n`
  count++
 }
}
query+=`SELECT '${count} corps PLpgSQL : syntaxe seule, aucune installation' AS resultat; ROLLBACK;\n`
fs.mkdirSync('out/collective-cards',{recursive:true});fs.writeFileSync('out/collective-cards/syntaxe-lecture-seule.sql',query)
console.log(count+' corps préparés, sans exécution métier.')
