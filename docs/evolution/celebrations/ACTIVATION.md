# Où en est l’activation des célébrations à plusieurs ?

13 octobre 2026. Le SQL a été installé humainement. Le contrôle du catalogue connecté a réussi : `celebrations_b_catalogue_conforme`, 11 tables internes, six procédures publiques et protections de révocation présentes. Les 25 corps de fonctions correspondent au dossier local. Les types publics ont été régénérés depuis cette installation, sans ajouter les tables internes aux types exposés.

**L’interface reste désactivée : les tests des droits et de concurrence sur une copie n’ont pas encore été effectués.** Le plan demandé prévoit leur réussite avant ouverture. Le catalogue confirme la présence des protections, pas leur comportement avec plusieurs personnes.

## Parcours préparé

- Depuis une préparation personnelle existante : **Inviter des Étoiles à cette célébration** → choisir les éléments à partager → vérifier l’aperçu → confirmer → ouvrir la célébration créée → inviter des Étoiles acceptées. Seule la copie confirmée devient partageable ; les notes, coordonnées, brouillons et budget restent personnels.
- Depuis une célébration du nouveau module, déjà créée seul : **Participants → Inviter des Étoiles** → confirmer le passage à plusieurs → choisir une Étoile → **Inviter cette Étoile**. Cette étape conserve la même célébration et ne lance aucune invitation avant la sélection explicite.
- Depuis une célébration déjà partagée : **Participants → Inviter des Étoiles**. L’invitation reste en attente jusqu’à la réponse de son destinataire.
- La surprise conserve l’exclusion de son destinataire ; sans compte identifié, elle ne peut pas passer à plusieurs.

Ces boutons seront accessibles après activation. La recette navigateur utilise déjà les vrais composants et des réponses fictives pour vérifier le parcours, les pannes et les réessais sans doublon.

## Ce qu’il reste à vérifier

1. Utiliser **une copie isolée de la base**, sans vrais emails, push, crons ou webhooks. Identifier cette copie avant d’exécuter les scripts. Ne pas utiliser la base courante de l’application pour créer les données de test.
2. Sur cette copie avec le schéma B installé, exécuter [verification.sql](verification.sql). Il doit répondre `celebrations_b_catalogue_conforme`.
3. Dans la même session SQL de cette copie, placer `SET ephemer.recette_celebrations='copie_autorisee';` avant le contenu complet de [recette-copie.sql](recette-copie.sql). Le script crée des comptes fictifs, vérifie les différents droits puis termine par `ROLLBACK`. Aucune erreur ne doit être ignorée. Le marqueur ne prouve pas à lui seul que la connexion vise une copie.
4. Faire les cinq tests à deux connexions décrits dans [README-B.md](README-B.md) : invitation/révocation, tâche rejouée, suppression concurrente, transfert/départ et blocage. Utiliser les fixtures dédiées, exécuter le blocage en dernier puis le contrôle final. Refaire dans l’ordre inverse sur une copie restaurée.
5. Vérifier avec des comptes de test et des connexions réelles : organisateur, participant, invitation en attente, ex-membre, personne extérieure et destinataire d’une surprise. Contrôler les appels directs, les identifiants changés, l’export, la révocation et l’effacement du compte. Les claims SQL fictifs ne remplacent pas ce test.

Après ces résultats confirmés, ouvrir le module avec `CELEBRATIONS_ENABLED`, puis refaire les vérifications locales et la recette utilisateur. Ne pas réexécuter le fichier d’installation sur le schéma déjà présent. Aucune installation ou recette métier distante n’a été exécutée automatiquement par l’assistant.
