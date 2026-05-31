// ============================================
// 🔐 CLIENT SUPABASE ADMIN (côté serveur uniquement)
// ⚠️ NE JAMAIS importer dans un composant client !
// À utiliser UNIQUEMENT dans les API routes (app/api/...)
// Contourne RLS — pouvoirs admin
// ============================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('⚠️ Variables Supabase Admin manquantes dans .env.local')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
