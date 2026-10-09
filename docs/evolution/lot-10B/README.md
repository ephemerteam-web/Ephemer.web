# Ephemer — lot 10B, Mon univers

**9 octobre 2026 : schéma installé humainement et catalogue combiné confirmé ; intégration livrée localement.** Le contrôle distant en READ ONLY retourne `lot10b_catalogue_conforme`. Les types ont été régénérés depuis le schéma réel. Aucun commit ou déploiement ; tester avec `npm run dev`.

## Disponible dans l’application

- `/dashboard/univers` et navigation **Mon univers** : identité sociale, goûts et informations pratiques, aperçu mobile/desktop, permissions distinctes et sauvegarde commune. Les valeurs restent un brouillon jusqu’au clic ; année facultative, email et téléphone indépendants.
- **Voir son univers** depuis une étoile active, même sans fiche. Bloc **Son univers partagé** dans le drawer et la fiche associée, sans recopier dans le carnet ni créer d’événement/rappel. Le nom du carnet reste personnel.
- Avatar partagé volontairement depuis le dernier avatar enregistré valide. Le contexte distingue cette source du repli personnel ; les essais ne sont jamais publiés.
- Routes authentifiées `GET/POST /api/univers` et `GET /api/univers/etoile` : client par requête, vérification Auth, JWT utilisateur, DTO distincts, paramètres/corps bornés et fermés, réponses privées sans cache. Aucun service role.
- Révision attendue, UUID conservé pour les reprises, relecture après mutation même en erreur, conflits explicites et saisies conservées. États en mémoire par compte, lectures dépassées ignorées, focus et 60 secondes visibles. Contenu tiers effacé lors de masquage de page, hors ligne, erreur, retrait/blocage ou perte d’association constatés.
- Export personnel **9**, avec valeurs et permissions du propriétaire uniquement ; aucun univers tiers, journal d’opérations ou secret. Confidentialité actualisée. Aucune utilisation des univers par l’IA avant 10C. Tout reste gratuit.

## Dossier SQL

| Fichier | Rôle |
|---|---|
| [schema-propose.sql](schema-propose.sql) | Proposition complète déjà installée humainement ; **ne pas rejouer** |
| [verification-lecture-seule.sql](verification-lecture-seule.sql) | Contrôle combiné 10A + 10B ; résultat attendu `lot10b_catalogue_conforme` |
| [verification.sql](verification.sql) | Recette mutante réservée à une copie isolée autorisée, garde et ROLLBACK |
| [retour-arriere.sql](retour-arriere.sql) | Refuse si des données 10B existent ; jamais un effacement de données |
| [CONTRAT-APPLICATION.md](CONTRAT-APPLICATION.md) | Contrats intégrés et protections |
| [RECETTE-APPLICATION.md](RECETTE-APPLICATION.md) | Preuves, simulations et essais distants encore reportés |

Deux tables privées dans `ephemer_social`, RLS activée sans policy ouvrante ni droits directs client. Identité sociale adaptée, valeurs et neuf permissions validées en SQL, journal d’empreinte/reçu sans historique des champs, cascade Auth. Chaque consultation vérifie la relation active, l’absence de blocage et les permissions ; une année masquée n’est pas retournée. Le dernier avatar valide est résolu à la lecture, sans Storage ni duplication.

L’installation a été faite par l’utilisateur dans le dashboard conformément à [AGENTS.md](../../../AGENTS.md). Corrections de préparation : confirmation locale incluse, `CASE` parenthésé et refus des objets vides avec `IS DISTINCT FROM`. Les empreintes du contrôle combiné correspondent à cette version installée. Un contrôle des métadonnées ne remplace pas une recette comportementale avec JWT signés.

## Vérifications et limites

Vérifications complètes et recette navigateur détaillées dans [RECETTE-APPLICATION.md](RECETTE-APPLICATION.md). Les requêtes distantes de l’assistant ont porté sur le catalogue et les types, jamais sur un contenu personnel ou une mutation. L’aperçu `node tests/univers-preview.mjs` utilise les vrais composants et le transport navigateur, avec Auth et réponses HTTP fictives en mémoire, réseau externe interdit. Captures dans `out/univers-preview/`.

**Restent reportés** : essais avec vrais JWT, droits REST/RPC directs, concurrence PostgreSQL, cascades de suppression sur comptes fictifs autorisés et réponse réellement perdue sur réseau. La recette mutante n’a pas été exécutée faute de copie autorisée. Conservation/purge du journal, limitation de débit globale et mesure du verrou commun 10A restent requises avant ouverture publique.

L’export est une lecture paginée sans instantané transactionnel. Une information déjà vue/copiée ne peut pas être retirée de la mémoire d’un destinataire. Le navigateur hors ligne affiche la page de secours sans cache privé ; le formulaire déjà ouvert garde uniquement son brouillon personnel en mémoire.

Pour régénérer le contrôle local après une future modification validée : `node tools/prepare-lot10b-catalogue.mjs`, puis `--check`. Cette commande écrit le dossier local uniquement, jamais la base ou ses types.
