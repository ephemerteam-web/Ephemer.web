// Génère les dossiers de revue seulement. Aucun accès réseau, aucune application SQL.
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
const folder='docs/evolution/celebrations/'
const quote=s=>"'"+s.replaceAll("'","''")+"'"
export const bodyHash=s=>createHash('md5').update(s.replaceAll('\r','').trim()).digest('hex')
export function parseFunctions(sql){return [...sql.replaceAll('\r','').matchAll(/CREATE FUNCTION ([\w.]+)\((.*?)\) RETURNS ([^\n]+)\nLANGUAGE (\w+)([\s\S]*?) AS \$fn\$([\s\S]*?)\$fn\$;/g)].map(m=>({name:m[1],args:m[2],returns:m[3],language:m[4],options:m[5],body:m[6],ddl:m[0]}))}
function replaceOnce(source,before,after){if(source.split(before).length!==2)throw new Error('Point de correction absent ou ambigu : '+before.slice(0,80));return source.replace(before,after)}
export function productionFunctions(source){
  const original=parseFunctions(source),changed=new Map()
  function edit(name,fn){const row=original.find(f=>f.name==='ephemer_celebrations.'+name);if(!row)throw new Error(name);const body=fn(row.body);changed.set(row.name,{...row,body,ddl:row.ddl.replace(row.body,body).replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION')})}
  const valid={name:'ephemer_celebrations.partage_valide',args:'c uuid',returns:'boolean',language:'sql',options:' STABLE SECURITY INVOKER SET search_path=pg_catalog',body:`
  SELECT EXISTS(SELECT 1 FROM ephemer_celebrations.celebrations e WHERE e.id=c
    AND (NOT e.surprise OR e.mode='seul' OR EXISTS(SELECT 1 FROM auth.users u
      WHERE u.id=e.destinataire AND u.deleted_at IS NULL AND u.email_confirmed_at IS NOT NULL AND NOT u.is_anonymous)));
`}
  valid.ddl=`CREATE OR REPLACE FUNCTION ${valid.name}(${valid.args}) RETURNS boolean\nLANGUAGE sql${valid.options} AS $fn$${valid.body}$fn$;`
  changed.set(valid.name,valid)
  edit('lisible',s=>replaceOnce(s,"AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a)","AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a) AND ephemer_celebrations.partage_valide(c)"))
  edit('maintenance',s=>replaceOnce(s,"WHERE e.id=c AND e.etat='suspendue' AND m.compte=a AND m.role='organisateur' AND m.etat='maintenance'\n    AND e.destinataire IS DISTINCT FROM a",`WHERE e.id=c AND e.etat<>'supprimee' AND m.compte=a AND m.role='organisateur' AND m.etat IN ('active','maintenance')
    AND (e.etat='suspendue' OR NOT ephemer_celebrations.partage_valide(c))
    AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a)`))
  edit('invite',s=>replaceOnce(s,"AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a)","AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a) AND ephemer_celebrations.partage_valide(c)"))
  edit('resume',s=>{
    s=s.replaceAll("m.etat='maintenance'",'ephemer_celebrations.maintenance(c,a)')
    return replaceOnce(s,"'etat',e.etat,","'etat',CASE WHEN ephemer_celebrations.maintenance(c,a) THEN 'suspendue' ELSE e.etat END,")
  })
  edit('commander',s=>{
    s=replaceOnce(s,'  SELECT * INTO op FROM ephemer_celebrations.operations WHERE acteur=a AND id=operation;',`  -- Exclusions actuelles prioritaires, meme avant restitution d'un ancien resultat.
  IF e.id IS NOT NULL AND e.surprise AND e.destinataire=a THEN RAISE EXCEPTION 'Ressource indisponible' USING ERRCODE='42501'; END IF;
  IF e.id IS NOT NULL AND NOT ephemer_celebrations.partage_valide(c) AND action NOT IN ('annuler','supprimer','traiter_suppression') THEN RAISE EXCEPTION 'Partage suspendu' USING ERRCODE='42501'; END IF;
  SELECT * INTO op FROM ephemer_celebrations.operations WHERE acteur=a AND id=operation;`)
    s=replaceOnce(s,'IF ephemer_celebrations.lisible(c,a) OR maintenance OR ephemer_celebrations.invite(c,a)',"IF ephemer_celebrations.lisible(c,a) OR (maintenance AND action IN ('proposer_transfert','annuler','supprimer')) OR ephemer_celebrations.invite(c,a)")
    const collisions=`    -- Un meme UUID ne peut representer deux lignes de la liste paginee des invitations.
  -- Le verrou social commun est deja acquis ; un reessai confirme est retourne plus haut.
  IF action IN ('inviter','proposer_transfert','demander_suppression') THEN
    b:=coalesce(d->>'invitation',d->>'transfert',d->>'demande')::uuid;
    IF EXISTS(SELECT 1 FROM ephemer_celebrations.invitations WHERE id=b)
      OR EXISTS(SELECT 1 FROM ephemer_celebrations.transferts WHERE id=b)
      OR EXISTS(SELECT 1 FROM ephemer_celebrations.demandes WHERE id=b) THEN
      RAISE EXCEPTION 'Identifiant utilise : nouvelle commande requise' USING ERRCODE='40001';
    END IF;
  END IF;
`
    s=replaceOnce(s,"    IF action='modifier' THEN",`    IF NOT ephemer_celebrations.partage_valide(c) AND action NOT IN ('annuler','supprimer') THEN RAISE EXCEPTION 'Partage suspendu' USING ERRCODE='42501'; END IF;
${collisions}
    IF action='modifier' THEN`)
    return s
  })
  edit('detail',s=>{
    s=replaceOnce(s,"m.etat='active' AND NOT ephemer_social.bloquee(a,m.compte))","m.etat='active' AND NOT ephemer_social.bloquee(a,m.compte) AND (NOT est_maintenance OR ephemer_celebrations.partage_valide(c) OR m.compte=a))")
    return replaceOnce(s,"t.expire_at>now() AND (est_admin OR t.cible=a)","t.expire_at>now() AND ephemer_celebrations.partage_valide(c) AND (est_admin OR t.cible=a)")
  })
  edit('lister',s=>{
    s=replaceOnce(s,"AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a) AND NOT ephemer_social.bloquee(a,t.initiateur)","AND (NOT e.surprise OR e.destinataire IS DISTINCT FROM a) AND ephemer_celebrations.partage_valide(e.id) AND NOT ephemer_social.bloquee(a,t.initiateur)")
    return replaceOnce(s,"FROM ephemer_celebrations.celebrations e WHERE (apres IS NULL OR e.id>apres)",`FROM ephemer_celebrations.participations propre JOIN ephemer_celebrations.celebrations e ON e.id=propre.celebration
      WHERE propre.compte=a AND propre.etat IN ('active','maintenance') AND (apres IS NULL OR e.id>apres)`)
  })
  return {original,changed}
}
const indexSpecs=[
 ['taches_celebration','taches','celebration, id'],['taches_auteur','taches','auteur, celebration'],
 ['commentaires_celebration','commentaires','celebration, created_at, id'],['commentaires_auteur','commentaires','auteur, celebration'],
 ['demandes_historique','demandes','celebration, demandeur, created_at'],['demandes_demandeur','demandes','demandeur, id'],
 ['invitations_quota','invitations','celebration, emetteur, created_at'],['invitations_emetteur','invitations','emetteur'],
 ['transferts_cible','transferts','cible, id'],['transferts_initiateur','transferts','initiateur'],
 ['actions_recent','actions','celebration, created_at DESC, id DESC'],['operations_quota','operations','acteur, created_at DESC'],
 ['notifications_recent','notifications','celebration, created_at DESC, id DESC'],['sources_preparation','sources','preparation'],
]
export const productionIndexes=indexSpecs.map(([name,table,columns])=>({name:'celebr_prod_'+name,definition:`CREATE INDEX celebr_prod_${name} ON ephemer_celebrations.${table} USING btree (${columns})`}))
const signature=f=>f.name+'('+f.args.split(',').filter(Boolean).map(s=>s.trim().split(/\s+/)[1]).join(',')+')'
const normalize="btrim(replace(p.prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13))"
function functionGuard(f,hashes,optional=false){return `
  oid_f:=to_regprocedure(${quote(signature(f))});
  IF oid_f IS NULL THEN ${optional?'NULL;':"RAISE EXCEPTION 'Fonction attendue absente : %',"+quote(f.name)+';'}
  ELSIF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=oid_f
    AND p.prolang=(SELECT oid FROM pg_language WHERE lanname=${quote(f.language)}) AND p.prokind='f'
    AND pg_get_function_result(p.oid)=${quote(f.returns)}
    AND p.prosecdef=${f.options.includes('SECURITY DEFINER')?'true':'false'}
    AND p.provolatile=${quote(f.options.includes('IMMUTABLE')?'i':f.options.includes('STABLE')?'s':'v')}
    AND p.pronargdefaults=${(f.args.match(/ DEFAULT /g)??[]).length}
    AND ${f.args?`p.proargnames=ARRAY[${f.args.split(',').map(s=>quote(s.trim().split(/\s+/)[0])).join(',')}]::text[]`:'p.proargnames IS NULL'}
    AND p.proconfig=ARRAY['search_path=pg_catalog']::text[]
    AND md5(${normalize}) IN (${hashes.map(quote).join(',')})) THEN RAISE EXCEPTION 'Version ou signature inattendue : %',${quote(f.name)}; END IF;
`}
function structuralGuard(reference){
  const rows=[]
  rows.push(`IF (SELECT count(*) FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ephemer_celebrations')<>${reference.contraintes.length} THEN RAISE EXCEPTION 'Contraintes inattendues'; END IF;`)
  for(const c of reference.contraintes)rows.push(`IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass(${quote('ephemer_celebrations.'+c.table)}) AND conname=${quote(c.nom)} AND pg_get_constraintdef(oid,true)=${quote(c.definition)}) THEN RAISE EXCEPTION 'Contrainte inattendue : %',${quote(c.table+'/'+c.nom)}; END IF;`)
  rows.push(`IF (SELECT count(*) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ephemer_celebrations' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped)<>${reference.colonnes.length} THEN RAISE EXCEPTION 'Colonnes inattendues'; END IF;`)
  for(const c of reference.colonnes)rows.push(`IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass(${quote('ephemer_celebrations.'+c.table)}) AND attname=${quote(c.nom)} AND attnum=${c.position} AND NOT attisdropped AND format_type(atttypid,atttypmod)=${quote(c.type)} AND attnotnull=${c.obligatoire}) THEN RAISE EXCEPTION 'Colonne inattendue : %',${quote(c.table+'/'+c.nom)}; END IF;`)
  for(const t of reference.triggers)rows.push(`IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass(${quote(t.table)}) AND tgname=${quote(t.nom)} AND tgenabled='O' AND pg_get_triggerdef(oid)=${quote(t.definition)}) THEN RAISE EXCEPTION 'Trigger inattendu : %',${quote(t.nom)}; END IF;`)
  return rows.join('\n  ')
}
function permissionsGuard(){
 const original=fs.readFileSync(folder+'verification.sql','utf8').replaceAll('\r','').match(/DO \$verification\$([\s\S]*?)\$verification\$;/)[1]
 return original.replace(/END\s*$/,`  IF has_schema_privilege('anon','ephemer_celebrations','USAGE,CREATE') OR has_schema_privilege('service_role','ephemer_celebrations','USAGE,CREATE')
    OR has_schema_privilege('authenticated','ephemer_celebrations','CREATE') OR NOT has_schema_privilege('authenticated','ephemer_celebrations','USAGE') THEN RAISE EXCEPTION 'Droits de schema inattendus'; END IF;
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace CROSS JOIN (VALUES ('anon'),('authenticated'),('service_role')) AS roles(nom)
    WHERE ns.nspname='ephemer_celebrations' AND c.relkind='r' AND has_table_privilege(roles.nom,c.oid,'DELETE,TRUNCATE,TRIGGER')) THEN RAISE EXCEPTION 'Droits directs de table inattendus'; END IF;
END `)
}
function collisionGuard(){return `IF EXISTS(SELECT 1 FROM (SELECT id FROM ephemer_celebrations.invitations UNION ALL SELECT id FROM ephemer_celebrations.transferts UNION ALL SELECT id FROM ephemer_celebrations.demandes) x GROUP BY id HAVING count(*)>1) THEN RAISE EXCEPTION 'Collision historique : arreter et diagnostiquer sans modifier les identifiants'; END IF;`}
export function buildProductionFiles(source,reference){
  const {original,changed}=productionFunctions(source), added=changed.get('ephemer_celebrations.partage_valide')
  const oldInternal=original.filter(f=>f.name.startsWith('ephemer_celebrations.')).length
  const publicCount=`IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN (${original.filter(f=>f.name.startsWith('public.')).map(f=>quote(f.name.split('.')[1])).join(',')}))<>6 THEN RAISE EXCEPTION 'Surface publique inattendue'; END IF;`
  const countGuard=`IF current_setting('server_version_num')::integer<170000 THEN RAISE EXCEPTION 'PostgreSQL 17 minimum requis'; END IF;\nIF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ephemer_celebrations')<>(${oldInternal}+CASE WHEN to_regprocedure(${quote(signature(added))}) IS NULL THEN 0 ELSE 1 END) THEN RAISE EXCEPTION 'Surface interne inattendue'; END IF;\n${publicCount}`
  const baseGuards=original.map(f=>functionGuard(f,[bodyHash(f.body),...(changed.has(f.name)?[bodyHash(changed.get(f.name).body)]:[])])).join('')
  const header=`-- Célébrations B, correctif du 17 octobre 2026. APPLICATION HUMAINE seulement.\n-- Généré par tools/prepare-celebrations-production.mjs ; contrats publics inchangés.\n-- Ne crée aucun compte, ne lit aucun texte personnel, ne lance aucune commande métier.\n`
  let patch=header+"BEGIN;\nSET LOCAL lock_timeout='3s';\nSET LOCAL statement_timeout='60s';\n"
  patch+=`DO $preconditions$ DECLARE oid_f oid; BEGIN\n${countGuard}\n${baseGuards}\n${functionGuard(added,[bodyHash(added.body)],true)}\n${structuralGuard(reference)}\n${collisionGuard()}\nEND $preconditions$;\nDO $droits$${permissionsGuard()}$droits$;\n`
  // Vérifier aussi les index préexistants AVANT tout remplacement.
  patch+=`DO $index_garde$ BEGIN\n${productionIndexes.map(i=>`IF to_regclass(${quote('ephemer_celebrations.'+i.name)}) IS NOT NULL AND (pg_get_indexdef(to_regclass(${quote('ephemer_celebrations.'+i.name)}))<>${quote(i.definition)} OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass(${quote('ephemer_celebrations.'+i.name)}) AND indisvalid AND indisready)) THEN RAISE EXCEPTION 'Index inattendu : %',${quote(i.name)}; END IF;`).join('\n')}\nEND $index_garde$;\n`
  patch+="DO $correctif$ DECLARE modifie boolean:=false; BEGIN\nPERFORM pg_advisory_xact_lock(hashtextextended('ephemer-social-10A',0));\n"
  for(const f of changed.values())patch+=`IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure(${quote(signature(f))}) AND md5(${normalize})=${quote(bodyHash(f.body))}) THEN\nEXECUTE $definition$${f.ddl}$definition$;\n${f.name===added.name?'REVOKE ALL ON FUNCTION ephemer_celebrations.partage_valide(uuid) FROM PUBLIC,anon,authenticated,service_role;\n':''}modifie:=true;\nEND IF;\n`
  for(const i of productionIndexes)patch+=`IF to_regclass(${quote('ephemer_celebrations.'+i.name)}) IS NULL THEN EXECUTE ${quote(i.definition)}; modifie:=true; END IF;\n`
  patch+=`IF modifie THEN PERFORM pg_notify('pgrst','reload schema'); RAISE NOTICE 'Correctif applique, aucun contenu reecrit'; ELSE RAISE NOTICE 'Correctif deja installe'; END IF;\nEND $correctif$;\nDO $droits_apres$${permissionsGuard()}$droits_apres$;\nSELECT 'celebrations_correctif_production_applique' AS resultat;\nCOMMIT;\n`
  let verification=header+"BEGIN READ ONLY;\nSET LOCAL statement_timeout='30s';\nDO $verification$ DECLARE oid_f oid; BEGIN\n"
  verification+=publicCount+'\n'
  verification+=`IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ephemer_celebrations')<>${oldInternal+1} THEN RAISE EXCEPTION 'Correctif incomplet'; END IF;\n`
  for(const f of [...original.filter(f=>!changed.has(f.name)),...changed.values()])verification+=functionGuard(f,[bodyHash(f.body)])
  verification+=structuralGuard(reference)+'\n'+collisionGuard()+'\n'
  for(const i of productionIndexes)verification+=`IF to_regclass(${quote('ephemer_celebrations.'+i.name)}) IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass(${quote('ephemer_celebrations.'+i.name)}) AND indisvalid AND indisready) OR pg_get_indexdef(to_regclass(${quote('ephemer_celebrations.'+i.name)}))<>${quote(i.definition)} THEN RAISE EXCEPTION 'Index attendu absent ou incorrect : %',${quote(i.name)}; END IF;\n`
  verification+=`END $verification$;\nDO $droits$${permissionsGuard()}$droits$;\nSELECT 'celebrations_production_catalogue_conforme' AS resultat;\nCOMMIT;\n`
  return {patch,verification,original,changed}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fs.realpathSync(process.argv[1])){
  const result=buildProductionFiles(fs.readFileSync(folder+'schema-propose.sql','utf8'),JSON.parse(fs.readFileSync(folder+'production-reference.json','utf8')))
  fs.writeFileSync(folder+'correctifs-production.sql',result.patch)
  fs.writeFileSync(folder+'verification-production.sql',result.verification)
  fs.mkdirSync('out/celebrations-production',{recursive:true})
  fs.writeFileSync('out/celebrations-production/preflight-lecture-seule.sql',result.patch.split('DO $correctif$')[0].replace('BEGIN;','BEGIN READ ONLY;')+"SELECT 'celebrations_correctif_preconditions_ok' AS resultat; COMMIT;\n")
  console.log('Deux fichiers SQL complets générés, '+result.changed.size+' fonctions proposées et '+productionIndexes.length+' index ; aucune exécution distante.')
}
