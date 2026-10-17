# Célébrations — dossier de GO production sans copie Supabase

17 octobre 2026. **GO pour la recette locale ; GO général non donné.** L’utilisateur confirme `celebrations_production_catalogue_conforme` après application humaine. Le même fichier de vérification a été réexécuté par l’assistant en READ ONLY : résultat conforme. Le module est ouvert avec `npm run dev`, et reste fermé dans les builds de production. Deux comptes pilotes disponibles et reliés par une Étoile acceptée ont été confirmés par l’utilisateur. Aucun mot de passe ou jeton n’est à transmettre à l’assistant.

La contrainte « copie Supabase obligatoire » est remplacée, sur demande explicite de l’utilisateur, par un correctif limité, des contrôles en lecture seule et une recette réelle ciblée. Les anciens scripts de copie gardent leur garde-fou : **ne pas les exécuter dans la base de l’application et ne pas contourner leur marqueur**.

## 1. Ce qui est corrigé

- Un organisateur qui est aussi destinataire d’une célébration ordinaire suspendue conserve la possibilité de la clôturer. Le destinataire d’une surprise reste exclu, quel que soit son rôle.
- Une surprise partagée dont le destinataire n’a plus de compte valide reste suspendue. Un transfert ne la réactive pas. Cette règle est relue avant les résultats de réessai ; un organisateur conserve seulement la résolution par clôture. La présentation de maintenance masque les contenus.
- Les nouvelles invitations, demandes et propositions de transfert ne réutilisent pas un même UUID entre leurs trois tables. Une collision historique détectée arrête le correctif, sans réécriture des identifiants.
- Les listes partent des participations du compte courant. Quatorze index internes couvrent les lectures, les historiques, les quotas et les références nécessaires au nettoyage.
- Une révocation annule les lectures en cours ; une réponse ancienne, même livrée malgré l’annulation du transport, ne peut pas réafficher les contenus. Les commandes conservées pour réessai sont purgées après refus de droits.
- L’export est reconstruit depuis la lecture finale autorisée : seules les propres contributions sont retenues. Une modification des textes, du destinataire ou des droits ne réutilise pas l’ancien export. Il ne constitue toujours pas un instantané global transactionnel.
- Les conflits et interblocages sont récupérables ; un résultat incertain n’est jamais annoncé comme un succès. Même contenu et mêmes ressources reprennent la même opération tant que les droits restent valables.

## 2. Ordre d’application humaine

1. Conserver une copie locale des définitions SQL actuelles et du code déployé. Cette conservation permet de diagnostiquer les changements ; ce n’est pas une promesse de restauration complète de la base.
2. Dans le SQL Editor du projet utilisé par l’application, exécuter **le fichier entier** [correctifs-production.sql](correctifs-production.sql), sans sélectionner seulement une partie. Ne pas réexécuter `schema-propose.sql`.
3. Résultat attendu : `celebrations_correctif_production_applique`. Si un verrou dépasse trois secondes ou si un contrôle échoue, la transaction s’arrête : ne pas supprimer le contrôle et ne pas poursuivre avec des fragments. Communiquer le message d’erreur sans secret ni contenu personnel.
4. Exécuter **le fichier entier** [verification-production.sql](verification-production.sql). Résultat attendu : `celebrations_production_catalogue_conforme`.
5. Résultat désormais confirmé : lancer `npm run dev` et effectuer la recette ci-dessous. `CELEBRATIONS_ENABLED` est vrai uniquement en environnement de développement ; `npm run build` / `npm run start` gardent le module fermé. Le GO général nécessitera une décision explicite après la recette. Aucun déploiement automatique.

Le correctif remplace sept fonctions existantes et ajoute un helper interne sans droit client. Six procédures publiques et leurs signatures sont conservées ; aucune table privée ou migration modifiée, aucun type public futur ajouté. Pas de création de compte, d’appel d’email/push/IA, d’exécution de commande métier ou de modification des contenus existants par ce script. Contraintes, colonnes, triggers et droits sont vérifiés avant changement. Les fonctions déjà corrigées et index déjà présents à l’identique sont conservés. Le schéma attendu est documenté dans `production-reference.json`, extrait exclusivement du catalogue.

