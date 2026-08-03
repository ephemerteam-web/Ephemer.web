// Les "bulles" de centres d'intérêt proposées au contact.
// Elles alimenteront plus tard les recommandations de cadeaux.
// Tu peux en ajouter/retirer librement : le formulaire s'adapte.

export type GroupeInterets = {
  titre: string
  emoji: string
  items: string[]
}

export const GROUPES_INTERETS: GroupeInterets[] = [
  {
    titre: 'Gourmandises',
    emoji: '🍫',
    items: ['Chocolat', 'Pâtisserie', 'Vin', 'Café', 'Thé', 'Fromage', 'Épices', 'Bières'],
  },
  {
    titre: 'Culture',
    emoji: '📚',
    items: ['Romans', 'BD & Manga', 'Cinéma', 'Séries', 'Musique', 'Théâtre', 'Podcasts', 'Musées'],
  },
  {
    titre: 'Bien-être',
    emoji: '🌿',
    items: ['Bougies', 'Parfums', 'Spa & massage', 'Yoga', 'Cosmétiques', 'Méditation'],
  },
  {
    titre: 'Mouvement',
    emoji: '⚡',
    items: ['Running', 'Vélo', 'Randonnée', 'Fitness', 'Natation', 'Danse', 'Ski', 'Football'],
  },
  {
    titre: 'Créatif',
    emoji: '🎨',
    items: ['Dessin', 'Photo', 'Couture', 'Bricolage', 'Jardinage', 'Cuisine', 'Poterie', 'Écriture'],
  },
  {
    titre: 'Évasion',
    emoji: '✈️',
    items: ['Voyages', 'Camping', 'Plage', 'Montagne', 'City-break', 'Road-trip'],
  },
  {
    titre: 'Tech & Jeux',
    emoji: '🎮',
    items: ['Jeux vidéo', 'Jeux de société', 'Gadgets', 'High-tech', 'Puzzles', 'Lego'],
  },
]

// Indicatifs téléphoniques les plus courants (liste courte volontairement)
export const INDICATIFS = [
  { code: '+33', pays: '🇫🇷 France' },
  { code: '+32', pays: '🇧🇪 Belgique' },
  { code: '+41', pays: '🇨🇭 Suisse' },
  { code: '+352', pays: '🇱🇺 Luxembourg' },
  { code: '+1', pays: '🇨🇦 Canada / 🇺🇸 USA' },
  { code: '+212', pays: '🇲🇦 Maroc' },
  { code: '+216', pays: '🇹🇳 Tunisie' },
  { code: '+213', pays: '🇩🇿 Algérie' },
  { code: '+44', pays: '🇬🇧 Royaume-Uni' },
  { code: '+49', pays: '🇩🇪 Allemagne' },
  { code: '+34', pays: '🇪🇸 Espagne' },
  { code: '+39', pays: '🇮🇹 Italie' },
]