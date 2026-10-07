# Intégration après confirmation du schéma — lot 08

**Contrat intégré localement le 7 octobre 2026 après confirmation humaine des SQL et contrôle du catalogue en lecture seule.** Types réels régénérés, routes et persistance ajoutées. La recette avec comptes de test réels et la configuration manuelle de `EPHEMER_CARD_LINK_KEY` restent nécessaires avant validation de livraison.

## Éditeur connecté

Remplacer l’aperçu temporaire de la préparation par son éditeur persistant. Une carte identifiée par UUID stable et FK préparation/propriétaire ; création explicite sur le premier enregistrement, pas à l’ouverture. Signature vide par défaut, aucune lecture du profil pour signer. Modèles gratuits, format/rendu/modèle V1 strictement validés par `lib/cards.ts`. Ne pas recopier de données de contact dans une publication.

Utiliser le client Supabase navigateur et les RLS pour créer/lire/éditer. INSERT limité aux colonnes accordées. UPDATE `(id,user_id,revision)` avec `revision+1`. Avant/après requête, vérifier le compte comme les helpers existants ; ne pas appliquer de résultat d’un ancien scope. La première création conserve son UUID en cas de perte de réponse, relit la ligne et compare le contenu au lieu de l’écraser. Le conflit d’unicité préparation demande de relire la carte existante.

Garder la révision du texte en cours de saisie, même après rafraîchissement en arrière-plan. Erreur/conflit conserve les champs, sans retry aveugle. Les saisies non enregistrées bloquent la publication ; bouton d’enregistrement séparé, puis aperçu exact du dernier état enregistré et confirmation de publication. Brouillon et version publiée sont distingués. La modification de brouillon ne modifie pas le rendu publié.

## Routes à ajouter

Toutes les routes utilisent Node, JSON borné et `Cache-Control: private, no-store, max-age=0`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow, noarchive`. Ni contenu ni URL/token dans journaux ou analytique. Ne pas activer CORS ; refuser les origines étrangères sur les mutations. Vérifier le bearer par `supabaseAdmin.auth.getUser`, puis chaque ressource avec `user_id` vérifié, jamais un propriétaire envoyé par le client. Les mutations reçoivent uniquement des objets fermés ; 64 Kio maximum, refus 413 avant parsing complet ; identifiants UUID, révisions entières sûres et durées autorisées.

| Route | Entrée et réponse |
|---|---|
| `POST /api/cartes/[id]/publication` | `{revision, operationId, expiryDays}`. Le serveur génère linkId et secret/enveloppe, puis appelle `gerer_partage_carte_lot08` action publier. La version copie la ligne enregistrée dans la transaction. Après succès/retry, relire carte/statut ; retourner révision actuelle et statut courant. Pas de secret aléatoire de tentative dans la réponse. |
| `GET /api/cartes/[id]/lien` | Statut courant du propriétaire, version publiée, linkId et échéance ; aucune enveloppe cryptographique. |
| `POST /api/cartes/[id]/lien` | `{action:"recuperer"}` : relire le droit actif avec enveloppe, déchiffrer/contrôler son empreinte, retourner son secret et échéance uniquement au propriétaire. `{action:"remplacer",revision,operationId,expiryDays}` ou `{action:"revoquer",revision,operationId}` : RPC atomique puis statut courant. Révoquer n’exige aucune clé. |
| `DELETE /api/cartes/[id]` | Propriétaire vérifié ; DELETE filtré id/propriétaire avec retour d’ID, cascades confirmées. Une carte inaccessible ne se distingue pas d’un ID inconnu. |
| `GET /api/cartes/export-liens` | Curseur UUID facultatif ; `exporter_liens_cartes_lot08` avec l’ID Auth vérifié et page de 200 maximum. Projection fermée sans secret/empreinte/nonce/tag. |
| `POST /api/cartes/consulter` | Exception sans compte : `{secret}` uniquement, corps 2 Kio maximum, pas de credentials. Valider secret canonique 43 caractères, hacher et appeler `consulter_carte_lot08`. Seule réponse de succès : `{content,expiresAt}` avec `cardSnapshot(content,true)` et expiration valide. |

Les retours RPC de mutation mémorisent le résultat initial ; ce n’est pas une preuve de droit encore actif. Après une réponse perdue, reprendre le même UUID et la même demande, puis relire l’état courant. Si ce droit a été remplacé/révoqué entre-temps, ne pas le réactiver et ne pas afficher sa valeur comme active. Le serveur ignore l’enveloppe regénérée lors d’un retry reconnu. Réserver la création/récupération d’un secret à un module `server-only` ; aucun import crypto Node dans un composant client.

Le RPC de récupération renvoie aussi `secretHash` au serveur pour comparer l’empreinte du secret déchiffré. Cette empreinte et l’enveloppe sont retirées de toute réponse navigateur. Une discordance refuse la récupération sans exposer la valeur.

HTTP : 401 session absente/invalide, 404 ressource étrangère/inconnue, 409 révision périmée, 400 entrée invalide, 413 trop volumineux, 503 incident serveur/clé indisponible. Pour la lecture publique, absence/format incorrect/secret inconnu/révocation/expiration : même 404 et texte **« Cette carte est indisponible »** ; une panne produit une erreur générique sans détails Supabase ni contenu résiduel. Pas de GET à token, pas d’endpoint public de liste.

La récupération et le partage du lien sont des actions volontaires. Construire `/carte#<secret>` depuis l’origine courante du navigateur ; serveur ne construit pas d’URL secrète avec un header Host non fiable. Copier/menu natif depuis un clic, titre générique sans message. En cas de menu natif annulé, ne pas annoncer de partage réussi. Alternative de copie/sélection manuelle si les API navigateur sont absentes, sans service tiers. Décrire transfert possible et limite de révocation avant publication/partage.

