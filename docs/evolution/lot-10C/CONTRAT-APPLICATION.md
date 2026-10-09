# Contrat applicatif 10C — intégré après catalogue confirmé

**Intégré localement au 9 octobre 2026.** Le catalogue 10C installé humainement a été confirmé en lecture seule. `types/database.generated.ts` a été régénéré depuis la base réelle ; `types/database.ts` conserve ses alias métier. Les simulations n'effectuent aucun appel distant.

## Données et opérations

`MonUniversCadeaux` étend le DTO propriétaire 10B avec `iaCadeaux`, objet fermé de cinq booléens : `identite`, `presentation`, `passions`, `plaisirs`, `eviter`. Les quatre textes exigent aussi leur partage. L'identité sociale reste partagée minimalement, mais son usage IA exige son propre booléen. Toutes les valeurs IA démarrent à false. `UniversPartage` conserve exactement son contrat 10B.

`UniversPourCadeaux={revision,revisionRelation,champs}` contient seulement les valeurs non vides autorisées à la fois pour le partage et les cadeaux. Aucun champ interdit ni permission brute. Identité absente de `champs` sans accord, même si elle reste visible dans l'interface sociale habituelle.

`SelectionUniversCadeaux={etoileId,revision,revisionRelation,champs}` : UUID utilisateur cible, révisions entières sûres, tableau de 1 à 5 noms uniques appartenant à la liste fermée. Aucun texte social dans le corps. Une sélection absente signifie aucun usage social ; tableau vide, null, champ inconnu ou doublon sont refusés. Une RPC de résolution doit retourner exactement les noms demandés et les mêmes révisions.

| Route intégrée | RPC avec le JWT de l'utilisateur |
|---|---|
| GET `/api/univers` | `lire_mon_univers()` ; DTO propriétaire enrichi |
| POST `/api/univers` | `commander_mon_univers(...)` ; `iaCadeaux` obligatoire pour enregistrer |
| GET `/api/univers/cadeaux?etoileId=<uuid>` | `consulter_univers_cadeaux(p_etoile)` |
| POST `/api/generate-gift-ideas` | `resoudre_univers_cadeaux(p_etoile,p_champs,p_revision,p_revision_relation,p_contact)` |

La commande conserve la révision attendue et le même UUID pour une reprise. Une sauvegarde 10B sans `iaCadeaux` est refusée, même si un ancien journal existe. Ne pas ajouter les permissions par défaut à une requête ancienne. Un brouillon initial peut utiliser `universCadeauxInitial()` ; une réponse serveur doit toujours passer par `monUniversCadeaux()` strict.

Le masquage global conserve valeurs et permission IA d'identité, car l'identité n'est pas un champ facultatif masqué. Il retire les quatre permissions IA des textes. Au décochage individuel du partage dans le brouillon, décocher immédiatement la permission IA correspondante ; l'enregistrement applique les deux ensembles atomiquement. Modifier une valeur conserve l'autorisation et le nouveau texte ne devient utilisable qu'après enregistrement.

## Génération et quota

Fermer l'enveloppe cadeaux aux seules options actuelles, `contactId`, `consentFields` privés et `univers` facultatif. Valider types, unicité et bornes avant le compteur. Conserver corps 16 Kio, textes sociaux 80/1000 caractères, notes privées 4000, réponse fournisseur 64 Kio et timeout 30 secondes. Les erreurs et logs ne contiennent ni prompt, notes, JWT ni contenu SQL.

Utiliser un client par requête avec clé anon et bearer vérifié pour Auth et les RPC sociales, acteur confirmé non anonyme. Le quota serveur conserve son accès `service_role`, avec l'identité issue de `auth.getUser`, jamais du corps. Séparer dans `garde-ia` l'authentification et la consommation pour les cadeaux ; conserver une façade pour les routes messages existantes.

L'orchestration intégrée `genererCadeauxAvecSources` impose : session → notes privées consenties et filtrées propriétaire → résolution sociale avant quota → quota → nouvelle résolution → fournisseur → session et résolution finales → restitution. Le transport social transforme P1009 en 409 et 42501 en 403 ; le générateur transforme ces pertes d'autorisation ou révisions en conflit 409 exigeant une nouvelle sélection, avant de restituer toute réponse. Session 401, entrée 400/413, quota 429, indisponibilité générique 503. Origine vérifiée et réponses `private,no-store`, Vary Authorization, sans cache PWA/RSC/browser.

