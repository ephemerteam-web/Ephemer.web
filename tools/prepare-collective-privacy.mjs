// Extensions ciblées des deux corps B contrôlés en lecture seule. Aucun SQL exécuté.
import fs from 'node:fs'
import {createHash} from 'node:crypto'
const dir='docs/evolution/lot-13-14'
const before=JSON.parse(fs.readFileSync('tools/collective-celebrations-before-04.json','utf8'))
const expected={commander:'c2f6ade8011f3ca427ec887f23ca7334',detail:'00c8b6434faeba548d59c39aee00b707'}
const digest=body=>createHash('md5').update(body.replace(/\r/g,'').trim()).digest('hex')
const replaceOnce=(text,old,next)=>{if(text.split(old).length!==2)throw new Error('Point de protection absent ou répété');return text.replace(old,next)}
const excluded="EXISTS(SELECT 1 FROM ephemer_celebrations.cartes_collectives cc WHERE cc.celebration=c AND ephemer_celebrations.carte_exclue(cc.id,a))"
const definitions=before.map(row=>{
 if(digest(row.body)!==expected[row.name])throw new Error('Socle B divergent')
 let body=row.body
 if(row.name==='detail'){
  body=replaceOnce(body,"t.celebration=c AND (e.destinataire IS DISTINCT FROM a OR t.type NOT IN ('cadeau','message'))", "t.celebration=c AND (e.destinataire IS DISTINCT FROM a OR t.type NOT IN ('cadeau','message')) AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.cartes_collectives cc WHERE cc.id=t.id AND ephemer_celebrations.carte_exclue(cc.id,a))")
  body=replaceOnce(body,"(e.destinataire IS DISTINCT FROM a OR t.action NOT IN ('ajouter_tache','modifier_tache','publier'))", "((e.destinataire IS DISTINCT FROM a AND NOT "+excluded+") OR t.action NOT IN ('ajouter_tache','modifier_tache','publier'))")
  body=replaceOnce(body,'t.celebration=c AND t.compte=a)',"t.celebration=c AND t.compte=a AND (t.type<>'tache' OR NOT "+excluded+'))')
 }else{
  const marker="PERFORM pg_advisory_xact_lock(hashtextextended('ephemer-celebration:'||c::text,0));"
  body=replaceOnce(body,marker,marker+`
  -- Une tâche collective garde les mêmes exclusions que la carte, même sans UUID destinataire.
  IF action='modifier_tache' AND EXISTS(SELECT 1 FROM ephemer_celebrations.cartes_collectives cc WHERE cc.id=(d->>'tache')::uuid AND cc.celebration=c) THEN
    IF NOT ephemer_celebrations.carte_autorisee((d->>'tache')::uuid,a,true)
     OR ((d->>'responsable') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ephemer_celebrations.participations cp WHERE cp.id=(d->>'responsable')::uuid AND cp.celebration=c AND cp.etat='active' AND cp.role='organisateur' AND NOT ephemer_celebrations.carte_exclue((d->>'tache')::uuid,cp.compte))) THEN
      RAISE EXCEPTION 'Tache indisponible' USING ERRCODE='42501';
    END IF;
  END IF;`)
 }
 return {...row,body,definition:replaceOnce(row.definition,row.body,body),signature:row.name==='commander'?'ephemer_celebrations.commander(text,jsonb,uuid)':'ephemer_celebrations.detail(uuid,uuid)',patchedHash:digest(body)}
})
const guard=`DO $compatibilite$ DECLARE f record; o oid; BEGIN
 FOR f IN SELECT * FROM (VALUES
${definitions.map(d=>`('${d.signature}','${d.hash}',${d.name==='commander'})`).join(',\n')}
 ) attendu(signature,empreinte,auth) LOOP
  o:=to_regprocedure(f.signature);
  IF o IS NULL OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=o AND md5(btrim(replace(prosrc,chr(13),''),' '||chr(9)||chr(10)||chr(13)))=f.empreinte AND prosecdef=f.auth AND cardinality(proconfig)=1 AND proconfig[1]='search_path=pg_catalog') THEN RAISE EXCEPTION 'Socle Célébrations différent : %',f.signature; END IF;
  IF has_function_privilege('anon',o,'EXECUTE') OR has_function_privilege('authenticated',o,'EXECUTE') IS DISTINCT FROM f.auth OR has_function_privilege('service_role',o,'EXECUTE') THEN RAISE EXCEPTION 'Permissions B différentes : %',f.signature; END IF;
 END LOOP;
END $compatibilite$;
`
const marker='-- DEBUT PROTECTION CELEBRATIONS 04'
let sql=fs.readFileSync(dir+'/04-raccordement.sql','utf8').replace(/-- DEBUT PROTECTION CELEBRATIONS 04[^]*?-- FIN PROTECTION CELEBRATIONS 04\r?\n/,'')
sql=replaceOnce(sql,'COMMIT;',`${marker}
-- Ne concerne que coordination/lectures B ; aucune RPC de carte individuelle modifiée.
${guard}${definitions.map(d=>d.definition.trimEnd()+';').join('\n')}
-- FIN PROTECTION CELEBRATIONS 04
COMMIT;`)
fs.writeFileSync(dir+'/04-raccordement.sql',sql)
console.log('Protection B ciblée ajoutée à 04 ; deux corps complets, aucune mutation distante.')