## 3. Recette réelle des deux comptes pilotes

Utiliser deux profils de navigateur séparés, A et B, connectés à l’application locale. Prendre uniquement les comptes pilotes convenus. Toutes les créations portent le préfixe **RECETTE CÉLÉBRATIONS ·** et ne contiennent aucune information personnelle. Aucun compte Auth ne sera créé ou supprimé par SQL.

| Parcours | Vérification attendue |
|---|---|
| Création libre par A, seul et sans date | « Date à choisir », aucun rappel ; B n’accède pas à la fiche, même avec l’URL. |
| Passage à plusieurs | A confirme le changement ; aucune invitation n’est créée implicitement. |
| Invitation de B | B voit seulement la présentation minimale. A ne peut pas accepter pour B ; B accepte avec sa propre session. |
| Tâche et commentaire | Responsable/échéance facultatifs ; B modifie son commentaire, A peut le retirer mais ne remplace pas son auteur. |
| Révocation/retrait | A révoque une invitation en attente ou retire une participation acceptée. B recharge : refus uniforme, aucune ancienne fiche réaffichée. Réessayer une ancienne commande ne rend aucun contenu. |
| Surprise destinée à B | B ne voit ni fiche, compteur, invitation, export ou notification révélant la surprise. Pas de contribution anonyme ou d’envoi externe. |
| Publication depuis privé | A sélectionne une tâche et confirme son aperçu. Le brouillon et le budget restent privés ; une édition privée ultérieure ne change pas la copie partagée. |
| Export | Seulement les propres contributions et métadonnées autorisées ; aucune note ou motif d’un autre compte. Le destinataire ordinaire n’exporte pas les tâches cadeau/message. |
| Suppression commune | Confirmation explicite ; fiche et tâches partagées deviennent indisponibles. La préparation privée source reste accessible. |
| Maintenance ordinaire | Sur une création dédiée destinée à B, transférer l’organisation à B. Si le test de blocage est permis, B bloque A : B peut encore clôturer sa célébration ordinaire suspendue. |

Vérifier les appels directs authentifiés et les identifiants modifiés depuis les outils de développement, sans copier les jetons dans un fichier, une capture, une conversation ou un journal. Ne viser que les identifiants des créations de recette. Une erreur SQL inattendue, un statut 500/503 persistant ou une donnée accessible après retrait arrête la recette.

### Courses à observer sur des créations dédiées

- **Acceptation / révocation** : B accepte pendant qu’A révoque. Si l’acceptation gagne, la participation existe et la révocation ne prétend pas l’avoir retirée ; si la révocation gagne, l’acceptation est refusée.
- **Tâche rejouée** : rejouer simultanément une commande avec le même UUID et la même charge. Une seule tâche existe ; un contenu différent avec ce même UUID est refusé. Réutiliser les données de requête déjà émises sans exporter leur Authorization.
- **Transfert / départ** : B accepte un transfert pendant qu’A quitte. Une célébration active garde un organisateur autorisé ; un départ qui clôture avant acceptation ferme le transfert. Aucun succès de transfert fictif.
- **Suppression / suppression** : deux demandes concurrentes ne produisent qu’une suppression ; réessai de l’opération confirmée = résultat minimal, nouvelle opération devenue non autorisée = refus.
- **Blocage / lecture** : ce test n’est permis que si les comptes pilotes n’ont **aucune autre célébration commune** susceptible d’être affectée. Sinon le marquer non effectué. Le bloqueur quitte ; dernier organisateur = suspension. Débloquer ne rétablit pas la participation. Prévoir la résolution par clôture ou transfert accepté, sans restauration automatique d’amitié.

Noter l’ordre effectivement observé et l’état final. Deux clics proches ne prouvent pas à eux seuls une concurrence des transactions PostgreSQL : ne pas déclarer cette preuve acquise si les requêtes n’ont pas réellement chevauché leur traitement. Aucun nettoyage par UUID codé en dur, aucune suppression de compte réel.