Si des données privées et sociales sont combinées, passer le contact actuel en texte à la résolution, qui vérifie l'association propriétaire. Résoudre également cette association après l'appel. Refuser toute conversion numérique non sûre. Sans contact, transmettre NULL, ne créer aucune fiche et garder l'enregistrement des idées sans rattachement.

Prompt : deux objets identifiés « mes informations privées » et « son univers partagé », données uniquement, jamais des instructions ; ne pas fusionner les champs ou présenter une note privée comme déclaration de l'étoile. Ne pas envoyer de coordonnées, anniversaire ou avatar structurés. La note privée explicitement choisie est libre et doit garder l'avertissement sur les données qu'elle peut contenir. Les textes sociaux libres peuvent eux aussi contenir des informations personnelles saisies par l'auteur ; ne pas promettre une expurgation automatique.

Le modèle peut utiliser tous les champs explicitement choisis, mais ne doit pas inventer des préférences ou certifier les produits/prix. Si un texte privé contredit un texte social, le prompt doit exposer les deux sources et éviter la suggestion contraire aux préférences à éviter. Préserver les contrôles actuels des idées et les filtres locaux.

## Interface et état

Brancher `UniversCadeauxPermissions` dans Mon univers, après les blocs existants, sans publication pendant la saisie. Adapter le garde de brouillon, fingerprint de tentative, relecture et conflits à `iaCadeaux`. Une lecture distante ne remplace jamais un brouillon sale.

Ajouter `etoileId` fermé au parcours cadeaux, avec entrée depuis chaque étoile et son panneau. Dans le sélecteur de destinataire, afficher contacts et étoiles actives dans des groupes distincts ; le contexte social associe uniquement les correspondances actuelles. Une préparation impose son contact : résoudre son étoile associée, sans permettre de choisir un tiers incompatible. Étoile sans fiche : occasion choisie manuellement, relation générique `autre`, pas de reprise de date d'univers.

Monter la sélection sociale séparément de l'AIConsent privé, avec le titre « Mes informations privées sur ce contact » pour ce dernier. Consulter les projections uniquement pour le destinataire ouvert, annuler les lectures dépassées, remonter par compte et vérifier le compte avant/après les requêtes. Relecture au focus/retour visible/60 secondes et après action sociale. Retirer les contenus tiers sur perte d'accès, panne de validation, hors ligne ou page cachée.

Aucune sélection persistante : réinitialiser après chaque tentative, changement de destinataire, changement de révision d'univers/relation/association et changement de compte. Désactiver hors ligne, sérialiser les doubles clics, annuler les fetch à la fermeture ; après réponse perdue, aucune relance automatique. Garder les autres options et saisies. Effacer les résultats issus de la source sociale si l'accès disparaît ; une idée volontairement enregistrée reste un document privé déjà produit.

## Export, confidentialité et limites

L'export est passé à 10 après intégration, avec le propriétaire complet et ses autorisations, sans projection tiers, prompts, journal fournisseur ou journal d'idempotence. Une erreur refuse l'export partiel. La notice et l'explication sont actualisées « Ce qui est envoyé à l'IA » en distinguant les cadeaux des messages. Aucun texte social n'est envoyé au générateur messages.

Une révocation déjà validée avant la nouvelle lecture SQL est prise en compte. SQL et appel HTTP fournisseur ne sont pas une transaction commune : il subsiste une fenêtre entre la dernière lecture et l'envoi. Ne pas prétendre annuler une transmission déjà effectuée, la politique du fournisseur ou les informations déjà vues. La vérification finale écarte un résultat dont la source ou la relation a changé pendant l'appel, mais ne supprime pas les données du prestataire.

Un refus préalable ne consomme pas de quota. Une révocation/panne après consommation peut compter comme tentative, sans remboursement automatique. Aucune nouvelle journalisation persistante de contenus dans 10C ; la conservation du journal existant 10B et la limitation de débit restent des préalables d'ouverture publique.
