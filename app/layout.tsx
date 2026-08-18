import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ─── Meta tags classiques (SEO + réseaux sociaux) ───
export const metadata: Metadata = {
  title: "Ephemer — Ne rate plus aucune date importante",
  description:
    "Gérez vos anniversaires, fêtes et événements avec style. Ephemer vous rappelle les dates importantes et génère des messages personnalisés.",
  keywords: [
    "anniversaire",
    "rappel",
    "éphéméride",
    "fêtes",
    "saints",
    "messages",
    "cadeaux",
  ],
  authors: [{ name: "Ephemer Team", url: "https://ephemer.name" }],
  creator: "Ephemer",
  publisher: "Ephemer",
  formatDetection: {
    telephone: false, // Évite que Safari transforme les numéros en liens
  },
  appleWebApp: {
    capable: true,
    title: "Ephemer",
    statusBarStyle: "black-translucent", // Barre de statut transparente sur iOS
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#C8A84E", // Couleur de l'icône dans les onglets Safari
      },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Ephemer — Ne rate plus aucune date importante",
    description:
      "Gérez vos anniversaires, fêtes et événements avec style.",
    url: "https://ephemer.name",
    siteName: "Ephemer",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ephemer — Ne rate plus aucune date importante",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ephemer",
    description: "Ne rate plus aucune date importante",
    images: ["/og-image.png"],
  },
};

// ─── Viewport (remplace les <meta name="viewport">) ───
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Empêche le zoom accidentel sur mobile (UX app native)
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0B1120" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1120" },
  ],
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* ── iOS : plein écran sans barre Safari ─── */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Ephemer" />

        {/* ─── Android : couleur de la barre de statut ─── */}
        <meta name="theme-color" content="#0B1120" />
        <meta name="msapplication-TileColor" content="#0B1120" />

        {/* ─── PWA : lien vers le manifeste ─── */}
        <link rel="manifest" href="/site.webmanifest" />

        {/* ─── Icône Safari (onglet épinglé) ─── */}
        <link
          rel="mask-icon"
          href="/safari-pinned-tab.svg"
          color="#C8A84E"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#0B1120] text-white">
        {children}
      </body>
    </html>
  );
}