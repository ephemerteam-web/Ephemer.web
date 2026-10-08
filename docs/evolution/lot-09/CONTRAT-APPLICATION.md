# Contrat applicatif du lot 09

**8 octobre 2026 : catalogue réel `lot09_catalogue_conforme`, types réels régénérés et contrats branchés dans l’application.** Le wrapper `types/database.ts` est conservé. La recette SQL mutante est reportée à la demande de l’utilisateur ; les tests applicatifs sont simulés, avec une recette navigateur mobile partielle. Voir README pour les preuves et limites.

## Avatar du profil

Une ligne `avatars_utilisateurs` par compte : `user_id` UUID primaire/FK Auth, `configuration` JSONB fermée, `revision` bigint sûre pour JavaScript, `created_at`/`updated_at` techniques. Aucun champ d’avatar ajouté à `profiles`, aucun élargissement de ses droits.

Le navigateur utilise le client Supabase existant, RLS propriétaire et helpers alignés sur ses droits : INSERT `(user_id,configuration)` sans révision/dates ; UPDATE `(configuration,revision)` filtré par `(user_id,revision_attendue)`, avec `revision_attendue+1`. Pas d’upsert aveugle. Auth vérifiée avant/après, scope annulable et composants remontés à chaque compte. Aucune lecture service role de l’avatar personnel nécessaire.

Dans le profil, afficher le rendu enregistré/default et ouvrir l’éditeur partagé avec copie locale. **Enregistrer**, **Annuler**, **Réinitialiser les choix** explicites ; réinitialiser ne sauvegarde pas automatiquement. Erreur et conflit conservent les choix/révision ; relecture volontaire sans écraser la saisie. Une réponse perdue exige une lecture : reconnaître seulement une ligne avec configuration et révision résultante attendues ; sinon demander une relecture, sans deuxième écriture silencieuse. Nouvelle création : user_id stable, reconnaître après lecture le seul résultat attendu ; aucun UUID nouveau par tentative.

Absence légitime : défaut V1, sans INSERT automatique. Lecture en panne : état d’erreur distinct d’une absence. Configuration ancienne reconnue : rendu versionné conservé ; configuration inconnue/corrompue : défaut + explication, réparation seulement par sauvegarde volontaire. Aucun adaptateur de format ancien inventé maintenant. Aucun stockage local persistant de la configuration.

## Brouillon et copie choisie

Nouvelles cartes : `rendu_version=2`, `avatar_signature=NULL`, message/signature explicitement choisis. Les brouillons existants restent V1 tant qu’aucun avatar n’y est ajouté. Le défaut SQL reste 1 pour les anciens clients.

**Ajouter mon avatar** copie la configuration valide enregistrée du profil, ou le défaut clairement présenté en l’absence de ligne. **Actualiser depuis mon profil** remplace seulement cette copie ; **Retirer l’avatar** met NULL mais garde le rendu 2. Un profil dont la configuration est illisible doit être réparé volontairement avant copie. Aucune modification de profil ne rafraîchit automatiquement une carte. Aucun éditeur spécifique de l’avatar dans une carte.

L’attachement/copie fait partie des champs non enregistrés du brouillon. Étendre comparaison, dirty state, sauvegarde explicite, récupération après réponse perdue et conservation de saisie ; colonnes autorisées seulement. Publier le dernier brouillon enregistré, jamais une configuration de profil relue au moment de publier. Prévisualisation et version publiée restent séparées.

## Formats et routes

V1 garde ses six champs et son moteur original. V2 garde `templateId`, `templateVersion:1`, message/signature, mais utilise `format:2`, `renderVersion:2` et `avatar:AvatarConfigV1|null`. Exactement sept champs, puis dix dans un avatar ; pas d’ID propriétaire/contact/profil ni de référence externe. Les longueurs du lot 08 restent inchangées.

Conserver `cardSnapshot` comme validation V1 ; utiliser `supportedCardSnapshot` dans les lecteurs/dispatcher après intégration. Les nouveaux helpers autonomes sont déjà présents. Projection publique et statuts restent typés par l’union V1/V2, jamais `unknown` accepté sans validation. Une version/configuration publiée inconnue est indisponible ; aucun fallback de profil ni substitution de dessin.

L’API HTTP existante reste identique. Pour `publier` seulement, le serveur authentifié appelle `publier_carte_lot09(p_user_id,p_carte,p_revision,p_operation,p_duree,p_lien,p_empreinte,p_secret_chiffre,p_nonce,p_tag)` avec l’identité vérifiée et le matériel créé côté Node. Les autres actions gardent les RPC 08. Le nouveau RPC verrouille la carte, retrouve d’abord l’UUID d’opération, délègue V1 ou insère une copie V2, révoque l’ancien droit et incrémente atomiquement la révision. Un retry ne republie pas un avatar récent ; une tentative perdante n’affiche pas son secret.

Le serveur relit ensuite le droit courant comme en 08. `POST /api/cartes/consulter` continue de vérifier le droit par empreinte et retourne seulement `{content,expiresAt}` ; `content.avatar` provient exclusivement de la version publiée. Supabase/Node ne joint jamais le profil. Conserver secret dans fragment, body POST, no-store/no-referrer/noindex, CSP, absence de tiers/analytics/stockage persistant, retrait du contenu hors ligne et à l’expiration.

Rendu et catalogue V1 d’avatar figés, tout comme les moteurs de cartes V1/V2 : nouvelle composition ou palette nécessite une nouvelle version et un nouveau validateur. Aucun fichier Storage ni nouvel environnement requis. La clé de lien du lot 08 reste configurée/conservée humainement ; aucune rotation automatique.

## Export, effacement et documentation

L’export est en **version 7**, avec `avatars_utilisateurs` (clé/ordre `user_id`, lecture propriétaire). Les brouillons incluent leur copie et les versions leur snapshot V1/V2. Les droits exportés conservent uniquement leurs métadonnées actuelles. Secrets clairs/chiffrés, hash, nonce/tag et opérations sont exclus ; Auth est vérifiée avant/après, aucun export partiel n’est téléchargé.

La cascade Auth supprime l’avatar. Supprimer/réinitialiser l’avatar personnel laisse les copies de cartes intactes. Supprimer préparation/carte supprime les copies de ses versions/droits via les cascades 08. Ne supprimer aucun compte réel pour vérifier ces effets. Actualiser confidentialité, suivi et README seulement à hauteur de ce qui est effectivement intégré/testé.
