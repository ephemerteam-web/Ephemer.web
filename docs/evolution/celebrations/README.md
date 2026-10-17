# Célébrations — état au 17 octobre 2026

**Parcours personnel intégré ; SQL corrigé installé humainement et catalogue conforme. Organisation partagée activée en développement et production sur GO explicite de l’utilisateur ; déploiement humain restant. Permissions des cinq tables privées confirmées : aucun nouveau GRANT nécessaire.** La copie Supabase n’est plus obligatoire pour B, sur décision explicite de l’utilisateur. Procédure actuelle : [GO-PRODUCTION.md](GO-PRODUCTION.md), [correctif complet](correctifs-production.sql), [vérification en lecture seule](verification-production.sql). Les anciennes recettes de copie gardent leurs protections.

Lire [README-B.md](README-B.md) pour le contrat final de la tranche B, son dossier SQL, les vérifications et l’activation. [CONCEPTION.md](CONCEPTION.md) conserve la conception des tranches suivantes ; les soutiens, sondages, envies, réservations et frais partagés sont reportés.

## Parcours personnel A conservé

- [PreparationScreen.tsx](../../../components/PreparationScreen.tsx) : Mes célébrations, À venir/Historique, sélection d’occurrence, modèles de tâches prévisualisés et écran en trois onglets. Historique est un classement calculé, pas un nouvel état. A n’enregistre aucune occurrence fictive.
- [CelebrationTabs.tsx](../../../components/CelebrationTabs.tsx) : panneaux conservés, navigation au clavier, focus visible et démontage au changement de compte/occurrence.
- [CelebrationCosts.tsx](../../../components/CelebrationCosts.tsx) et [celebration-personal.ts](../../../lib/celebration-personal.ts) : budget replié, achats de cette préparation, inconnus hors total, devises séparées et sommes exactes. Don lié sans double dépense ; aucun frais partagé ajouté.
- [GiftLibrary.tsx](../../../components/GiftLibrary.tsx) : ajout par titre ou lien valide, détails facultatifs repliés et quatre inspirations avant accès à toutes. La bibliothèque reste privée.
- [AttentionShared.tsx](../../../components/AttentionShared.tsx) : entrée Mes célébrations et outils personnels secondaires ; anciennes URL conservées.
- [attention-data.ts](../../../lib/attention-data.ts) : consultation de la préparation existante avant création ; une erreur de lecture n’est jamais traitée comme une absence.

Le diagnostic initial omettait les permissions de colonne. Le catalogue et le résultat fourni par l’utilisateur confirment INSERT/UPDATE sur les colonnes nécessaires, SELECT et RLS des cinq tables. Aucun droit ajouté, aucun contournement admin. Une recette avec de vrais comptes reste distincte d’un contrôle du catalogue.

## Tranche B préparée

[SQL complet proposé](schema-propose.sql), [vérification](verification.sql), [recette sur copie](recette-copie.sql), scripts de concurrence et [retour arrière](retour-arriere.sql). Le vieux `schema-revue.sql` renvoie à ce dossier sans proposer de tables C/D.

Création libre avec date facultative, publication sélectionnée depuis privé, invitations, participants, tâches, commentaires, demandes de suppression privées, transfert accepté, intégration au blocage, export et effacement de compte sont préparés. Contrats isolés ; **CELEBRATIONS_ENABLED=true, y compris en production, sur demande explicite de l’utilisateur**. Aucune table future ajoutée aux types générés.

## Vérifications et limites

17/10 : protections des réponses tardives et de l’export corrigées ; erreurs de concurrence récupérables. **418 tests**, TypeScript/build, zéro erreur lint et cinq avertissements préexistants après activation locale et correction du responsable facultatif ; journal `out/celebrations-production/verify-activation.txt`. Préconditions et douze scénarios SQL synthétiques validés en READ ONLY. Application humaine et catalogue corrigé conformes ; [parcours fonctionnels réels](RECETTE-PILOTE.md) exercés avec les deux comptes successivement, puis tailles 320/390/1440, deux thèmes et clavier sur page réelle. **GO production ensuite demandé par l’utilisateur ; courses et rejeux réseau réels toujours non effectués.** Le bilan ci-dessous conserve les preuves du 13/10.

`npm run verify` : **411 tests réussis**, TypeScript et build, zéro erreur lint et cinq avertissements préexistants. Journal final : `out/celebrations-b/verify.txt`.

Recettes Edge avec composants/CSS réels et Auth/transports fictifs : A à 320/390/1440 px, deux thèmes et trois onglets (18 captures) ; B aux mêmes tailles et thèmes, liste/création/trois onglets, clavier, panne réseau, conflit, compte et révocation (30 captures). Aucun appel à Supabase ou à un fournisseur externe dans ces recettes.

L’installation SQL humaine initiale est confirmée par le catalogue READ ONLY, avec les 25 corps de fonctions identiques au dossier historique. Types publics régénérés depuis la base installée. **Parcours fonctionnels JWT réels validés depuis la recette pilote ; concurrence PostgreSQL et rejeux signés réels toujours non validés.** Aucun SQL métier appliqué par l’assistant. [ACTIVATION.md](ACTIVATION.md) détaille les étapes restantes et les accès aux invitations dans une célébration existante.

## Suite et retour

Correctif humain installé, catalogue corrigé conforme, parcours pilotes effectués puis GO production demandé explicitement ; limites et retour arrière selon [GO-PRODUCTION.md](GO-PRODUCTION.md). Les permissions privées ne constituent plus un préalable de correction. Frais D : politique de conservation à valider avant tout SQL financier.

L’utilisateur contrôle l’application avec `npm run dev` et effectue lui-même tout commit/déploiement. Aucun commit, déploiement, dépendance, migration ou vrai email/IA/push ajouté. Retour B : verrou à false, application précédente restaurée, API fermées sans suppression des données ou sources privées.
