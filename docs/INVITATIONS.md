# Invitations V2 — parcours et activation

Le code local conserve le contexte étoile après authentification, propose la reprise consentie d’une réponse originale pendant 30 jours, et présente les rapprochements ambigus à l’hôte. Seul le prénom est obligatoire pour le premier profil. Aucun nouveau paquet ni commit.

**Le SQL est proposé, pas installé.** Les nouveaux formulaires exigent son installation. Les comptes existants avec prénom peuvent encore se connecter avant installation ; une nouvelle inscription ne pourra pas enregistrer ce premier profil tant que les RPC ne sont pas présentes. Préparer et valider l’installation sur une copie avant de déployer ce code.

## Activation manuelle

1. Sur une copie jetable du projet, neutraliser les webhooks/envois externes, relire puis **exécuter en entier** [invitations-v2.sql](sql/invitations-v2.sql), de `BEGIN` à `COMMIT`. Attendre sa réussite avant l’étape suivante. Prérequis : P2, dates lot‑02 et univers avec permissions IA (10C et suite). Installation par le SQL Editor sous propriétaire postgres, en une transaction. Ce fichier n’est pas une migration automatiquement exécutée ; il s’arrête si les objets existent déjà.
2. Dans **la même copie**, exécuter [invitations-v2-recette.sql](sql/invitations-v2-recette.sql) **en entier**. Ce deuxième fichier teste les fonctions installées ; il ne les crée pas. Attendu : assertions réussies, ROLLBACK, puis le résultat « Recette Invitations V2 réussie — données de test annulées ». Les UUID renvoyés par `set_config` au cours du script identifient les comptes fictifs simulés ; leur affichage seul ne confirme pas les assertions suivantes. En cas d’erreur, effectuer ROLLBACK avant toute autre commande. Ces claims SQL ne remplacent pas les essais avec de vrais JWT ni la concurrence à deux sessions.
3. Après validation humaine, appliquer le SQL d’installation sur le projet. Les anciennes opérations publiques `soumettre_invitation` et `repondre_invitation` perdent leurs droits d’exécution : les anciens onglets doivent être rechargés. La consultation utilise désormais `verifier_invitation_v2`, pour qu’un lien plein puisse encore recevoir une répétition reconnue.
4. Dans Supabase → Authentication → URL Configuration, autoriser les URL de callback et de confirmation du domaine de production, puis les domaines de recette utilisés. La page d’inscription demande exactement `/auth/confirm?next=%2Fdashboard` ou `/auth/confirm?next=%2Fetoile`. Ne pas changer le domaine de Site URL sans raison.
5. Dans Authentication → Email Templates → Confirm signup, garder le contenu du mail et utiliser pour son bouton :

```html
<a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email">Confirmer mon adresse</a>
```

