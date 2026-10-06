# Lot 05 — Dossier de schéma des idées, cadeaux et budget

**6 octobre 2026 — schéma appliqué manuellement, catalogue confirmé en lecture seule, code applicatif intégré localement. Tests SQL signalés réussis par l’utilisateur ; recette authentifiée à confirmer. Voir la [recette applicative](../lot-04-05-recette-app.md). Ne pas relancer le schéma installé.**

Dépendance : [lot 04](../lot-04/README.md) installé et confirmé en lecture seule avant le lot 05. Les objets 04/05, absents lors de la première inspection, sont désormais installés ; les catalogues passent les contrôles de lecture seule. Aucun contenu personnel lu pour ces contrôles. Cadre : [section 3](../../PLAN-EVOLUTION-EPHEMER.md#3-cadre-commun-à-tous-les-prompts).

## Modèle proposé

| Table | Rôle et relations |
| --- | --- |
| `idees_cadeaux` | Idée durable avec contact facultatif, sans événement : titre, note facultative, lien facultatif, estimation/devise, archivage, révision et dates techniques. |
| `choix_cadeaux` | Choix pour une préparation obligatoire, idée facultative, titre/estimation copiés, état `prevu/achete/abandonne`, montant réellement dépensé, devise de dépense et date d’achat facultatifs. Une sélection par idée/préparation ; choix sans idée multiples avec UUID client stable. |
| `cadeaux_offerts` | Déclaration manuelle de don : contact et occurrence facultatifs, libellé de destinataire figé, titre, date de don obligatoire, réaction volontaire facultative. Choix facultatif, unique lorsqu’il existe. |

Titres/libellés : 1–200 caractères nettoyés ; note/réaction : 4 000 caractères maximum. Estimation et dépense sont distinctes, y compris leurs devises. Propriété et identité immuables ; références composées vers les parents du même propriétaire ; révisions comme au lot 04. Modification d’une idée ne réécrit pas les choix déjà enregistrés. Une idée archivée reste explicitement sélectionnable par son propriétaire, sans devenir publique.

Un don lié ne possède **aucune deuxième dépense** : ses champs d’achat sont vides et le budget lit le choix. Un don direct peut déclarer un achat grâce à `achat_declare` ; ce booléen distingue une attention sans achat d’un achat dont le montant est inconnu. Le don seul ne coche jamais « acheté ». Sur un choix, `achete` est une déclaration manuelle, sans preuve de marchand, livraison ou envoi.

Un choix acheté peut avoir un montant et/ou une date inconnus. Repasser un choix acheté à prévu/abandonné exige de vider explicitement ses champs d’achat : l’application devra confirmer cette correction. Pour garder une dépense réelle tout en abandonnant les préparatifs, abandonner la préparation, pas l’achat. Le choix `sans_achat` d’une préparation ne supprime aucun achat historique. Un choix prévu déjà offert sort des prévisions, sans être transformé en achat.

## Montants et budget

Décisions confirmées : récapitulatif **sans plafond**, catalogue **EUR/USD/GBP/CHF/CAD**, EUR proposé pour l’estimation. Une devise peut être inconnue si le montant l’est ; aucun montant connu sans devise.

Montants stockés en centimes `bigint`, entre 0 et **9 007 199 254 740 991**. Saisie et conversion futures depuis chaînes décimales : accepter au plus deux décimales, convertir exactement en entier, sans calcul de type `Math.round(Number(texte)*100)`. Un champ vide devient NULL, jamais zéro. Les totaux SQL utilisent NUMERIC, puis des chaînes à deux décimales ; ne pas les convertir en Number pour les additionner.

RPC `budget_cadeaux_lot05(p_debut date,p_fin date)` : intervalle civil de 1 à 366 jours, fin exclusive. Exemple mensuel mai 2027 : 2027-05-01 → 2027-06-01 ; annuel : 2027-01-01 → 2028-01-01. Dates métier Europe/Paris comme au lot 02, sans horodatage d’achat ni conversion UTC.

| Champ retourné, par devise | Définition |
| --- | --- |
| `prevu` (texte décimal) | Estimations connues des choix prévus, non offerts, sur la date courante de l’occurrence. Exclut préparation abandonnée/sans achat, occurrence annulée et événement archivé. |
| `depense` (texte décimal) | Somme connue des choix achetés et achats déclarés des dons directs, par date d’achat dans la période. Conserve les achats malgré abandon/archivage. |
| `nb_prevu_inconnu / nb_depense_inconnu` | Nombre de sources éligibles dont le montant est NULL, distinct du zéro connu. |
| `nb_depense_sans_date / depense_sans_date / nb_depense_sans_date_inconnu` | Achats du compte impossibles à affecter à une période : nombre, somme connue et nombre de montants inconnus. **Hors totaux mensuels/annuels**, identiques quel que soit l’intervalle ; ne jamais additionner ces compteurs d’un mois à l’autre. |

`devise='SANS_DEVISE'` classe les sources de montant et devise inconnus. Aucun taux de change ou total global entre devises. Un résultat vide signifie aucune source éligible, pas erreur ni zéro pour chaque devise. Les agrégats sont SECURITY INVOKER, soumis aux RLS, sans paramètre propriétaire.

Le report d’un événement déplace les prévisions dans le mois de sa nouvelle date ; il ne déplace pas les achats déjà datés. Sélectionner une idée pour une autre année produit un autre choix explicite. Conserver une idée seule ne la compte pas dans le budget.

## Liens, confidentialité et interfaces

Liens absolus http/https facultatifs, 2 048 caractères maximum, hôte ASCII (IDN normalisé en punycode), port 1–65535 facultatif, sans credentials ni espaces/contrôles/chevrons/guillemets. Le helper SQL est conservateur, **sans DNS ni requête réseau** ; il ne garantit ni l’existence ni la fiabilité du marchand. L’application devra aussi utiliser URL(), contrôler protocole/hôte/credentials et sauvegarder la forme normalisée. Un lien reste une valeur de texte rendue dans un attribut href sûr, jamais via du HTML brut. Aucune extraction de prix, prévisualisation distante ou photo/Storage.

Les nouveaux objets sont privés, avec quatre policies RLS propriétaire par table et droits de colonnes minimaux. Pas de privilège d’écriture service_role ; ses lectures futures exigent un filtrage serveur. Fonctions invoker, search_path fixe, EXECUTE limité à authenticated ; helper de lien également exécutable par authenticated pour les CHECK. Le schéma technique `ephemer_lot05` reste hors exposition Data API. [RLS officielle](https://supabase.com/docs/guides/database/postgres/row-level-security).

| Interface future | Comportement |
| --- | --- |
| CRUD idée/choix/don direct | Tables via client authentifié ; UUID client stable, lecture propriétaire paginée. UPDATE avec révision attendue dans WHERE et nouvelle révision ; zéro ligne = conflit/refus, saisie conservée. DELETE explicite avec confirmation de ses dépendances. |
| `choisir_idee_lot05(p_id uuid,p_preparation uuid,p_idee uuid)` | Copie seulement titre/estimation/devise. Retry retrouve l’objet sans écrasement ; une sélection répétée de la même idée/préparation renvoie l’UUID existant. Pas de copie des notes ou du lien dans le choix. |
| `noter_cadeau_offert_lot05(p_id uuid,p_choix uuid,p_date date,p_reaction text)` | Crée/retrouve un don lié, fige le libellé actuel du destinataire. Un retry ne corrige pas date/réaction ; correction ultérieure par UPDATE révisionné. Aucun achat, tâche ou livraison implicitement marqué. |
| `budget_cadeaux_lot05(p_debut date,p_fin date)` | Agrégats exacts décrits ci-dessus, seulement pour le compte courant. |

Idées générales sélectionnables pour tout événement du propriétaire ; une idée rattachée à un contact est aussi sélectionnable volontairement ailleurs, sans réaffectation. Même cadeau sans idée : création directe d’un choix. Aucune IA ne reçoit notes, historique, budget ou réaction ; ne pas étendre les prompts actuels. Aucun cache public, analytics ou journal de ces contenus.

## Conservation et procédures

Supprimer une idée détache `idee_id` et conserve titre, estimation et dépense des choix. Supprimer un contact détache les références des idées/dons ; le lot 02 archive ses événements. Le libellé historique du don reste privé. Les détachements FK incrémentent aussi les révisions, sans échouer sur l’absence d’une révision fournie par le trigger de cascade.

Supprimer un don lié garde l’achat sur le choix ; un don direct supprimé efface sa propre dépense. Supprimer un choix efface son don lié : confirmer cette perte. Effacer explicitement un événement supprime ses préparations/choix/dons associés ; les dons directs sans occurrence restent. Archiver conserve l’ensemble.

Auth → cascades des trois tables. Aucune modification de la route non atomique de suppression dans cette livraison ; recette HTTP complète requise après intégration. Étendre l’export version 3 du lot 04 à **4**, incluant idées, choix, dons, révisions, montants et devises. Lectures paginées propriétaires, pas de téléchargement partiel sur erreur/changement de compte, centimes exacts et agrégats dérivés non dupliqués dans l’export.

1. Valider/appliquer le lot 04 sur copie isolée, exécuter A de sa vérification puis inspecter son contrat réel avant ce lot.
2. Sauvegarder métadonnées/droits et données de la copie ; appliquer manuellement ce `schema-propose.sql`. Le lot 04 n’est pas réécrit et aucun historique ancien importé automatiquement.
3. Exécuter en entier [verification-lecture-seule.sql](verification-lecture-seule.sql), qui contient seulement A et renvoie `lot05_catalogue_conforme` si les contrôles passent. Inspecter advisors et accès Data API. Le fichier complet `verification.sql` comprend également B : activer B seulement sur la copie autorisée, dans la même session, après relecture des triggers externes. B rollbacke toutes ses fixtures ; ROLLBACK explicite sur erreur.
4. Recette C : sur des fixtures dédiées committées, deux sessions authenticated A sélectionnent la même idée/préparation avec deux UUID, puis déclarent le même choix offert avec deux UUID. Le second appel attend le commit du premier, retrouve le même objet ; une ligne par sélection/don. Tester aussi deux éditions de prix avec la même révision : une seule affecte une ligne. Réutiliser le protocole de connexions du lot 04.
5. Après application manuelle validée, confirmer A en lecture seule ; alors seulement régénérer les types et intégrer fiche contact/préparation/budget mobile. Avec deux vrais comptes de test, vérifier REST/RPC, reconnexion, cadeau de l’année précédente, export et suppression synthétique. Les claims simulés de B ne prouvent pas de vrais JWT ni une persistance après reconnexion.

Retour arrière : `retour-arriere.sql` refuse toute donnée présente, ne touche pas au lot 04 et n’utilise que DROP RESTRICT dans une transaction. Une dépendance catalogue bloque l’opération entière. Inspecter également les références textuelles de fonctions et applications ultérieures, que PostgreSQL peut ne pas enregistrer comme dépendances. Après usage ou extension, sauvegarde/réconciliation puis décision humaine : aucun effacement automatique.

## État de validation

Scénarios préparés : idée sans événement, snapshot conservé, année suivante, retries, séparation estimation/dépense/don, zéro/inconnu/sans date, 10+20 centimes exacts, total dépassant les entiers sûrs JS, devises, liens, révisions, A/B/anon et cascades. Des expressions pures ont été vérifiées sur PostgreSQL 17.6 en transaction READ ONLY, avec seules constantes synthétiques : dix cas de liens conformes aux résultats attendus, 10+20 centimes = « 0.30 » et grande somme = « 180143985094820.12 ». Aucun parser/serveur PostgreSQL local disponible ; aucun script de création, recette ou rollback du dossier exécuté à distance. Ces contrôles d’expressions ne compilent pas les fonctions et ne prouvent pas les agrégats sur tables. Compilation, RLS installées, concurrence réelle, exposition REST et parcours applicatifs restent à vérifier. Voir [SUIVI.md](../SUIVI.md).
