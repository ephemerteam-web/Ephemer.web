# Lot 04 — Dossier de schéma des préparations privées

**6 octobre 2026 — schéma appliqué manuellement, catalogue confirmé en lecture seule, code applicatif intégré localement. Tests SQL signalés réussis par l’utilisateur ; vraie reconnexion et recette A/B avec JWT à confirmer. Voir la [recette applicative](../lot-04-05-recette-app.md). Ne pas relancer le schéma installé.**

Le périmètre local reste documentaire : aucun code Next.js, type généré, migration, secret, dépendance ou déploiement modifié. L’utilisateur a appliqué le schéma ; l’assistant a seulement exécuté la partie A en transaction READ ONLY. Cadre : [section 3](../../PLAN-EVOLUTION-EPHEMER.md#3-cadre-commun-à-tous-les-prompts) et [modèle métier](../MODELE-METIER.md).

## Contrat de départ confirmé

Métadonnées inspectées en transaction `READ ONLY` le 6 octobre sur le projet **ephemer-app**, référence `zwjdgkvlqwplffxfykrl` : PostgreSQL **17.6**, quinze tables publiques ; `contacts(user_id,id)` et `occurrences_evenements(user_id,id)` possèdent les clés uniques non différées attendues. Événements, règles et occurrences du lot 02 présents. Préparations et tâches absentes. Aucun contenu personnel lu.

Le lot 02 conserve l’UUID et le cycle d’une occurrence après report, versionne les règles et archive les événements lors de la suppression d’un contact. Sa RPC d’effacement exige révision et confirmation ; elle supprime règles et occurrences. Ces contrats restent inchangés. Leur présence ne prouve pas la recette avec de vrais comptes.

## Tables, états et droits proposés

| Objet | Contenu et garanties |
| --- | --- |
| `preparations_evenements` | UUID, propriétaire Auth, occurrence obligatoire du même propriétaire, état `ouverte/terminee/abandonnee`, `sans_achat`, révision et horodatages. Unicité propriétaire/occurrence. |
| `taches_preparation` | UUID, préparation du même propriétaire, type `cadeau/message/appel/sortie/libre`, titre 1–200 caractères nettoyé, brouillon de message limité à 10 000 caractères, état `a_faire/faite/abandonnee`, révision et horodatages. Une action prédéfinie par préparation ; tâches libres multiples. |

Toutes les actions sont facultatives. Aucune tâche n’est créée en ouvrant une préparation. Terminer une préparation est une déclaration explicite, indépendante des tâches. Abandonner puis réouvrir conserve les éléments enregistrés. Les mêmes transitions sont possibles sur une tâche.

Pour une tâche message, `faite` signifie « message prêt » et exige un brouillon non vide. Éditer un texte ne marque pas automatiquement la tâche faite. Une tâche cadeau faite signifie seulement l’action terminée : aucun achat ni don marchand prouvé. Aucun statut d’e-mail, objet carte ou bouton de carte anticipé. Le lot 05 portera les déclarations d’achat distinctes.

RLS SELECT/INSERT/UPDATE/DELETE réservées au propriétaire identifié par `auth.uid()`. Les FK composées empêchent un parent appartenant à un autre compte. Les identités et parents ne sont pas modifiables. Les droits de colonnes excluent les dates techniques ; les triggers les produisent. Le rôle `service_role` ne reçoit que SELECT sur ces tables : ses accès privilégiés devront malgré tout filtrer le propriétaire côté serveur. Pas de droits anon, de Storage, ni d’accès ami/cercle.

Fonctions et triggers **SECURITY INVOKER**, `search_path=pg_catalog`, relations qualifiées. EXECUTE public/anon/service_role révoqué ; seules les quatre RPC ci-dessous sont appelables par authenticated. Le schéma technique `ephemer_lot04` doit rester hors des schémas exposés par la Data API. Références officielles : [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [fonctions et droits](https://supabase.com/docs/guides/database/functions).

## Interface à intégrer après installation

| RPC | Contrat |
| --- | --- |
| `ouvrir_preparation_lot04(p_occurrence uuid)` | Renvoie la préparation existante ou la crée atomiquement. Aucun propriétaire fourni par le navigateur. |
| `ajouter_tache_lot04(p_id uuid,p_preparation uuid,p_type text,p_titre text)` | Le client conserve son UUID jusqu’au résultat confirmé. Un retry retrouve la tâche ; une action prédéfinie déjà présente renvoie son UUID réel, sans écrasement. Un UUID réutilisé pour un autre parent/type est refusé. |
| `enregistrer_preparation_lot04(p_id uuid,p_revision bigint,p_etat text,p_sans_achat boolean)` | Sauvegarde explicite avec révision attendue ; renvoie la nouvelle ligne/révision. |
| `enregistrer_tache_lot04(p_id uuid,p_revision bigint,p_titre text,p_brouillon text,p_etat text)` | Même contrat pour texte, titre et état ; aucune action implicite d’envoi. |

Créations : INSERT ... ON CONFLICT DO NOTHING puis relecture, jamais « lire puis insérer ». En READ COMMITTED, la relecture voit le commit concurrent. `40001` demande de relire ; pour un conflit de création en isolation supérieure, rejouer toute la transaction. `42501` signifie session/ressource non autorisée, `22023` un identifiant incompatible, `23514` une saisie contraire aux contraintes. Une sauvegarde périmée ne doit pas être rejouée automatiquement avec la nouvelle révision : conserver la saisie et présenter le conflit.

Les accès directs restent autorisés sur les seules colonnes métier. Un UPDATE doit soumettre `revision=revision_attendue+1` et filtrer sur la révision attendue ; zéro ligne affectée n’est jamais un succès. Le trigger refuse un UPDATE sans incrément. Ne jamais utiliser une expression serveur `revision=revision+1` pour contourner le contrôle attendu.

Les trois points d’entrée futurs (dashboard, calendrier, fiche contact) transmettront **l’UUID d’occurrence**, pas une date ou un contact seul. Une occurrence legacy sans UUID ne peut pas recevoir de préparation avant confirmation/materialisation via le lot 02. La date et le délai seront lus dans l’occurrence actuelle ; aucune copie de date dans la préparation. Une occurrence annulée/archivée conserve son histoire et doit être expliquée dans l’interface. La nouvelle année crée une préparation vide.

Les générateurs actuels recevront uniquement leur contexte autorisé existant (occasion, relation, ton) ; prénom ajouté localement. Les notes, brouillons, titres libres, dates et identifiants privés ne seront pas introduits dans les prompts du fournisseur. Aucun texte privé dans URL, analytics ou logs.

## Conservation, export et effacement

- Report/renommage/annulation/archivage : aucun effacement de préparation. Aucun message programmé déplacé silencieusement.
- Supprimer une tâche efface son brouillon. Supprimer une préparation efface ses tâches ; l’UI future doit confirmer la perte.
- Effacement explicitement confirmé d’un événement via le lot 02 : occurrences → préparations → tâches par cascade. Préférer l’archivage pour conserver l’histoire.
- Effacement Auth : cascade de ces nouvelles tables. Ne corrige pas la route de suppression de compte existante ni ses étapes non atomiques.
- Étendre `lib/user-data.ts` après installation aux deux tables, avec pagination, filtrage propriétaire et contrôles de changement de compte. Passer l’export version 2 à 3 au lot 04, puis à 4 au lot 05. Pas d’export partiel téléchargé sur erreur.
- Réutiliser le secours hors ligne public existant ; aucun carnet privé persistant hors ligne n’est prévu.

## Application, recette et retour arrière

1. Valider ce dossier et disposer d’une **copie isolée autorisée**. Inspecter ses triggers Auth, profils et contacts ainsi que toute intégration externe avant insertion de fixtures.
2. Sauvegarder le schéma actuel, les droits et définitions nécessaires ; identifier qui peut restaurer la copie. Appliquer manuellement `schema-propose.sql` en entier. Le script est transactionnel et refuse une réexécution.
3. Exécuter **seulement A** de `verification.sql` pour inspecter les contrats. Vérifier aussi advisors et exposition REST : les tables public doivent être accessibles au rôle authenticated, le schéma technique ne doit pas être exposé.
4. Sur la copie uniquement, activer la sentinelle indiquée dans B dans la **même session**, puis exécuter B. Une session distincte du SQL Editor peut perdre le SET ; ne pas retirer le garde. B insère deux comptes fictifs, exerce les rôles SQL et annule tout par ROLLBACK. Sur erreur, exécuter ROLLBACK avant tout nouvel essai.
5. Après validation humaine, application manuelle dans l’environnement cible ; A peut y confirmer en lecture seule le schéma avant régénération des types et intégration applicative. Ne pas lancer B sur cet environnement.

**Recette C à deux connexions sur la copie.** Créer puis committer une occurrence fictive dédiée, autorisée à A, sans préparation ; relever son UUID. Cette fixture est distincte de B, dont tout est rollbacké. Dans chacune des deux connexions, ouvrir BEGIN READ COMMITTED, SET LOCAL ROLE authenticated puis les claims fictifs A comme dans B. Session 1 appelle `ouvrir_preparation_lot04(UUID)` et conserve la transaction ouverte. Session 2 appelle la même RPC : elle attend. Committer session 1, puis session 2 : les UUID renvoyés doivent être identiques et le compte A ne doit avoir qu’une préparation pour cette occurrence. Répéter avec la même action message et deux UUID de tâche ; répéter une tâche libre avec le même UUID client. Vérifier ensuite deux sauvegardes avec la même révision : un seul succès et un `40001`, sans perte du texte confirmé. Nettoyer seulement la fixture dédiée après contrôle humain.

Les changements de claims de B **ne sont pas une reconnexion réelle**. Après intégration, tester avec deux vrais comptes de test autorisés et leurs JWT, en appelant directement REST/RPC : A sauvegarde puis se déconnecte/reconnecte ; B et anon ne lisent ni ne modifient ses objets. Prévoir aussi 320 px, clavier, réseau perdu, session expirée, erreur de sauvegarde, saisie conservée, export et suppression complète de comptes synthétiques.

Le retour arrière est `retour-arriere.sql` : il refuse toute ligne conservée ou lot 05 installé ; DROP RESTRICT interdit une dépendance catalogue inattendue. Aucun CASCADE destructeur. Une fois utilisé, sauvegarder et réconcilier les données avant une décision humaine ; ne pas contourner le garde. Inventorier aussi les fonctions SQL à corps textuel et clients externes : leurs références peuvent ne pas figurer dans les dépendances PostgreSQL. Aucun retour automatique promis si un lot ultérieur les utilise.

## État des vérifications

Après application manuelle signalée par l’utilisateur, la partie A a réussi sur ephemer-app : résultat explicite `lot04_catalogue_conforme`. Tables, policies, droits de colonnes et signatures/droits des RPC conformes aux assertions du catalogue ; les fonctions ont donc pu être créées. Cela ne prouve pas leur exécution métier, les refus RLS réels, la concurrence, la reconnexion ou le rollback.

Pour refaire ce contrôle, exécuter **en entier** [verification-lecture-seule.sql](verification-lecture-seule.sql), qui contient seulement A. Dans le fichier complet `verification.sql`, s’arrêter au premier COMMIT. L’erreur « B desactive : copie isolee autorisee requise » signifie que le garde de B a fonctionné avant toute fixture ; elle ne remet pas en cause l’installation ni le contrôle A. Ne pas activer B sur le projet principal pour faire disparaître ce message. Sur une session SQL conservée après l’erreur, ROLLBACK libère uniquement la transaction B avortée ; il ne désinstalle pas le schéma déjà appliqué.

Aucun PostgreSQL/parser SQL disponible localement. B/C et les parcours applicatifs restent à tester sur copie isolée autorisée. Les résultats et limites sont consignés dans [SUIVI.md](../SUIVI.md).
