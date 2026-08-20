// ============================================
// 🌐 CLIENT SUPABASE BROWSER (côté navigateur)
// Compatible SSR + TypeScript
// ============================================

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ✅ Fonction qui retourne TOUJOURS un client valide
export const getSupabaseClient = (): SupabaseClient => {
  // Côté serveur : client minimal (ne sera pas utilisé)
  if (typeof window === 'undefined') {
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  // Côté navigateur : client complet avec localStorage
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
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
}