Ne pas invalider ou supprimer le compte destinataire pour provoquer le second défaut corrigé. Ce scénario est couvert par les constantes SQL et la revue des fonctions ; son exécution métier avec un destinataire Auth invalide demeure une limite explicite de cette recette sans copie.

## 4. État des preuves

| Contrôle | État au 17/10/2026 |
|---|---|
| Catalogue B initial | Conforme, contrôlé en lecture seule. |
| Préconditions du correctif | `celebrations_correctif_preconditions_ok`, sans installation ni commande métier. |
| Syntaxe et constantes | Trois corps PL/pgSQL et sept blocs de garde/correction compilés en branches inaccessibles ; douze scénarios SQL synthétiques validés en READ ONLY. Tables de scénario uniquement dans des CTE ; aucun compte de fixture. |
| Tests applicatifs du correctif | Six tests comportementaux réussis : export actuel, exclusions, révocation tardive, purge, erreurs récupérables et conservation du responsable facultatif à l’édition. |
| Vérification complète et navigateur | `npm run verify` réussi après correction du formulaire : **418 tests**, TypeScript/build, zéro erreur lint/cinq avertissements préexistants. Journal `out/celebrations-production/verify-activation.txt`. Navigateur 320/390/1440 px, deux thèmes, clavier/panne/compte/révocation réussi avec données fictives ; observations réelles séparées dans RECETTE-PILOTE.md. |
| Application humaine du correctif | **Confirmée par l’utilisateur le 17/10.** Aucun correctif appliqué automatiquement par l’assistant. |
| Catalogue corrigé | **Conforme** : confirmation utilisateur puis vérification indépendante READ ONLY, `celebrations_production_catalogue_conforme`. |
| Activation locale | **Ouverte en développement uniquement** ; builds de production fermés. |
| Recette des deux comptes réels | **Parcours fonctionnels contrôlés avec sessions successives.** Création, invitation/révocation/refus/acceptation, surprise, tâches/commentaires, export propre, transfert accepté/retrait, refus de l’ex-membre, publication sélectionnée et source conservée après suppression ; voir [RECETTE-PILOTE.md](RECETTE-PILOTE.md). Courses concurrentes et rejeux réseau réels non validés. |
| Effacement d’un vrai compte | **Non effectué volontairement.** Tests locaux et inspection du trigger ne prouvent pas une suppression réelle en production. |

L’analyse syntaxique ne valide pas les liaisons de toutes les requêtes métier ou leur exécution. Les constantes de droits ne remplacent pas les RLS et sessions réelles. Aucun test n’est déclaré réussi parce que son script existe.

## 5. GO et retour arrière

Correctif humain, catalogue corrigé, vérifications locales et parcours fonctionnels pilotes sont confirmés. **GO local pour l’utilisation et la recette ; GO général encore en attente des courses entre deux sessions indépendantes et des rejeux réseau réels.** Le navigateur intégré a permis des connexions successives, pas deux identités simultanées. Les clics et changements de compte observés ne remplacent pas ces preuves.

Consigner ensuite les résultats des quatre courses prévues, les réessais sans doublon et le refus d’anciennes commandes après révocation. Le blocage n’est pas exécuté tant que l’absence d’autres célébrations communes affectées n’est pas établie. L’effacement réel reste volontairement exclu selon le plan. Une anomalie d’autorisation ou de conservation empêche le GO ; elle ne se résout pas par un nouveau GRANT large.

Après cette décision seulement, l’utilisateur publie la version validée. Aucun commit ou déploiement par l’assistant. Les cartes collectives et envois programmés restent reportés.

Retour : fermer le module applicatif ; pour couper immédiatement les nouveaux appels, appliquer humainement [retour-arriere.sql](retour-arriere.sql). Les tables, sources privées et données sont conservées, ainsi que les triggers de blocage/effacement. Garder les corrections de sécurité installées ; ne pas restaurer un ancien corps vulnérable pour rouvrir. Le script de correction suppose les permissions initiales : après une fermeture des droits, leur réouverture exige une procédure séparée relue, pas un GRANT improvisé.
