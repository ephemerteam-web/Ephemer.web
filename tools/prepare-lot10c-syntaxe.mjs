// Contrôle préparatoire READ ONLY : compilation PL/pgSQL dans des branches inaccessibles.
// Ni installation, ni fixture, ni appel au carnet. Les liaisons SQL exigent le schéma installé.
import fs from 'node:fs'
const source = fs.readFileSync('docs/evolution/lot-10C/schema-propose.sql', 'utf8').replace(/\r\n/g, '\n')
const functions = [...source.matchAll(/CREATE (?:OR REPLACE )?FUNCTION ([\w.]+)\(([^]*?)\) RETURNS (?:boolean|jsonb)\nLANGUAGE (plpgsql|sql)[^]*?AS \$fn\$([^]*?)\$fn\$;/g)]
const flags = '{"identite":false,"presentation":false,"passions":false,"plaisirs":false,"eviter":false}'
const validator = functions.find(m => m[1] === 'ephemer_social.ia_cadeaux_valide')[4]
  .replace(/RETURN (true|false);/g, 'obtenu:=$1; EXIT validation;')
let sql = `-- Généré ; exécution de constantes uniquement. Aucun objet créé.
BEGIN READ ONLY;
SET LOCAL search_path=pg_catalog;
SET LOCAL statement_timeout='30s';
DO $validation_constantes$
DECLARE cas record; p jsonb; i jsonb; obtenu boolean;
BEGIN
  FOR cas IN SELECT * FROM (VALUES
    ('{}'::jsonb,'${flags}'::jsonb,true),
    ('{}'::jsonb,'{}'::jsonb,false),
    ('{}'::jsonb,'${flags}'::jsonb||'{"email":true}'::jsonb,false),
    ('{}'::jsonb,jsonb_set('${flags}'::jsonb,'{identite}','true'),true),
    ('{}'::jsonb,jsonb_set('${flags}'::jsonb,'{passions}','true'),false),
    ('{"passions":true}'::jsonb,jsonb_set('${flags}'::jsonb,'{passions}','true'),true),
    ('{}'::jsonb,jsonb_set('${flags}'::jsonb,'{identite}','null'),false),
    ('null'::jsonb,'${flags}'::jsonb,false)
  ) fixtures(partage,permissions,attendu) LOOP
    p:=cas.partage; i:=cas.permissions; obtenu:=NULL;
    <<validation>>
    ${validator.trim()}
    IF obtenu IS DISTINCT FROM cas.attendu THEN RAISE EXCEPTION 'Validation constante divergente'; END IF;
  END LOOP;
END;
$validation_constantes$;
`
for (const [, name, args, language, body] of functions) {
  if (language !== 'plpgsql' || name === 'ephemer_social.ia_cadeaux_valide') continue
  const declarations = args.replace(/ DEFAULT NULL/g, '').split(',').map(arg => arg.trim() + ';').join('\n')
  const noReturn = body.replace(/RETURN ([^;]+);/g, 'PERFORM $1; RETURN;')
  sql += `-- ${name} : branche FALSE, aucune instruction de ce corps exécutée.
DO $syntaxe$
DECLARE ${declarations}
BEGIN
  IF false THEN
    ${noReturn.trim()}
  END IF;
END;
$syntaxe$;
`
}
for (const file of ['verification-lecture-seule.sql', 'verification-retour-lecture-seule.sql']) {
  const catalogue = fs.readFileSync('docs/evolution/lot-10C/' + file, 'utf8')
  for (const [, label, body] of catalogue.matchAll(/DO \$(\w+)\$([^]*?)\$\1\$;/g)) {
    sql += `-- ${file}/${label} : parsing du contrôle, sans lecture du catalogue futur.
DO $syntaxe_catalogue$
BEGIN
  IF false THEN
    ${body.trim()}
  END IF;
END;
$syntaxe_catalogue$;
`
  }
}
sql += "SELECT 'lot10c_syntaxe_plpgsql_et_constantes_ok' AS resultat;\nCOMMIT;\n"
fs.mkdirSync('out/lot10c', { recursive: true })
fs.writeFileSync('out/lot10c/syntaxe-lecture-seule.sql', sql)
console.log('Contrôle READ ONLY préparé ; branches SQL inaccessibles, sans validation des liaisons du schéma futur.')