## Page destinataire et rendu immuable

`/carte` sert un shell générique sans message côté HTML/metadata. Lire le fragment en mémoire côté client ; le transmettre par POST même origine, `credentials: "omit"`, `cache: "no-store"`. Aucune requête Supabase depuis le destinataire. Rejeter tout paramètre de secret dans query/path ; pas de profil ni état d’auth requis.

Métadonnées explicitement génériques, `robots` noindex/nofollow/noarchive, OpenGraph/Twitter sans message ni URL secrète. Headers page et API no-store/no-referrer, y compris erreurs ; vérifier le résultat en build production et requêtes HTML/RSC. Pas de script tiers ni instrumentation automatique sur cette page. Root layout actuel sans analytique : vérifier qu’aucun nouveau tracker n’est monté. Le service worker existant n’admet aucun HTML/RSC/API dans son cache ; garder cette règle.

Nettoyer le contenu lorsque la page est masquée/quittée (`visibilitychange`, `pagehide`), à l’échéance et hors ligne. Revalider au retour (`pageshow`, visibilité/focus), sans servir la mémoire précédente pendant la requête. Ignorer/annuler les réponses anciennes si token/scope/visibilité changent, même après navigation arrière. Un échec de vérification ne conserve pas la carte à l’écran. Le secret et le contenu restent en mémoire, sans localStorage/sessionStorage/IndexedDB/cache.

Rendre via le moteur versionné, texte React sans `dangerouslySetInnerHTML`, pas d’autolink. Toute version inconnue est indisponible, jamais remplacée par un modèle par défaut. Garder moteur/décors V1 avec palette, typographie et styles explicites ; les changements futurs créent V2. Le choix d’un avatar au lot 09 demandera son propre schéma/snapshot confirmé ; les cartes V1 gardent leur signature texte. La stabilité concerne les mises à jour applicatives, pas un rendu au pixel près entre systèmes et tailles d’écran différents.

## Export, recette et livraison

Après types réels régénérés, export **version 6** : cartes et versions paginées côté propriétaire, statuts des droits via route protégée. Réutiliser vérification de compte avant/après et arrêt complet sur erreur. Aucun secret ni historique d’opérations internes. Confirmer les cascades Auth/préparation et documenter la conservation d’événements/cartes après suppression d’un contact selon lot 02.

Tests HTTP comportementaux avec fournisseur/base simulés : projection de réponse, session/propriétaire, erreurs homogènes, expirations, absence d’écriture du visiteur, corps bornés, JSON invalide, reprise/révision, clé manquante, menu natif annulé, saisie conservée et changement de compte. Les tests existants de crypto utilisent AES réel, pas des mocks. Ne pas remplacer les essais RLS distants par des recherches de chaînes de source.

Recette réelle sur copie autorisée : comptes A/B/anon par REST et via l’API, ouverture sans compte, HTML/social génériques, stable après édition du brouillon, révocation/republication, vraie reconnexion et récupération du même lien, expiration, suppression, concurrence à deux connexions. Inspecter les payloads/journaux accessibles pour vérifier l’absence de secrets ; ne pas prétendre attester les logs fournisseurs non consultables.

Navigateur 320/390/1280 px, clair/sombre, clavier/dialogue/focus, texte hostile, très longues chaînes, connexion lente/perdue, pageshow après retour arrière, changement de compte et secours PWA. Ensuite `npm run verify`, `git diff --check`, mise à jour SUIVI/confidentialité et bilan distinguant réel/simulé/restant. Aucun commit ni déploiement.
