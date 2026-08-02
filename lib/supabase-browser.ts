// ============================================
// 🌐 CLIENT SUPABASE BROWSER (côté navigateur)
// À utiliser dans les composants React ('use client')
// ============================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('⚠️ Variables Supabase manquantes dans .env.local')
}

// ⬇ Configuration pour persister la session dans localStorage (et non sessionStorage)
// Cela permet de garder l'utilisateur connecté même après fermeture/réouverture du navigateur
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