Cette application fournit toujours une RedirectTo contenant déjà `?next=...`. La route vérifie le hash à usage unique côté serveur, crée les cookies sur l’appareil qui confirme et poursuit le profil. Le retour est limité à Accueil, étoile ou réinitialisation. Garder le template de réinitialisation et son callback existants. Voir la [documentation officielle Supabase](https://supabase.com/docs/guides/auth/auth-email-templates).

6. Tester une vraie inscription par mot de passe avec confirmation sur un deuxième appareil, puis OAuth et connexion existante. Une étoile conservée seulement dans le premier onglet doit être rouverte sur le deuxième appareil ; la réponse au carnet, elle, est retrouvée par l’e-mail Auth vérifié.
7. Le cron existant de 08:00 UTC appelle `purger_reprises_invitation` avec le rôle serveur après vérification de CRON_SECRET. Aucun nouveau cron. SQL absent → `invitationCleanup=sql_non_installe` ; panne → `erreur` et HTTP 500 après traitement des rappels ; réussite → `ok`. Une panne de purge ne bloque pas les autres utilisateurs.

Regénérer les types Supabase à partir du schéma réellement installé après cette validation. Les contrats proposés sont actuellement définis dans `lib/invitation-contract.ts`, exportés comme types métier et isolés dans `lib/invitation-data.ts` ; aucun faux schéma généré.

### Si l’installation échoue

Une erreur de syntaxe dans le premier fichier empêche l’installation de sa transaction. L’erreur `42883` (« fonction soumettre_invitation_v2 inexistante ») dans la recette peut en être la conséquence. Effectuer `ROLLBACK;` si la transaction est encore ouverte, reprendre le fichier d’installation corrigé en entier, puis relancer la recette seulement après sa réussite. Ne pas exécuter uniquement la ligne corrigée : la fonction et les objets suivants doivent être créés ensemble.

Pour vérifier la présence de la fonction, sans écrire de données :

```sql
SELECT to_regprocedure('public.soumettre_invitation_v2(text,uuid,jsonb)') AS fonction_installee;
```

Le résultat doit être `soumettre_invitation_v2(text,uuid,jsonb)`. `NULL` signifie que cette fonction n’existe pas dans le projet interrogé : vérifier la première erreur du script d’installation et le projet sélectionné.

## Contrats et confidentialité

| Opération publique | Accès et comportement |
|---|---|
| `verifier_invitation_v2` | Anon/authenticated, token, état du lien et prénom public de l’hôte ; aucune fiche |
| `soumettre_invitation_v2` | Anon/authenticated, token + UUID d’envoi + réponse fermée ; accusé générique |
| `lire_reprises_invitation` | Auth vérifié, son propre e-mail lu dans Auth ; reprises non expirées, les 100 plus récentes |
| `lire_reponses_invitation` | Hôte vérifié, 100 réponses en attente les plus anciennes ; candidats de son carnet uniquement |
| `traiter_reponse_invitation` | Hôte vérifié, révision de réponse + empreinte de fiche ; compléter/créer/ignorer |
| `lire_premier_profil` | Compte vérifié, profil et univers propres, empreinte et révision |
| `enregistrer_premier_profil` | Compte vérifié, UUID + empreinte + révision ; profil, univers, date et consommation des reprises atomiques |
| `purger_reprises_invitation` | Rôle serveur seulement ; copies expirées et journaux publics âgés de plus de 30 jours |

Le schéma privé `ephemer_invites` n’est pas exposé dans les réglages API ; ses tables ont RLS et aucun accès direct. Les fonctions privilégiées ont un search_path fermé ; l’utilisateur ne fournit jamais l’identifiant d’un hôte. Un e-mail du profil libre ne donne pas accès aux reprises : seule l’adresse Auth vérifiée compte.

La réponse originale comprend identité, anniversaire jour/mois/année nullable, coordonnées, relation, intérêts et texte libre. L’option de reprise est décochée au départ et exige un e-mail. Le délai de 30 jours démarre au dernier envoi accepté, pas à la lecture. Les replays du même UUID ne renouvellent pas ce délai. Une reprise expirée est illisible avant même la purge. Les choix déjà enregistrés dans le compte sont prioritaires ; l’utilisateur peut les relire et les modifier explicitement.

Les notes privées du carnet ne sont jamais utilisées pour le compte invité. Le texte libre va dans Présentation personnelle ; les bulles vont dans Mes passions. La relation avec l’hôte reste dans sa fiche privée. Un nouvel univers n’active aucun partage ni accord IA. Avec le SQL Profil unifié, ces champs sont réunis dans Mon profil : les sources communes priment et les critères de coordonnées/date remplacées sont désactivés, sans comparaison. Les autres permissions existantes sont conservées ; un partage général désactivé révoque tous les accords IA. Voir [PROFIL-UNIFIE.md](PROFIL-UNIFIE.md) pour contrat, installation et recette. Invitations V2 doit être installé avant cette évolution.

Les données du carnet et les conflits à examiner restent à l’hôte après 30 jours : l’expiration concerne seulement la copie de reprise pour un futur compte. Une réponse résolue perd sa copie structurée côté hôte ; la fiche reste dans le carnet. La suppression de compte supprime les objets privés liés par FK. Ne pas réutiliser ces tables dans un export public ou dans l’IA.

Les lectures sont bornées à 100 réponses. Après traitement, les suivantes remontent. Pour les reprises, si ce cas exceptionnel dépasse 100, seules les 100 affichées sont consommées ; les autres peuvent être proposées à la connexion suivante jusqu’à expiration.

## Doublons et concurrence

Un seul candidat avec le même e-mail normalisé et les mêmes prénom/nom complets permet de compléter les champs vides, si aucun champ renseigné ne diffère. Ni note, ni téléphone, ni anniversaire existant ne sont remplacés implicitement. Un anniversaire existant sans année garde son année privée. Téléphone identique, prénom seul, homonyme, différence ou plusieurs candidats → réponse à examiner dans Mes proches → Invitations.

L’hôte compare la réponse et sa fiche. Les cases « Utiliser la réponse pour ce champ » sont toutes décochées. Compléter conserve les autres champs, Créer une personne distincte nécessite son choix explicite, Garder ma fiche ne modifie pas le carnet. La révision et l’empreinte empêchent d’appliquer un écran devenu ancien. Les alertes de différences liées à une fiche existante ouvrent Invitations dans la cloche et le centre.

Toutes les écritures de réponse prennent un verrou de transaction commun à l’hôte, avant le verrou du lien. Deux liens différents suivent donc la même règle. L’UUID empêche le double clic et le réessai après réponse perdue ; il est sauvegardé avec le brouillon public sur l’appareil. Si le contenu change, un nouvel UUID est créé. Une répétition reconnue ne consomme pas une place. Les conflits d’une même identité sont regroupés avec la réponse la plus récente. Aucun ancien doublon n’est fusionné.

Un lien expiré ou désactivé refuse un nouvel envoi. Le replay d’une opération déjà acceptée peut simplement restituer son accusé, sans nouvelle écriture, renouvellement ni consommation. Le quota est vérifié à l’envoi, pour ne pas refuser une répétition reconnue à l’ouverture d’un lien plein.

## Contexte étoile et brouillons

L’entrée `/etoile#secret` retire immédiatement le fragment. Le secret reste dans sessionStorage de l’onglet pendant 30 minutes maximum. Il n’entre jamais dans `next`, le callback, les logs, le referrer, l’analytique ou le cache PWA. Premier compte lié → TTL inchangé ; changement de compte, déconnexion explicite, expiration ou succès → effacement. Perte de réseau ou changement de visibilité → conservation du contexte et réessai. Stockage interdit → utilisation en mémoire sur la page, puis réouverture du lien après connexion.

Se connecter et Créer un compte transportent seulement `next=/etoile`. Le prénom/anniversaire ne sont jamais obligatoires pour demander une étoile à un compte existant terminé ; pour un nouveau compte, le profil puis l’invitation reviennent dans cet onglet. Le POST part uniquement après le clic Demander à devenir une étoile. Une session indisponible permet de réessayer la vérification.

Le brouillon public au carnet garde son fonctionnement local de sept jours après modification, effacement explicite et effacement après succès. Ce brouillon ne remplace pas la copie de reprise de 30 jours ; celle-ci nécessite l’option et un envoi réussi. Le profil et la comparaison privée restent en mémoire et sont vidés au changement de compte.

## Vérification

Le 10/10/2026, `npm run verify` a réussi : 351 tests, génération des types Next, TypeScript et build. ESLint : zéro erreur, cinq avertissements préexistants. `git diff --check` : aucune erreur. La recette navigateur décrite ci-dessous a réussi. Ces résultats ne valent pas exécution du SQL proposé.

Tests Node : retours fermés/reset, cookies de confirmation sans verifier PKCE, contexte lié/TTL, compte existant et premier profil, e-mail requis pour reprise, 29 février sans année, rejet date impossible/future, conservation des valeurs du compte, double clic et réponse perdue après rechargement, champs non remplacés par défaut, propriétaire revalidé avant/après RPC, erreur et SQL absent.

Recette navigateur locale : `node tests/invitations-preview.mjs`, puis `node tests/invitations-browser.mjs`. Les vrais composants utilisent uniquement des comptes/RPC fictifs. Identité, bulles, récapitulatif et comparaison vérifiés à 320/390/1440 px, thèmes clair/sombre ; réessai après panne et authentification étoile sans envoi automatique. Captures et résultat dans `out/invitations-preview/`.

La recette SQL complète n’a pas été exécutée : aucune base de test PostgreSQL locale n’est disponible et le schéma de production n’a pas été modifié. Le catalogue distant a été lu pour aligner les fonctions univers/dates et la contrainte des notifications.

Après signalement de l’erreur `42601` le 10/10/2026, le `CASE` de la limite du texte libre a été entouré de parenthèses. Vérification distante en transaction `READ ONLY` : compilation de 13 corps PL/pgSQL adaptés en blocs anonymes **non exécutés** (paramètres déclarés localement, types privés remplacés par `record`, retours de valeurs remplacés par `PERFORM`). Ce contrôle vérifie la syntaxe, sans installer les fonctions ni vérifier leurs droits ou leur exécution. Les quatre limites 500/501 caractères pour une réponse et 1000/1001 pour un profil ont aussi été évaluées dans PostgreSQL avec les résultats attendus. Les 12 tests ciblés Invitations V2 et `git diff --check` passent. La recette comporte maintenant ces quatre limites et vérifie la présence des fonctions avant de créer ses fixtures.

Restent à valider sur copie et vraies sessions : installation complète, RLS/ACL, mauvais e-mail/non-vérifié, expiration/purge, conservation des permissions existantes, comparaison avec remplacement volontaire, homonymes et erreurs transactionnelles.

Concurrence réelle, deux sessions indépendantes sur copie : créer un hôte et deux liens fictifs, lancer la même réponse sur les deux liens avec UUID distincts. Dans la première session, BEGIN → soumettre → attendre avant COMMIT ; dans la deuxième, BEGIN → soumettre → COMMIT. Attendu : la deuxième attend, puis une fiche et une place consommée au total. Refaire avec le même UUID sur le même lien ; puis noms identiques/e-mails différents, téléphone commun, deux candidats existants, modification de fiche pendant comparaison, et retrait du lien. Aucun essai mono-session ne prouve cette concurrence.
