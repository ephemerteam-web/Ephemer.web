# Polices P3

Fichiers Geist et Geist Mono extraits du build de référence réussi le 4 octobre 2026, alors produit par `next/font/google` dans ce dépôt. Onze fichiers WOFF2, tous les sous-ensembles et graisses variables 100–900 sont conservés sans conversion. Les empreintes SHA-256, noms originaux du build et plages Unicode sont dans `provenance.json` ; `fallback.css` conserve les métriques Google/Next de ce même build.

Sources : [Geist](https://github.com/vercel/geist-font), [distribution Google Geist](https://github.com/google/fonts/tree/main/ofl/geist), [distribution Google Geist Mono](https://github.com/google/fonts/tree/main/ofl/geistmono). Les fichiers `OFL-Geist.txt` et `OFL-Geist-Mono.txt` reproduisent la licence SIL Open Font License 1.1 fournie par ces distributions. La provenance du build identifie les binaires utilisés ; aucun numéro de version non vérifié n’est attribué aux fichiers.

`app/local-fonts.ts` utilise `next/font/local` et conserve `display: swap`, styles normaux, plages Unicode et préchargement des seuls sous-ensembles latins. Les variables CSS `--font-geist-sans` et `--font-geist-mono` restent celles de l’application. Pas de requête Google pendant le build.

Ouvrir `docs/p3-polices-comparaison.html` pour comparer référence et composition locale, puis valider les véritables pages avec `npm run dev`, dans les deux thèmes et aux largeurs mobile/desktop. Aucune validation visuelle n’est présumée à partir des seuls hashes.
