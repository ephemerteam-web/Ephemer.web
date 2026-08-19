// ============================================
// 🌐 CLIENT SUPABASE BROWSER (côté navigateur)
// À utiliser dans les composants React ('use client')
// ============================================

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('⚠️ Variables Supabase manquantes dans .env.local')
}

//  CLÉ DE LA SOLUTION :
// createBrowserClient + localStorage forcé = compatible PWA standalone
// (les cookies sont bloqués en mode "installé" sur iOS/Android)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Force le stockage dans localStorage au lieu des cookies
    storage: localStorage,
    storageKey: 'ephemer-auth-token',
    
    // Persistance de session (indispensable en PWA)
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
