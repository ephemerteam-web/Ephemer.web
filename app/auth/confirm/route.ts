import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database.generated'
import { authReturn } from '@/lib/auth-return'
// Le hash à usage unique permet de confirmer depuis un autre appareil, sans verifier PKCE local.
export async function GET(request: Request) {
  const url = new URL(request.url), next = authReturn(url.searchParams.get('next'))
  const hash = url.searchParams.get('token_hash'), kind = url.searchParams.get('type')
  try {
  if (hash && hash.length <= 512 && kind === 'email') {
    const jar = await cookies()
    const client = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { getAll: () => jar.getAll(), setAll: values => values.forEach(({ name, value, options }) => jar.set(name, value, options)) }
    })
    const { error } = await client.auth.verifyOtp({ token_hash: hash, type: 'email' })
    if (!error) return NextResponse.redirect(new URL('/auth/continuer?' + new URLSearchParams({ next }), url.origin), { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } })
  }
  } catch { /* Connexion indisponible : revenir à un écran permettant un réessai. */ }
  // Les confirmations anciennes avec code continuent d'utiliser le callback PKCE.
  if (url.searchParams.has('code')) return NextResponse.redirect(new URL('/auth/callback?' + new URLSearchParams({ code: url.searchParams.get('code')!, next }), url.origin), { headers: { 'Cache-Control': 'private, no-store' } })
  return NextResponse.redirect(new URL('/connexion?' + new URLSearchParams({ auth_error: '1', next }), url.origin), { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } })
}
