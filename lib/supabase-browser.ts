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

// Configuration pour éviter les warnings EventEmitter
// Augmente la limite de listeners pour Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
