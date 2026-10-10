-- À installer manuellement dans le SQL Editor Supabase, après sauvegarde et revue.
-- Aucune modification des contrats de cartes, des partages ou des avatars illustrés.
BEGIN;

ALTER TABLE public.avatars_utilisateurs ADD COLUMN portrait_ia jsonb;

CREATE FUNCTION ephemer_lot09.portrait_ia_valide(p jsonb, r bigint) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = pg_catalog AS $fn$
DECLARE b bytea; image text;
BEGIN
 IF p IS NULL THEN RETURN true; END IF;
 IF jsonb_typeof(p) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 IF NOT (SELECT count(*)=3 AND bool_and(k=ANY(ARRAY['image','promptVersion','revision'])) FROM jsonb_object_keys(p) AS keys(k))
  OR p->'promptVersion' IS DISTINCT FROM '"celeste-cartoon-v1"'::jsonb
  OR p->'revision' IS DISTINCT FROM to_jsonb(r)
  OR jsonb_typeof(p->'image') IS DISTINCT FROM 'string' THEN RETURN false; END IF;
 image:=p->>'image';
 IF length(image)>175000 OR image !~ '^data:image/jpeg;base64,/9j/[A-Za-z0-9+/]*={0,2}$'
  OR length(substring(image from 24))%4<>0 THEN RETURN false; END IF;
 b:=decode(substring(image from 24),'base64');
 RETURN octet_length(b) BETWEEN 12 AND 131072
  AND get_byte(b,0)=255 AND get_byte(b,1)=216 AND get_byte(b,2)=255
  AND get_byte(b,octet_length(b)-2)=255 AND get_byte(b,octet_length(b)-1)=217;
EXCEPTION WHEN OTHERS THEN RETURN false;
END;
$fn$;

ALTER TABLE public.avatars_utilisateurs ADD CONSTRAINT avatars_portrait_ia_check
 CHECK (ephemer_lot09.portrait_ia_valide(portrait_ia, revision));

-- Une validation personnalisable retire définitivement le portrait actif.
-- Une sauvegarde IA remplace le portrait et avance la révision atomiquement.
CREATE FUNCTION ephemer_lot09.retirer_portrait_ia() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $fn$
BEGIN
 IF NEW.portrait_ia IS NOT DISTINCT FROM OLD.portrait_ia THEN NEW.portrait_ia:=NULL; END IF;
 RETURN NEW;
END;
$fn$;
CREATE TRIGGER zz_avatar_portrait_ia BEFORE UPDATE ON public.avatars_utilisateurs
 FOR EACH ROW EXECUTE FUNCTION ephemer_lot09.retirer_portrait_ia();

REVOKE ALL ON FUNCTION ephemer_lot09.portrait_ia_valide(jsonb,bigint),ephemer_lot09.retirer_portrait_ia() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION ephemer_lot09.portrait_ia_valide(jsonb,bigint) TO authenticated,service_role;
GRANT INSERT(portrait_ia),UPDATE(portrait_ia) ON public.avatars_utilisateurs TO authenticated;
-- SELECT, révision, identité et RLS propriétaire restent ceux du contrat existant.

NOTIFY pgrst, 'reload schema';
COMMIT;
