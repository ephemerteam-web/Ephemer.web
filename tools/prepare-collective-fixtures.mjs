// Prépare des fixtures persistantes sur COPIE, jamais exécutées par cet outil.
import fs from 'node:fs'
const dir='docs/evolution/lot-13-14',recipe=fs.readFileSync(dir+'/recette-copie.sql','utf8')
const marker='RESET ROLE;\nDO $publication$'
if(!recipe.includes(marker))throw new Error('Recette source divergente')
const fixtures=recipe.slice(0,recipe.indexOf(marker))+`
DO $ouvrir$ DECLARE c uuid:='f1300000-0000-4000-8000-000000000001'; BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ephemer.recette_a'),'role','authenticated')::text,true);
 PERFORM public.commander_carte_collective(c,jsonb_build_object('operation',gen_random_uuid(),'revision',5,'data',jsonb_build_object('action','rouvrir')));
 PERFORM public.commander_carte_collective(c,jsonb_build_object('operation',gen_random_uuid(),'revision',6,'data',jsonb_build_object('action','inviter','participation','f1300000-0000-4000-8000-000000000011')));
 PERFORM public.commander_carte_collective(c,jsonb_build_object('operation',gen_random_uuid(),'revision',7,'data',jsonb_build_object('action','confirmer','consent',true,'content',jsonb_build_object('message','Avant la course','signature','Auteur synthétique','avatar',NULL))));
END $ouvrir$;
RESET ROLE;
-- Contrairement à recette-copie.sql, conserver UNIQUEMENT ces fixtures sur la copie pour deux sessions.
COMMIT;
`
fs.writeFileSync(dir+'/fixtures-concurrence.sql',fixtures.replace('Les mutations de cette recette sont annulées par ROLLBACK.','Ces fixtures sont conservées sur la COPIE uniquement pour les courses.'))
console.log('Fixtures préparées, aucune mutation distante.')
