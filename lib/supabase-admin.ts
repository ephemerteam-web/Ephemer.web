// ============================================
// 🖥️ CLIENT SUPABASE ADMIN (côté SERVEUR uniquement)
// À utiliser dans les API routes, cron jobs, etc.
// NE JAMAIS l'utiliser dans des composants React ('use client')
// ============================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY  // 🔑 Clé admin (SECRET)

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('⚠️ Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY')
}

// ✅ Client avec tous les droits (pour le backend)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,  // Pas besoin en serveur
    persistSession: false,
  },
})