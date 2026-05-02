/**
 * 📦 CONSTANTES GLOBALES - Ephemer.name
 * 
 * Ce fichier centralise toutes les données réutilisables :
 * - Enums (listes de valeurs autorisées)
 * - Configurations
 * - Messages UI
 * 
 * RÈGLE : si tu dois dupliquer une valeur dans 2+ fichiers → mets-la ici !
 */

// ============================================
// 🌍 INDICATIFS TÉLÉPHONIQUES
// ============================================
export const INDICATIFS_PAYS = [
  { code: '+33', pays: '🇫🇷 France' },
  { code: '+32', pays: '🇧🇪 Belgique' },
  { code: '+41', pays: '🇨🇭 Suisse' },
  { code: '+1',  pays: '🇺🇸 USA / 🇨🇦 Canada' },
  { code: '+44', pays: '🇬🇧 Royaume-Uni' },
  { code: '+34', pays: '🇪🇸 Espagne' },
  { code: '+39', pays: '🇮🇹 Italie' },
  { code: '+49', pays: '🇩🇪 Allemagne' },
  { code: '+212', pays: '🇲🇦 Maroc' },
  { code: '+213', pays: '🇩🇿 Algérie' },
  { code: '+216', pays: '🇹🇳 Tunisie' },
] as const

// ============================================
// 👥 TYPES DE RELATIONS
// ============================================
export const TYPES_RELATION = [
  { value: 'ami', emoji: '👫', label: 'Ami(e)', couleur: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' },
  { value: 'famille', emoji: '👨‍👩‍👧', label: 'Famille', couleur: 'bg-pink-500/20 text-pink-300 border border-pink-500/30' },
  { value: 'pro', emoji: '💼', label: 'Professionnel', couleur: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
  { value: 'autre', emoji: '✨', label: 'Autre', couleur: 'bg-white/10 text-indigo-200 border border-white/20' },
] as const

// ============================================
// 📅 TYPES D'ÉVÉNEMENTS
// ============================================
export const TYPES_EVENEMENT = [
  { value: 'anniversaire', label: '🎂 Anniversaire' },
  { value: 'fete_prenomale', label: '📖 Fête prénomale' },
  { value: 'jour_special', label: '⭐ Jour spécial (ex: date de rencontre)' },
  { value: 'mariage', label: '💍 Mariage' },
  { value: 'naissance', label: '👶 Naissance' },
  { value: 'autre', label: '🎉 Autre' },
] as const

// ============================================
// 🔔 TYPES DE RAPPELS
// ============================================
export const TYPES_RAPPEL = [
  { value: 'j30', label: 'J-30 (1 mois avant)' },
  { value: 'j7', label: 'J-7 (1 semaine avant)' },
  { value: 'jourj', label: 'Jour J (le jour même)' },
] as const

// ============================================
// 📤 DESTINATAIRES DE RAPPELS
// ============================================
export const DESTINATAIRES_RAPPEL = [
  { value: 'moi', label: '📱 Me rappeler seulement' },
  { value: 'contact', label: '✉️ Envoyer au contact' },
  { value: 'les_deux', label: '📮 Me rappeler ET envoyer au contact' },
] as const

// ============================================
// 💬 TONS DE MESSAGES (pour générateur IA)
// ============================================
export const TONS_MESSAGE = [
  { value: 'formel', label: '🎩 Formel / Professionnel' },
  { value: 'familier', label: '😊 Familier / Chaleureux' },
  { value: 'humoristique', label: '😂 Humoristique / Blagueur' },
  { value: 'poetique', label: '✨ Poétique / Romantique' },
] as const

// ============================================
// ✅ STATUTS DE RAPPELS
// ============================================
export const STATUTS_RAPPEL = [
  { value: 'programme', label: '⏳ Programmé', color: 'bg-blue-500' },
  { value: 'envoye', label: '✅ Envoyé', color: 'bg-green-500' },
  { value: 'annule', label: '❌ Annulé', color: 'bg-red-500' },
] as const

// ============================================
// 📊 QUOTAS / LIMITES (plan gratuit)
// ============================================
export const QUOTAS_GRATUIT = {
  max_contacts: 50,
  max_rappels_par_mois: 100,
  max_generateurs_par_jour: 10,
  delai_min_entre_rappels_secondes: 3600, // 1 heure minimum entre 2 rappels du même contact
} as const

// ============================================
// 💬 MESSAGES / LABELS UI
// ============================================
export const MESSAGES_UI = {
  // Erreurs génériques
  erreur_genérique: 'Une erreur est survenue. Réessaie !',
  erreur_authentification: 'Tu dois être connecté pour faire ça.',
  erreur_acces_refuse: 'Tu n\'as pas accès à cette ressource.',
  erreur_champ_requis: 'Ce champ est obligatoire.',

  // Succès
  succes_contact_cree: '✅ Contact créé avec succès !',
  succes_contact_modifie: '✅ Contact modifié avec succès !',
  succes_contact_supprime: '✅ Contact supprimé.',
  succes_rappel_envoye: '✅ Rappel créé. Tu seras notifié !',

  // Actions
  confirmer_suppression: '⚠️ Action irréversible. Confirmer ?',
  oui_supprimer: 'Oui, supprimer',
  annuler: 'Annuler',

  // Placeholders
  placeholder_email: 'exemple@email.com',
  placeholder_telephone: '612345678',
  placeholder_note: 'Ex : aime le foot, fan de cuisine italienne, vit à Paris, deux enfants...',

  // Infos
  info_telephone: 'Sans le 0 du début (ex : 612345678 pour 06 12 34 56 78)',
  info_note: '💡 Plus tu en mets, plus les suggestions de cadeaux seront pertinentes.',
  info_favori: 'Apparaîtra en priorité',
} as const

// ============================================
// 🌐 URLS / ENDPOINTS (utile plus tard)
// ============================================
export const CONFIG = {
  API_RESEND: 'https://api.resend.com', // pour envoyer les emails
  API_OPENAI: 'https://api.openai.com/v1', // pour le générateur IA (si tu utilises)
  URL_SUPABASE: process.env.NEXT_PUBLIC_SUPABASE_URL,
} as const

// ============================================
// 🎨 COULEURS / THÈME (optionnel - si tu veux centraliser)
// ============================================
export const COULEURS = {
  primary: '#4f46e5', // indigo-600
  primaryLight: '#6366f1', // indigo-500
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
} as const
