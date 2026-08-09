// ============================================
// 📋 TYPES DE LA BASE DE DONNÉES EPHEMER
// Aligné sur le schéma Supabase réel
// ============================================

// 👤 Table "profiles"
export type Profile = {
  id: string                          // UUID (lié à auth.users)
  created_at: string
  prenom: string | null
  nom: string | null
  date_naissance: string | null       // format "YYYY-MM-DD"
  email: string | null
  telephone_indicatif: string | null
  telephone_numero: string | null
}

// 👥 Table "contacts"
export type Contact = {
  id: number                          // ⚠️ bigint = number en TS
  created_at: string
  user_id: string | null
  prenom: string | null
  nom: string | null
  date_naissance: string | null
  relation: string | null             // texte libre (famille, amis, pro...)
  email: string | null
  est_favori: boolean
  telephone_indicatif: string | null
  telephone_numero: string | null
  note: string | null
}

// 🔔 Table "notifications"
export type Notification = {
  id: string                          // UUID
  user_id: string
  contact_id: number
  type: string
  message: string
  lue: boolean
  event_date: string | null           // 👈 MODIFIÉ : peut être null (invitations)
  created_at: string
  event_description: string | null
  jours_restants: number | null       // 👈 NOUVEAU
}

// 📬 Table "rappels"
export type Rappel = {
  id: number
  created_at: string
  user_id: string
  contact_id: number
  date_envoi: string
  type_rappel: 'j30' | 'j7' | 'jourj'
  destinataire: 'moi' | 'contact' | 'les_deux'
  message: string
  sujet_email: string
  email_destinataire: string | null
  statut: 'programme' | 'envoye' | 'annule'
  sent_at: string | null
  type_evenement: string
  source: string | null
  ton: string | null
  event_date: string | null
  event_description: string | null
}

// 📝 Table "patch_notes"
export type PatchNote = {
  id: string
  created_at: string
  version: string
  title: string
  changes: string[]                   // ARRAY en SQL = string[] en TS
  release_date: string
  is_major: boolean
}
