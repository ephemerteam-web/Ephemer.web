// ============================================
// 🌐 CLIENT SUPABASE BROWSER (côté navigateur)
// Compatible SSR (ne crash pas côté serveur)
// ============================================

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('⚠️ Variables Supabase manquantes dans .env.local')
}

// ✅ Solution : Créer le client uniquement côté navigateur
export const supabase = typeof window !== 'undefined'
  ? createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: localStorage,
        storageKey: 'ephemer-auth-token',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null // ✅ Retourne null côté serveur (évite l'erreur)