# .codexignore — fichiers que Codex CLI NE DOIT PAS lire / traiter
# But : réduire le bruit, exclure les binaires, garder le contexte focalisé sur le code source utile.

# ─────────────────────────────
# 🔒 Secrets & environnement
# ─────────────────────────────
.env
.env.local
.env.*.local
.env.development
.env.production
.env.test
.env.example

# ─────────────────────────────
# 📦 Dépendances & builds
# ─────────────────────────────
node_modules/
.pnp
.pnp.*
.yarn/*
.pnpm-debug.log*

# Next.js
.next/
out/
build/
next-env.d.ts
.tsbuildinfo

# Vercel
.vercel/

# Couverture de tests
coverage/

# Fichiers de log
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# ─────────────────────────────
# 🖼️ Assets binaires / images
# ─────────────────────────────
# Logos / icônes par défaut Next.js (non utilisés en prod mais lourds à scanner)
public/next.svg
public/vercel.svg
public/file.svg
public/globe.svg
public/window.svg

# Si à l'avenir le projet ajoute de vrais assets binaires (favicon, photos…)
# (décommenter / adapter selon les fichiers réellement présents)
# public/favicon.ico
# public/icon-192.png
# public/icon-512.png
# public/apple-touch-icon.png
# public/safari-pinned-tab.svg
# public/*.png
# public/*.jpg
# public/*.jpeg
# public/*.webp
# public/*.avif
# public/*.gif
# public/*.ico

# ─────────────────────────────
# 🗃️ Fichiers lourds repérés dans le repomix (TOP 10 par taille brute)
# À NE PAS charger en entier si Codex cible un fichier précis.
# (Listés ici pour mémoire ; les chemins ci-dessous sont déjà exclus via les
#  patterns *.tsx, donc ce bloc est principalement documentaire.)
# ─────────────────────────────
# ~36 KB   app/invitation/[token]/FormulaireInvitation.tsx
# ~34 KB   lib/saints.ts
# ~31 KB   app/dashboard/contacts/nouveau/page.tsx
# ~30 KB   app/dashboard/gift-ideas/page.tsx
# ~29 KB   app/dashboard/generate/page.tsx
# ~29 KB   lib/email-templates.ts
# ~28 KB   app/dashboard/calendrier/page.tsx
# ~28 KB   app/dashboard/messages-programmes/page.tsx
# ~26 KB   app/dashboard/page.tsx
# ~26 KB   app/guide-notifications/page.tsx
# (→ les charger avec `offset/limit` ou via ciblage explicite si nécessaire)

# ─────────────────────────────
# 📝 Lockfiles (taille inutile pour le contexte)
# ─────────────────────────────
package-lock.json
pnpm-lock.yaml
yarn.lock
bun.lockb

# ─────────────────────────────
# 🍎 Fichiers OS / éditeurs
# ─────────────────────────────
.DS_Store
Thumbs.db
.idea/
.vscode/
*.swp
*.swo
*~