# Mentions de confidentialité à compléter

Version technique : 4 octobre 2026. Ce document n’est pas une validation juridique.

La publication des mentions complètes dépend de la confirmation par l’exploitant :

- Identité publique et coordonnées de l’exploitant.
- Une adresse de contact réellement suivie, commune aux CGU, à la confidentialité et à l’aide. Le dépôt référence actuellement deux adresses ; aucune n’a été vérifiée.
- Durées réelles des logs Next/Vercel, Supabase, Resend et du fournisseur IA, et règles d’effacement.
- Durées, rotation et modalités d’effacement des sauvegardes selon les offres effectivement utilisées.
- Conservation du journal email futur après validation de son déploiement.

Faits techniques établis : les brouillons contacts restent en mémoire du dashboard et sont effacés à sa fermeture/recharge ou au changement de compte. Les brouillons d’invitation sont locaux ; ils expirent sept jours après la dernière modification et sont purgés lors d’une utilisation ultérieure du site. La lecture seule ne prolonge pas cette durée. Aucun carnet de contacts n’est stocké dans le cache du worker.

Ne pas publier de durée inventée ou de contact présenté comme vérifié. La durée dépend de la finalité et de la configuration réellement appliquée : [guide CNIL](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees).
