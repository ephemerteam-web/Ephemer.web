# Lots 04/05 — recette de l’application locale

6 octobre 2026. Les contrats installés ont été relus dans Supabase, sans mutation, avant la régénération de `types/database.generated.ts`. L’utilisateur signale la réussite de ses scripts SQL. Les essais applicatifs automatiques utilisent des données fictives et ne remplacent pas une vraie reconnexion avec JWT.

## Parcours disponibles

- Dashboard et calendrier : « Préparer cet événement » vise l’UUID de son occurrence.
- Fiche contact : « Préparer ses événements · idées et cadeaux » ouvre les prochaines occurrences, les idées et l’historique.
- Navigation : « Mes préparations », « Boîte à idées et cadeaux », « Budget cadeaux ».
- Préparation : état, sans achat, cadeau/message/appel/sortie et plusieurs tâches libres. Sauvegarde explicite des tâches et brouillons, abandon et réouverture.
- Générateur de message : sauvegarde du résultat comme brouillon dans la préparation. Un remplacement existant demande confirmation. La programmation existante reste séparée et cible cette occurrence précise ; elle ne modifie pas l’état de la tâche.
- Générateur cadeaux : « Garder cette idée » ouvre un formulaire privé. Depuis une préparation sans contact, la génération générique reste possible.
- Idées indépendantes d’un événement, lien marchand, estimation, archivage ; choix avec copie du titre/prix ; achat et don déclarés séparément ; don direct pour compléter un historique antérieur.
- Budget mensuel/annuel issu de la RPC installée : total prévu, dépensé, nombres sans montant, achats sans date séparés. Devises non converties. Montants saisis sans calcul flottant et totaux décimaux textuels exacts.
- Export JSON version 3 : les cinq nouvelles tables sont incluses. La suppression Auth cascade vers ces objets. Les références contact/idée détachées conservent les historiques conformément au schéma.

Aucune carte, photo, extraction de page distante, plafond de budget ou livraison implicite n’est introduit.

## Consentement IA décidé par l’utilisateur

Trois cases indépendantes dans les générateurs : prénom, âge calculé et note du contact. Elles sont décochées initialement et remises à zéro après chaque tentative de génération. Le choix reste en mémoire pour la demande, sans nouveau schéma ou préférence globale.

Le client transmet seulement les identifiants et les noms des champs autorisés. Après vérification de session/quota, le serveur relit le contact avec filtre `id` ET `user_id`, construit une liste fermée et envoie uniquement les valeurs cochées à Mammouth AI. Ni coordonnées, ni date de naissance exacte, ni notes d’idées, ni réactions, ni brouillons, ni dépenses. L’année historique 1900 ne donne pas un âge inventé. Aucun contenu privé n’est ajouté aux journaux.

Cette personnalisation d’une réponse n’est pas une demande d’entraînement de modèle. Décocher bloque les futures transmissions ; cela ne rappelle pas une requête déjà envoyée au prestataire.

## Vérifications automatiques et visuelles

`npm run verify` : lint, types, tests et build. Tests supplémentaires dans `tests/attentions.test.mjs` : précision monétaire, limite sûre, inconnus/zéro, liens, consentement par champ, propriétaire côté serveur, idempotence après réseau perdu, conflit de révision, refus après changement de compte, export isolé, saisie conservée sans faux succès, report/changement d’année, tâche message explicite, rappel lié à l’occurrence précise et périodes du budget.

`node tests/attentions-preview.mjs` sert un aperçu SSR isolé sur `http://127.0.0.1:3204`, avec vrais composants et styles mais données fictives et sans actions persistantes. Paramètres : `?view=prepare`, `?view=ideas`, `?view=budget`, `?view=edit&theme=light`. Recette navigateur réalisée à 320/360 px et 1280 px, clair/sombre : pas de débordement horizontal, libellés et cases accessibles. Cet aperçu ne prouve pas l’hydratation ni une sauvegarde distante.

## Recette authentifiée avec npm run dev

Utiliser des comptes de test A/B autorisés. Ne supprimer aucun compte réel pour tester.

1. A ouvre une occurrence depuis chaque point d’entrée. Deux onglets doivent retrouver une seule préparation. Ajouter un message et deux tâches libres ; enregistrer, recharger et se reconnecter.
2. Modifier le brouillon dans deux onglets : la sauvegarde avec une ancienne révision doit être refusée ; la saisie reste visible. Copier son texte avant « Recharger la page » pour comparer la version distante.
3. Reporter/renommer l’événement ; revenir via « Mes préparations ». Vérifier UUID, nouveau titre/date et brouillon conservé. Annuler/archiver sans effacer l’historique. L’année suivante reste vide.
4. Déclarer message prêt, puis rouvrir/abandonner. Terminer la tâche cadeau ne déclare aucun achat. Sans achat conserve les dépenses historiques.
5. Garder une idée sans événement, choisir pour une occurrence, modifier l’achat (montant/date) et noter un don/réaction. Tester aussi un don direct de l’année précédente.
6. Vérifier 0,29 EUR et 0,00 EUR, montant absent, plusieurs devises, achat sans date, absence de double comptage choix/don. Supprimer l’idée conserve le choix ; retirer le don ne retire pas la dépense du choix.
7. Exporter : cinq ensembles, notes et centimes exacts, aucun compte B. Tester l’effacement uniquement sur copie autorisée avec comptes fictifs et sauvegarde, selon les scripts SQL.
8. B tente l’URL et les requêtes REST/RPC de A ; anon doit être refusé. Les tests JavaScript de filtres ne remplacent pas cette vérification RLS.
9. Vérifier les générateurs avec fournisseur simulé avant un essai payant volontaire : rien de personnel sans case ; uniquement les champs cochés, cases remises à zéro ensuite. Notes d’idées/réactions jamais transmises.
10. Vérifier clavier, 320 px, erreur réseau et hors ligne. Le service worker fournit seulement le secours public ; aucun carnet privé n’est stocké hors ligne.

Aucune dépendance, migration, commit, déploiement, envoi réel ou compte réel supprimé par l’assistant.

