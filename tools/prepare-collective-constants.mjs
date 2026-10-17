// Évalue uniquement des expressions pures extraites du dossier, sans installer de fonction.
import fs from 'node:fs'
const source=fs.readFileSync('docs/evolution/lot-13-14/02-cartes.sql','utf8')
const text=source.match(/CREATE FUNCTION ephemer_celebrations\.carte_texte[^]*?AS \$f\$([^]*?)\$f\$;/)[1].trim().replace(/;$/,'')
let schedule=source.match(/CREATE FUNCTION ephemer_celebrations\.carte_horaire[^]*?AS \$f\$([^]*?)\$f\$;/)[1]
schedule=schedule.replace("ephemer_celebrations.carte_objet(j,ARRAY['date','time','timeZone','occurrence','instant'])","(jsonb_typeof(j)='object' AND (SELECT count(*) FROM jsonb_object_keys(j))=5)").replace('RETURN i;','obtenu:=i; EXIT validation;').replace(/END\s*$/,'END;')
if(/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)\b/i.test(text+schedule))throw new Error('Expression non pure : arrêt')
const query=`BEGIN READ ONLY;
DO $textes$ DECLARE divergences integer; BEGIN
 WITH fixtures(j,limite,requis,attendu) AS (VALUES
 ('"Bonjour"'::jsonb,2000,true,true),('""'::jsonb,2000,true,false),('""'::jsonb,200,false,true),('null'::jsonb,200,false,false),('{}'::jsonb,200,false,false),
 (to_jsonb(repeat('🌙',2000)),2000,true,true),(to_jsonb(repeat('🌙',2001)),2000,true,false),(to_jsonb(chr(9)||chr(10)||chr(160)||chr(8192)||chr(65279)),2000,true,false))
 SELECT count(*) INTO divergences FROM fixtures CROSS JOIN LATERAL (${text}) resultat(obtenu) WHERE obtenu IS DISTINCT FROM attendu;
 IF divergences<>0 THEN RAISE EXCEPTION 'Texte SQL divergent'; END IF;
END $textes$;
DO $horaires$ DECLARE cas record; j jsonb; obtenu timestamptz; refuse boolean; BEGIN
 FOR cas IN SELECT * FROM (VALUES
 ('2026-10-17','10:00','Europe/Paris','unique','2026-10-17T08:00:00Z',false),
 ('2026-10-25','02:30','Europe/Paris','premiere','2026-10-25T00:30:00Z',false),
 ('2026-10-25','02:30','Europe/Paris','seconde','2026-10-25T01:30:00Z',false),
 ('2026-10-25','02:30','Europe/Paris','unique','2026-10-25T00:30:00Z',true),
 ('2026-03-29','02:30','Europe/Paris','unique','2026-03-29T01:30:00Z',true),
 ('2026-10-17','10:00','Europe/Paris','unique','2026-10-17T10:00:00Z',true),
 ('2026-04-05','01:45','Australia/Lord_Howe','premiere','2026-04-04T14:45:00Z',false),
 ('2011-12-30','12:00','Pacific/Apia','unique','2011-12-30T12:00:00Z',true)
 ) fixtures(d,t,z,o,i,rejet) LOOP
 j:=jsonb_build_object('date',cas.d,'time',cas.t,'timeZone',cas.z,'occurrence',cas.o,'instant',cas.i);obtenu:=NULL;refuse:=false;
 BEGIN <<validation>> ${schedule}
 EXCEPTION WHEN data_exception THEN refuse:=true; END;
 IF refuse IS DISTINCT FROM cas.rejet OR (NOT refuse AND obtenu IS DISTINCT FROM cas.i::timestamptz) THEN RAISE EXCEPTION 'Horaire SQL divergent'; END IF;
 END LOOP;
END $horaires$;
SELECT '8 textes et 8 horaires purs contrôlés, aucune installation' AS resultat;
ROLLBACK;
`
fs.mkdirSync('out/collective-cards',{recursive:true});fs.writeFileSync('out/collective-cards/constantes-lecture-seule.sql',query)
console.log('Seize cas purs préparés, aucun objet ni contenu personnel lu.')
