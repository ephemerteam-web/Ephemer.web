// app/api/test-env/route.ts
// Fichier temporaire pour debugger les variables d'env

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    // On affiche juste les premiers caractères (sécurité)
    RESEND_API_KEY: process.env.RESEND_API_KEY?.slice(0, 10) + '***',
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 20) + '***',
    CRON_SECRET: process.env.CRON_SECRET?.slice(0, 10) + '***',
  })
}
