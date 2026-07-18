/**
 * 🎁 CONFIGURATION CADEAUX - Ephemer.name
 * 
 * Ce fichier centralise les marchands e-commerce et les catégories
 * de cadeaux. Modifier ici suffit pour changer toute l'application.
 */

// ============================================
// 🎯 CATÉGORIES DE CADEAUX
// ============================================
export type CategorieCadeau =
  | "loisir"
  | "bien_etre"
  | "tech"
  | "decoration"
  | "gourmand";

export const CATEGORIES_CADEAU: Array<{
  id: CategorieCadeau;
  nom: string;
  emoji: string;
  description: string;
}> = [
  {
    id: "loisir",
    nom: "Loisirs & Passions",
    emoji: "🎮",
    description: "Pour les passionné·e·s",
  },
  {
    id: "bien_etre",
    nom: "Bien-être",
    emoji: "🧘",
    description: "Détente et santé",
  },
  {
    id: "tech",
    nom: "Tech & Gadgets",
    emoji: "📱",
    description: "High-tech et innovation",
  },
  {
    id: "decoration",
    nom: "Décoration",
    emoji: "🏠",
    description: "Pour embellir le quotidien",
  },
  {
    id: "gourmand",
    nom: "Gourmandise",
    emoji: "🍫",
    description: "Friandises et saveurs",
  },
];

// ============================================
// 🛒 MARCHANDS E-COMMERCE
// ============================================

type Marchand = {
  id: string;
  nom: string;
  emoji: string;
  url: (recherche: string) => string;
  couleur: string; // classe Tailwind
  categories: CategorieCadeau[];
};

const tagAmazon = process.env.NEXT_PUBLIC_AMAZON_TAG ?? "";

// ▶️ Amazon France
const amazonFrance: Marchand = {
  id: "amazon",
  nom: "Amazon",
  emoji: "📦",
  url: (recherche: string) => {
    const query = encodeURIComponent(recherche);
    return tagAmazon
      ? `https://www.amazon.fr/s?k=${query}&tag=${tagAmazon}`
      : `https://www.amazon.fr/s?k=${query}`;
  },
  couleur: "bg-[#FF9900] hover:bg-[#e68a00] text-black",
  categories: ["loisir", "bien_etre", "tech", "decoration", "gourmand"],
};

// ▶️ Cdiscount
const cdiscount: Marchand = {
  id: "cdiscount",
  nom: "Cdiscount",
  emoji: "🛒",
  url: (recherche: string) => {
    const query = encodeURIComponent(recherche);
    return `https://www.cdiscount.com/search/1/${query}.html`;
  },
  couleur: "bg-[#004A9F] hover:bg-[#003580] text-white",
  categories: ["loisir", "tech", "decoration"],
};

// ▶️Fnac
const fnac: Marchand = {
  id: "fnac",
  nom: "Fnac",
  emoji: "🎧",
  url: (recherche: string) => {
    const query = encodeURIComponent(recherche);
    return `https://www.fnac.com/SearchResults/taball/${query}`;
  },
  couleur: "bg-[#E30613] hover:bg-[#c80510] text-white",
  categories: ["loisir", "tech"],
};

// ▶️ Cultura
const cultura: Marchand = {
  id: "cultura",
  nom: "Cultura",
  emoji: "📚",
  url: (recherche: string) => {
    const query = encodeURIComponent(recherche);
    return `https://www.cultura.com/recherche/${query}`;
  },
  couleur: "bg-[#E5007D] hover:bg-[#c5006a] text-white",
  categories: ["loisir", "decoration"],
};

// ▶️ Marionnaud
const marionnaud: Marchand = {
  id: "marionnaud",
  nom: "Marionnaud",
  emoji: "💄",
  url: (recherche: string) => {
    const query = encodeURIComponent(recherche);
    return `https://www.marionnaud.fr/search?query=${query}`;
  },
  couleur: "bg-[#D4006D] hover:bg-[#b5005d] text-white",
  categories: ["bien_etre"],
};

// ▶️ Sephora
const sephora: Marchand = {
  id: "sephora",
  nom: "Sephora",
  emoji: "✨",
  url: (recherche: string) => {
    const query = encodeURIComponent(recherche);
    return `https://www.sephora.fr/search?q=${query}`;
  },
  couleur: "bg-black hover:bg-gray-900 text-white",
  categories: ["bien_etre"],
};

// ▶️ Boulanger
const boulanger: Marchand = {
  id: "boulanger",
  nom: "Boulanger",
  emoji: "🔌",
  url: (recherche: string) => {
    const query = encodeURIComponent(recherche);
    return `https://www.boulanger.fr/${query}`;
  },
  couleur: "bg-[#E2001A] hover:bg-[#c50017] text-white",
  categories: ["tech"],
};

// ▶️ La Redoute
const laRedoute: Marchand = {
  id: "laredoute",
  nom: "La Redoute",
  emoji: "🛋️",
  url: (recherche: string) => {
    const query = encodeURIComponent(recherche);
    return `https://www.laredoute.fr/pge/find?q=${query}`;
  },
  couleur: "bg-[#9E1B32] hover:bg-[#861728] text-white",
  categories: ["decoration", "bien_etre"],
};

// ▶️ Maisons du Monde
const maisonsDuMonde: Marchand = {
  id: "maisonsdumonde",
  nom: "Maisons du Monde",
  emoji: "🌿",
  url: (recherche: string) => {
    const query = encodeURIComponent(recherche);
    return `https://www.maisonsdumonde.com/FR/fr/search?q=${query}`;
  },
  couleur: "bg-[#6B8E23] hover:bg-[#5a7820] text-white",
  categories: ["decoration"],
};

// ▶️ Comptoir de l'Imaginaire
const comptoirImaginaire: Marchand = {
  id: "comptoirdelimaginaire",
  nom: "Comptoir de l'Imaginaire",
  emoji: "🌙",
  url: (recherche: string) => {
    const query = encodeURIComponent(recherche);
    return `https://www.comptoirdelimaginaire.fr/recherche?q=${query}`;
  },
  couleur: "bg-[#2D1B69] hover:bg-[#251759] text-white",
  categories: ["loisir"],
};

// ============================================
// 📋 TABLEAU GLOBAL DES MARCHANDS
// ============================================
export const MARCHANDS = [
  amazonFrance,
  cdiscount,
  fnac,
  cultura,
  marionnaud,
  sephora,
  boulanger,
  laRedoute,
  maisonsDuMonde,
  comptoirImaginaire,
];

// ============================================
// 🔍 FONCTIONS UTILITAIRES
// ============================================

/**
 * Retourne la liste des marchands disponibles pour une catégorie donnée.
 * Si aucune catégorie, retourne tous les marchands.
 */
export function marchandsPourCategorie(
  categorie?: CategorieCadeau
): Marchand[] {
  if (!categorie) return MARCHANDS;
  return MARCHANDS.filter((m) => m.categories.includes(categorie));
}

/**
 * Retourne la configuration d'une catégorie par son ID.
 */
export function getCategorieById(
  id: CategorieCadeau
): (typeof CATEGORIES_CADEAU)[number] | undefined {
  return CATEGORIES_CADEAU.find((c) => c.id === id);
}