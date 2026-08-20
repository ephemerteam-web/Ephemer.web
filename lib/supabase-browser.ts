// ============================================
// 🌐 CLIENT SUPABASE BROWSER (côté navigateur)
// Compatible SSR + TypeScript
// ============================================
'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 🧠 Mémoire : on garde le client créé pour le réutiliser
let client: SupabaseClient | undefined

// ✅ Retourne TOUJOURS le même client valide
export const getSupabaseClient = (): SupabaseClient => {
  if (!client) {
    client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return client
}