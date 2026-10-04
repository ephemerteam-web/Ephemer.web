// ============================================
// 🌐 CLIENT SUPABASE BROWSER (côté navigateur)
// À utiliser dans les composants React ('use client')
// ============================================

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.generated'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('⚠️ Variables Supabase manquantes dans .env.local')
}

// Configuration pour éviter les warnings EventEmitter
// Augmente la limite de listeners pour Supabase
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
