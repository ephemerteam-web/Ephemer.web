# Résumé push quotidien

Le code est prêt, mais l'envoi est désactivé tant que la configuration serveur et le journal durable ne sont pas installés. Aucun schéma distant n'a été modifié par l'assistant.

## Installation humaine

1. Relire puis exécuter `docs/sql/daily-push.sql` dans le SQL Editor Supabase. Il ajoute seulement un journal serveur et deux fonctions réservées au rôle serveur. Vérifier que pgcrypto est dans le schéma `extensions`, comme habituellement sur Supabase ; adapter ce préfixe si l'installation existante diffère.
2. Utiliser une paire VAPID P-256. Conserver les valeurs hors du dépôt et des logs. La clé publique existante doit correspondre à la clé privée ; changer cette paire oblige à réabonner les appareils.
3. Configurer sur Vercel : `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (contact mailto ou URL HTTPS), et `EPHEMER_DAILY_PUSH_ENABLED` à `true`. Vérifier aussi la présence de `CRON_SECRET`. Aucune valeur de secret ne figure ici.
4. Redéployer. Dans Notifications → Paramètres : activer « Résumé quotidien par push », puis préparer chaque appareil. Le contrôle authentifié `/api/push/status` doit annoncer le serveur prêt.
5. Sur iPhone/iPad : iOS/iPadOS 16.4 minimum, installer le site sur l'écran d'accueil et ouvrir l'application installée avant le clic d'autorisation. HTTPS requis, sauf localhost pour le développement.

## Avertissement SQL et réglages Vercel

Vérification via le connecteur Vercel le 10 octobre 2026 : les trois variables VAPID étaient déjà présentes sur `ephemer-web` en Production et Preview, avec une clé privée de type Secret. Seul `EPHEMER_DAILY_PUSH_ENABLED` manquait ; il a été créé à `true` sur ces deux environnements et sa présence a été vérifiée. Aucune clé existante n'a été remplacée ni affichée. Cette vérification porte sur les noms, les types et les environnements, pas sur la correspondance cryptographique des clés. Aucun redéploiement ni installation SQL n'a été effectué lors de cette opération.

Les variables Vercel configurent le site hébergé. `.env.local` sert au développement local avec `npm run dev` et ne doit pas être commité. Une clé privée Vercel de type Secret n'est pas relisible après enregistrement : pour l'utiliser en local, il faut disposer de la copie conservée lors de sa génération, sans modifier la paire de production.

Supabase peut afficher un avertissement d'opérations destructives pour ce script. Le `DELETE` est dans la fonction d'envoi : il nettoie uniquement les réservations de push datant de plus de trente jours, lors d'un futur appel. Installer la fonction n'exécute pas ce nettoyage. Les `REVOKE` restreignent l'accès au journal et aux deux fonctions ; les `CREATE OR REPLACE` remplacent ces fonctions si elles existent déjà. Le script ne supprime aucun contact, événement ou notification de la cloche.

Dans Vercel, vérifier séparément le nom et la valeur de chaque variable. Une chaîne ressemblant à une clé appartient au champ valeur. Les noms attendus sont exactement `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` et `EPHEMER_DAILY_PUSH_ENABLED`. Utiliser le type Config pour la clé publique et le drapeau d'activation, et Secret pour la clé privée. Conserver la paire VAPID existante quand elle est disponible et correspondante.

Le badge « Needs Attention » seul ne permet pas de diagnostiquer une clé invalide : consulter le détail de l'avertissement. La politique facultative Vercel « Separate Production Secret Values » peut imposer des secrets distincts entre Production et Preview. Après toute modification des variables, créer un nouveau déploiement ; les déploiements existants conservent leur ancienne configuration. Références : [variables Vercel](https://vercel.com/docs/environment-variables), [types Config et Secret et séparation des environnements](https://vercel.com/docs/environment-variables/sensitive-environment-variables).

## Fonctionnement et coût

Le cron existant à 08:00 UTC réalise l'envoi : 09:00 en hiver, 10:00 en été en France. Pas de nouveau cron ni service payant. L'heure exacte dépend de l'offre Vercel ; les crons Hobby ne garantissent pas la minute exacte. Les bibliothèques `web-push` et `html-to-image` sont gratuites ; les quotas existants d'hébergement et de base restent applicables.

Une réservation atomique par compte, empreinte d'endpoint et date de Paris précède chaque envoi. Les appareils dupliqués sont dédupliqués. En cas de réponse perdue, d'erreur ou de crash après réservation : aucune nouvelle tentative ce jour-là. Ce choix évite les doublons et peut faire perdre un résumé. La réception effective par un navigateur n'est jamais garantie. Un endpoint expiré (404/410) est retiré ; le journal reste trente jours. Supprimer le compte supprime ses réservations.

Les anniversaires, les fêtes prénomales confirmées et les événements personnels du jour avec rappels actifs sont regroupés. Les fêtes seulement déduites du prénom, les dates archivées/annulées, les séries à reconfirmer et les jours sans date sont exclus. L'option facultative « Inclure les saints du jour », propre à chaque appareil, est décochée par défaut. Elle permet un push même sans date personnelle. Aucun push social ni J-7/J-3/J-1 n'est ajouté. Les rappels existants dans la cloche et par email conservent leurs règles.

L'écran verrouillé ne montre aucun nom de proche ni titre privé. Les saints publics peuvent être affichés. Le clic ouvre le centre de notifications authentifié et son résumé du jour, sans marquer les notifications comme lues.

## Recette après installation

Sur un compte de test : vérifier le refus sans session et sans `CRON_SECRET`, l'absence d'envoi quand le canal est éteint ou le journal absent, un anniversaire non favori, une fête confirmée, une occurrence annulée, un jour vide, le saint facultatif, deux appels simultanés puis une relance du cron. Chaque appareil doit avoir zéro ou un envoi au total. Tester la désactivation, le changement de compte et deux appareils. Les tests du dépôt utilisent des transports simulés et n'envoient aucun vrai push.

Références : [Web Push sur les applications iOS installées](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [crons Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing), [web-push](https://github.com/web-push-libs/web-push).
