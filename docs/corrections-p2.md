# Livraison P2 — compatibilité applicative et procédures Supabase

Les fichiers de l’application peuvent être livrés avant les changements SQL. Aucun SQL distant n’a été appliqué, aucune dépendance ni aucun script npm ajouté, aucun commit créé. Les corrections précédentes de suppression de compte, quotas IA, confidentialité, cache PWA et fiabilité des emails sont conservées.

## Changements applicatifs

| Parcours | Changement et raison |
| --- | --- |
| Préférences | `lib/notification-preferences.ts` fournit les valeurs confirmées. Une ligne manquante reçoit ces valeurs ; une erreur de lecture est affichée et bloque la modification. Les choix existants restent prioritaires. J-3 est un bouton accessible. |
| Relations | `ami` est la valeur commune des nouvelles fiches et invitations. `amis` est normalisé pendant les lectures paginées, filtres et appels IA. |
| Dates | `birthdayInYear` dans `lib/calendar-day.ts` fait du 29 février un 1er mars les années ordinaires. Le calendrier et les événements mensuels utilisent le mois et le jour de cette occurrence. Les rappels réutilisent la prochaine occurrence civile. |
| API mensuelle | `mois` 0–11 et `annee` 1–9999 ; paramètres absents selon Paris ; valeurs invalides refusées avec 400. Les dates de réponse sont à minuit UTC. |
| Cadeaux | Occasions communes aux messages, ancien alias accepté, six idées utilisables au maximum. Catégorie reconnue et textes non vides obligatoires ; JSON invalide ou résultat sans idée utile : 502. Données personnelles et quota restent protégés. |
| Push | Boutons et guide parlent de préparation. Enregistrement et retrait conservés ; envoi push indisponible actuellement. |
| Ajout de contacts | Contrôle de chaque fiche avant insertion, y compris les champs refermés. Validation HTML des emails et date civile. Présentation des correspondances internes et existantes, confirmation pour créer des fiches distinctes, aucune fusion. Saisies conservées après erreur. |
| Navigation | Brouillon d’ajout en mémoire dans le layout connecté, retrouvé après navigation et Retour/Avancer. Liens et menus demandent confirmation ; fermeture/rechargement affiche l’avertissement natif. Sauvegarde, abandon ou changement de compte l’effacent. Il ne survit pas à une fermeture acceptée. |
| Invitation | Brouillon local versionné, expiration sept jours après modification réelle. Consulter ne prolonge pas le délai. Purge des anciens formats, valeurs invalides et brouillons expirés lors de l’ouverture du site. Effacement visible ; stockage interdit sans blocage du formulaire. |
| Collections | Curseur unique, lots demandés de 200, fin uniquement à page vide. Plafonds plus petits pris en charge. Les crons avancent par lots ; les files dont le statut change utilisent le curseur. Une erreur intermédiaire ne fournit pas de résultat partiel présenté comme complet. |
| Accessibilité | Dialogue natif commun : titre, focus initial, confinement, Échap et retour au déclencheur. Cartes cadeaux retournées par bouton ; face cachée inerte. Labels et annonces de statut/erreur ajoutés. |

## Application Supabase après validation humaine

1. Sauvegarder le projet et tester d’abord sur une copie contenant le schéma et deux contacts synthétiques `amis`. Ne pas lancer ces scripts comme une migration automatique.
2. Relire [le SQL d’application](supabase-p2-apply.sql). Il exige exactement deux contacts `amis`, aucun doublon de notification d’invitation, aucun lien entre deux hôtes et le trigger déjà inspecté. Toute divergence arrête la transaction sans correction destructive automatique.
3. Exécuter ce fichier une seule fois dans le SQL Editor avec le rôle `postgres`. Il sauvegarde les fonctions, politiques, droits et relations historiques dans `p2_backup_20261004`, inaccessible aux clients. Un schéma de sauvegarde déjà présent provoque volontairement un arrêt.
4. Exécuter [la recette synthétique](supabase-p2-tests.sql) sur la copie de test. Elle vérifie les deux RPC, la notification unique, la limite, l’annulation transactionnelle et l’isolation entre deux comptes ; elle finit par `ROLLBACK`.
5. Faire la recette concurrente ci-dessous, puis les parcours réels avec deux comptes de test. Après validation, appliquer en production et contrôler les résultats sans supprimer la sauvegarde.
6. Si nécessaire, exécuter [le retour arrière](supabase-p2-rollback.sql). Il restaure les définitions et droits capturés, y compris les anciens droits trop larges. Il conserve les réponses reçues depuis l’application et remet seulement les deux relations capturées encore en `ami`.

Le SQL Editor du projet est `postgres` et **n’est pas membre de `supabase_admin`**, vérifié en lecture seule. Il ne peut donc pas modifier les privilèges par défaut de ce rôle géré. Les defaults `postgres` sont corrigés dans la procédure principale. [La procédure séparée](supabase-p2-managed-defaults.sql) est réservée à un administrateur Supabase autorisé : elle vérifie ce droit avant toute action et sauvegarde les defaults concernés. Ne pas contourner la restriction et ne pas exécuter ce fichier dans le SQL Editor actuel. Son retour arrière est inclus. Cette partie doit être prise en charge par la plateforme avant de déclarer tous les defaults corrigés.

L’alerte d’invitation reste uniquement dans l’application : le trigger est son unique auteur. `soumettre_invitation` conserve sa signature et sa réponse ; `repondre_invitation` délègue et conserve ses codes. L’endpoint HTTP suspendu reste suspendu. La notification et le compteur font partie de la transaction de création de la fiche.

