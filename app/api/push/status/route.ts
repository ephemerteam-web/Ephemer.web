import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { pushReady } from '@/lib/daily-push'

export async function GET(request: Request) {
  const header = request.headers.get('authorization')
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' }
  if (!header?.startsWith('Bearer ') || header.length > 16384) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers })
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(header.slice(7))
    if (error || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers })
    return NextResponse.json({ ready: await pushReady() }, { headers })
  } catch {
    return NextResponse.json({ error: 'Vérification indisponible' }, { status: 503, headers })
  }
}
