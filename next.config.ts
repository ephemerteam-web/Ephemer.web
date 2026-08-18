import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Compression automatique des fichiers ───
  compress: true,

  // ─── Optimisation des images ──
  images: {
    formats: ["image/avif", "image/webp"], // Formats modernes, plus légers
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co", // Autorise les images Supabase
      },
    ],
  },

  // ── Headers de sécurité (protection contre les attaques) ───
  async headers() {
    return [
      {
        // Appliqué à TOUTES les pages
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY", // Empêche d'embedder ton site dans une iframe (anti-clickjacking)
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff", // Empêche le navigateur de "deviner" le type de fichier
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin", // Ne partage pas l'URL complète avec les sites externes
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
            // Désactive l'accès à la caméra/micro/géolocalisation par défaut
          },
        ],
      },
      {
        // Appliqué UNIQUEMENT aux fichiers statiques (icônes, images, CSS, JS)
        source: "/(.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|woff2?))",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
            // Mis en cache 1 AN côté navigateur (ces fichiers ne changent jamais)
          },
        ],
      },
      {
        // Appliqué au Service Worker (IMPORTANT : ne jamais le cacher !)
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
            // Le navigateur vérifie à CHAQUE visite s'il y a une nouvelle version
          },
        ],
      },
      {
        // Appliqué au manifeste PWA
        source: "/site.webmanifest",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
            // Mis en cache 24h
          },
        ],
      },
    ];
  },

  // ─── Redirections utiles ───
  async redirects() {
    return [
      {
        source: "/install",
        destination: "/#install",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;