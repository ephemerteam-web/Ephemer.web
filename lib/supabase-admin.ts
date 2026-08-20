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

// ✅ createBrowserClient + localStorage = compatible PWA
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
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