Les tables publiques `patch_notes` et `saint_du_jour` gardent leur lecture publique. Leurs écritures sont réservées au dashboard Supabase (`postgres`) et aux outils serveur. Les quotas restent lisibles par leur propriétaire, mais leur incrémentation est réservée au serveur. Le script ne modifie pas les procédures du journal email livrées séparément.

Les index autonomes redondants du token et des quotas sont retirés, les contraintes uniques conservées. **Exception sur les préférences** : `notification_preferences_user_id_key` est l’index d’une contrainte UNIQUE, doublant la clé primaire. PostgreSQL ne peut supprimer cet index sans supprimer sa contrainte. La procédure le conserve pour respecter la consigne de préserver les contraintes uniques et clés primaires ; retirer cette contrainte redondante nécessiterait un arbitrage humain distinct. L’index propriétaire des contacts est bien ajouté.

La protection Auth contre les mots de passe compromis exige le plan Pro ou supérieur selon la [documentation Supabase](https://supabase.com/docs/guides/auth/password-security). Elle reste indisponible sur le plan gratuit actuel ; aucun changement d’abonnement n’est prévu.

## Concurrence : dernière place d’une invitation

Sur la copie de test, créer un hôte synthétique et un lien d’une seule place (installation explicite, hors du test transactionnel précédent) :

```sql
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data)
VALUES ('10000000-0000-4000-8000-000000000003','p2-concurrent@example.invalid','{"prenom":"Hôte test"}');
INSERT INTO public.invitations(id,user_id,token,max_utilisations,nb_utilisations,expires_at,actif)
VALUES ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','p2-concurrent-test',1,0,now()+interval '1 day',true);
COMMIT;
```

Session A, puis B pendant les dix secondes de A :

```sql
-- Session A
BEGIN;
SELECT * FROM public.soumettre_invitation('p2-concurrent-test','Concurrent A');
SELECT pg_sleep(10);
COMMIT;
```

```sql
-- Session B : attend le verrou de A, puis renvoie succes=false et lien à sa limite.
BEGIN;
SELECT * FROM public.soumettre_invitation('p2-concurrent-test','Concurrent B');
COMMIT;
```

Contrôle et nettoyage limité aux UUID synthétiques :

```sql
SELECT nb_utilisations,max_utilisations FROM public.invitations WHERE token='p2-concurrent-test';
SELECT count(*) FROM public.contacts WHERE invitation_id='20000000-0000-4000-8000-000000000003';
SELECT count(*) FROM public.notifications n JOIN public.contacts c ON c.id=n.contact_id
WHERE c.invitation_id='20000000-0000-4000-8000-000000000003' AND n.type='invitation_remplie';
-- Attendu : 1/1, 1 contact, 1 notification.
BEGIN;
DELETE FROM public.contacts WHERE invitation_id='20000000-0000-4000-8000-000000000003';
DELETE FROM public.invitations WHERE id='20000000-0000-4000-8000-000000000003';
DELETE FROM public.profiles WHERE id='10000000-0000-4000-8000-000000000003';
DELETE FROM auth.users WHERE id='10000000-0000-4000-8000-000000000003';
COMMIT;
```

## Contrôles après application

```sql
SELECT relation,count(*) FROM public.contacts GROUP BY relation;
SELECT contact_id,count(*) FROM public.notifications WHERE type='invitation_remplie'
AND contact_id IS NOT NULL GROUP BY contact_id HAVING count(*)>1;
SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('contacts','notifications','notification_preferences','invitations','quotas_ia');
SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public';
SELECT grantee,table_name,privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND grantee IN ('anon','authenticated') ORDER BY table_name,grantee,privilege_type;
SELECT has_function_privilege('anon','public.creer_invitation(text)','EXECUTE') AS creation_anon,
has_function_privilege('authenticated','public.incrementer_quota_ia(uuid)','EXECUTE') AS quota_client,
has_function_privilege('anon','public.soumettre_invitation(text,text,text,date,text,text,text,text,text)','EXECUTE') AS soumission_publique;
-- Attendu : false, false, true ; aucune ligne de doublon ; uniquement les droits du plan.
```

## Recette applicative finale

Lancer `npm run dev`, vérifier sur mobile et au clavier : J-3 activé/désactivé, préférence absente et lecture refusée ; invitation Ami → filtre Ami → génération ; février/mars 2024 et 2025 ; toutes les occasions cadeaux ; email invalide dans une bulle fermée, doublon interne et existant, insertion refusée ; navigation annulée puis confirmée, Retour/Avancer, abandon ; invitation restaurée, effacée, expirée et stockage interdit. Pour les dialogues : Tab/Shift+Tab restent dedans, Échap ferme, focus retourne au bouton. Les bulles se ferment avec Échap sans confiner le focus. Les liens marchands d’une carte cachée ne sont pas tabulables.

Les tests Node simulent les services sans envoyer d’email ni consommer de quota réel. La recette SQL est livrée pour exécution humaine : aucun moteur PostgreSQL local n’est installé et aucun test d’écriture distant n’a été exécuté automatiquement.

Vérifications exécutées le 4 octobre 2026 : `node --test tests/*.test.mjs` **99/99**, `npm exec --no -- tsc --noEmit --incremental false` réussi, `npm run build` réussi, `npm run lint` **aucune erreur, 37 avertissements**. Les nouveaux tests sont [p2-corrections.test.mjs](../tests/p2-corrections.test.mjs) et [p2-ui.test.mjs](../tests/p2-ui.test.mjs). Leurs simulations couvrent les composants et événements réels, les services restant simulés. Elles ne remplacent pas une recette visuelle : aucun navigateur connecté n’est disponible dans cette session (ouverture du navigateur intégré également indisponible).
