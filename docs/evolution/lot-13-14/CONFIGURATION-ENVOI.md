# Liens, webhook et essai email distinct

17 octobre 2026. Configuration manuelle, aucun secret généré/imprimé, aucun email réel autorisé ou envoyé par cette livraison.

## État contrôlé

- Base actuelle : après installation humaine de 01–04, contrôle READ ONLY des 39 empreintes/protections réussi ; `enabled=true` et `collective_enabled=true`. Activation confirmée par le résultat utilisateur `collectif_active_sur_GO_humain_recette_distante_non_effectuee`. Journal vide et aucun rappel déjà dû étaient les constats du contrôle avant activation ; aucun nouveau contenu métier lu.
- Resend : un webhook activé à l'adresse attendue, avec les sept événements de suivi indiqués ci-dessous. Sa déclaration ne prouve pas la réception d'un événement signé.
- Local : toutes les variables nécessaires présentes, `EPHEMER_CARD_LINK_KEY` au format valide et `RESEND_WEBHOOK_SECRET` désormais présente. Contrôle par `node tools/check-collective-config.mjs`, valeurs jamais affichées ; égalité du secret avec Resend non inspectée.
- Vercel, projet de l'application : sur demande explicite de l'utilisateur, `EPHEMER_CARD_LINK_KEY` et `RESEND_WEBHOOK_SECRET` créées pour production/preview en type sensible, avec des valeurs provisoires non secrètes à remplacer humainement avant déploiement. Présence des deux noms et environnements confirmée par relecture sans déchiffrement. `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` et `CRON_SECRET` étaient déjà déclarées ; aucune valeur de clé réelle lue ou imprimée.

## Configuration humaine — procédure conservée

SQL et activation, clés locales et déclaration du webhook sont désormais confirmés. Les deux variables Vercel existent maintenant ; remplacer leurs valeurs provisoires par les vraies clés, puis effectuer le déploiement humain. Ne pas réinstaller le SQL pour ce réglage.

1. Renseigner **`EPHEMER_CARD_LINK_KEY`** dans l'environnement local et Vercel concerné : clé privée de 32 octets, représentée par exactement 64 caractères hexadécimaux. Ne pas la partager dans une conversation. Conserver toute clé de production déjà utilisée : la remplacer rend les anciens liens chiffrés irrécupérables. Ce dossier ne crée ni ne remplace de clé.
2. Dans Resend → Webhooks, créer/configurer l'adresse **https://ephemer.name/api/webhooks/resend** avec ces événements seulement : `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.failed`, `email.suppressed`, `email.delivery_delayed`. Aucune inscription aux ouvertures/clics nécessaire.
3. Copier directement le secret de signature du webhook dans **`RESEND_WEBHOOK_SECRET`** sur Vercel et dans l'environnement local si les essais de signatures y sont réalisés. Le secret reste dans les outils de configuration ; ne pas le coller dans le dépôt ou dans une réponse à l'assistant.
4. Vérifier **`CRON_SECRET`**, **`RESEND_API_KEY`**, **`SUPABASE_SERVICE_ROLE_KEY`**, **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** par leur nom et leur présence. `vercel.json` conserve exactement les trois crons existants. Après modification des variables Vercel, leur prise en compte nécessite un nouveau déploiement humain.
5. Installer humainement `04-raccordement.sql`, exécuter `verification-raccordement.sql`, puis le fichier complet `activation.sql`. Il contient déjà la décision explicite « sans recette distante » demandée : aucun marqueur à saisir dans une autre session SQL. Une nouvelle présence d'emails historiques ou d'engagements interrompt l'activation et exige leur revue. Le fichier n'envoie aucun email ; les traitements ultérieurs peuvent envoyer ceux programmés volontairement.

La vérification du webhook porte sur le corps brut et les trois en-têtes Svix avant toute écriture. Le journal déduplique l'identifiant d'événement. « Accepté » ne veut pas dire « livré » ; sans `email.delivered` signé, la livraison reste non confirmée. Après engagement incertain, aucun renvoi automatique.

## Essai réel, à autoriser séparément

Cette procédure est préparée mais non exécutée. L'autorisation d'une adresse de test précise est encore nécessaire ; les comptes pilotes et leurs adresses ne sont pas réutilisés implicitement.

1. Faire autoriser une adresse de réception, saisir volontairement cette même adresse privée lors de la création d'une célébration/carte de test dédiée. Utiliser uniquement des textes et signatures de test. Inviter à signer reste une invitation interne, sans email.
2. Confirmer la contribution, fermer, valider l'aperçu et publier. Récupérer explicitement le lien et vérifier qu'il ouvre la publication. Ne jamais copier son secret dans des journaux ou captures partagées.
3. Programmer **une** tentative email vers l'adresse autorisée. L'heure est distincte de la publication ; attendre le passage quotidien de 07 h UTC et ses délais, ou autoriser séparément un déclenchement authentifié de la même route existante. Aucun nouveau cron, aucun paramètre `force`.
4. Contrôler l'état « accepté », puis « livraison confirmée » uniquement après réception du webhook signé. Dans Resend, contrôler les tentatives du webhook en cas de panne ; la reprise de ce webhook ne renvoie pas l'email.
5. Tester le rejeu d'un événement de webhook, puis révoquer le lien depuis l'application. Ne pas relancer un email « incertain » ; rapprocher son identifiant fournisseur et les événements.

Les simulations locales couvrent les réservations concurrentes, réponses perdues et pannes. Les vrais JWT, courses PostgreSQL et réception réelle ont été explicitement écartés par l'utilisateur ; ils ne sont pas déclarés réussis.

Références : [variables Vercel](https://vercel.com/docs/environment-variables), [webhooks Resend](https://resend.com/docs/dashboard/webhooks/introduction), [idempotence Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).
