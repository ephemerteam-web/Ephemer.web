# Ephemer — Mes étoiles et Mon univers

## Première version retenue

Construire les relations entre utilisateurs sur le socle des lots 0 à 7, puis développer les constellations dans un lot suivant.

Deux personnes deviennent **étoiles** :
- **Automatiquement**, lorsque chacune possède dans son carnet l’adresse de connexion vérifiée de l’autre.
- **Par invitation**, lorsqu’une demande est explicitement acceptée.

Le lien est ensuite attaché aux comptes : un changement d’adresse ou la suppression d’une fiche contact ne retire pas l’amitié. Chacun peut retirer ou bloquer une étoile.

L’invitation actuelle reste disponible pour recueillir une fiche dans le carnet privé.

## 1. Reconnaissance automatique et demandes d’amitié

**Reconnaissance réciproque**
- Utiliser les e-mails vérifiés de Supabase Auth, jamais une adresse librement modifiable dans le profil.
- Comparer les adresses après suppression des espaces périphériques et normalisation de casse, sans rapprochement approximatif.
- Vérifier les correspondances à l’ouverture du dashboard et après modification du carnet. Une personne nouvellement inscrite est reconnue lors de son premier accès authentifié.
- Créer une seule relation par paire de comptes, même avec plusieurs fiches correspondantes.
- Remplacer l’ancien mécanisme technique de `est_contact_lie` par une opération serveur limitée au compte authentifié. Conserver sa règle métier réciproque.
- Une relation retirée ou bloquée ne peut pas réapparaître automatiquement.

**Demandes explicites**
- Envoyer une demande depuis un contact, une adresse exacte ou un lien partagé.
- La recherche par e-mail retourne toujours une confirmation neutre, sans révéler l’existence du compte, son nom ou son profil.
- Une demande peut attendre une inscription ; elle apparaît seulement au titulaire vérifié de l’adresse. Expiration après 30 jours.
- Un lien d’invitation permet de demander une relation à son créateur ; il ne crée pas automatiquement une amitié. Expiration après 7 jours, révocation possible.
- Limiter les nouvelles demandes à 20 par compte et par jour côté serveur ; rendre les retries et doubles clics idempotents.
- Utiliser des notifications internes pour cette version. Le partage externe du lien reste à l’initiative de l’utilisateur.

## 2. Mes étoiles et Mon univers

**Mes étoiles**
- Nouvelle page avec étoiles actives, demandes reçues et demandes envoyées.
- Pastille étoile dans les fiches du carnet qui correspondent à une relation active.
- Actions : accepter, refuser, annuler une demande, retirer une étoile, bloquer et débloquer.
- Débloquer ne restaure pas l’amitié ; une nouvelle demande acceptée est nécessaire.
- Une demande acceptée sans fiche correspondante propose d’ajouter un contact, sans insertion automatique ni doublon.

**Mon univers**
- Identité minimale visible aux étoiles : prénom ou pseudonyme. Aucun nom complet, anniversaire ou coordonnée partagé automatiquement.
- Champs facultatifs : passions, ce qui fait plaisir, préférences à éviter, présentation personnelle, anniversaire et coordonnées choisies.
- Les champs activés sont visibles par **toutes les étoiles actuelles et futures**, avec cette portée indiquée clairement.
- Prévisualisation « Ce que mes étoiles voient » et commandes explicites de partage.
- Les notes privées existantes et les anciens textes d’invitation ne sont jamais publiés automatiquement.

**Dans une fiche contact**
- Présenter l’univers partagé dans un espace distinct, à jour.
- Conserver les coordonnées, notes, dates et intérêts privés du propriétaire.
- Ne pas écraser le carnet ni modifier automatiquement ses événements ou rappels.
- Couper l’accès partagé au retrait de la relation ou du champ. Les informations déjà vues ne peuvent pas être retirées de la mémoire du destinataire.

## 3. Suggestions cadeaux avec double accord

Ajouter une source distincte « Informations partagées par cette étoile » aux générateurs existants.

- L’auteur autorise séparément l’utilisation IA de chaque champ partagé pertinent : prénom/pseudonyme, passions, plaisirs, préférences à éviter et présentation.
- Toutes ces autorisations sont désactivées initialement.
- Pour chaque génération, le demandeur sélectionne les champs autorisés qu’il souhaite transmettre. La sélection est réinitialisée après la tentative ou le changement de destinataire.
- Le serveur relit l’amitié, le partage et l’autorisation IA avant l’appel fournisseur. Une autorisation retirée bloque l’envoi du champ.
- Ne transmettre ni coordonnées ni dates de naissance exactes.
- Identifier clairement les sources « mes notes privées » et « son univers partagé » ; aucune copie automatique entre elles.
- Conserver quotas, limites, traitement des textes comme données et protection contre les instructions contenues dans les notes. Actualiser la notice de confidentialité.

## 4. Données, interfaces et ordre de livraison

Prévoir les objets suivants : relations d’étoiles, demandes, liens d’invitation, univers partagé, permissions de champs et autorisations IA. Les relations utilisent les identifiants de comptes ; les demandes par adresse restent privées.

Ajouter :
- les pages `/dashboard/etoiles` et `/dashboard/univers` ;
- des opérations serveur authentifiées de reconnaissance, demande, acceptation, retrait, blocage et consultation d’univers ;
- les types `Etoile`, `DemandeEtoile` et `UniversPartage`, ainsi que la sélection des champs d’univers autorisés dans les requêtes IA ;
- des notifications sociales avec références à la demande ou relation concernée.

Livraison en trois sous-lots :
1. **10A — Relations** : reconnaissance réciproque, demandes, blocage et page Mes étoiles.
2. **10B — Univers** : édition, partage, aperçu et affichage dans le carnet.
3. **10C — Cadeaux** : double accord et intégration aux générateurs.

Préparer les dossiers SQL, permissions, tests et retours arrière pour validation humaine conformément à AGENTS.md. Ne dépendre du schéma qu’après confirmation de son installation. Toutes les fonctions restent gratuites.

## 5. Vérifications et suites

Tester avec comptes fictifs :
- correspondance réciproque, correspondance unilatérale et adresse non vérifiée ;
- inscription tardive, changement d’e-mail et doublons de contacts ;
- demandes croisées, retries, acceptation concurrente et liens expirés ;
- réponse neutre pour une adresse inscrite ou inconnue ;
- impossibilité de rétablir automatiquement un lien retiré ou bloqué ;
- accès direct aux données par propriétaire, étoile, ancien ami et non-ami ;
- retrait d’un partage ou d’une permission IA avant génération ;
- absence d’écrasement des notes privées, export, suppression et nettoyage des états lors d’un changement de compte.

Compléter par lint, TypeScript, tests pertinents, build et recette mobile/desktop. Distinguer les simulations des vérifications réelles des permissions Supabase.

Les ajouts suivants seront les **constellations privées**, puis les listes d’envies avec réservation discrète et les préparatifs collectifs. La première version communautaire se concentre sur des relations fiables et des profils réellement utiles pour choisir une attention.
