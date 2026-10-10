import { authReturn } from '@/lib/auth-return'
import type { Database } from '@/types/database.generated'
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = authReturn(url.searchParams.get("next"))

  try {
  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          }
        }
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next === "/reset-password" ? next : "/auth/continuer?" + new URLSearchParams({ next }), request.url), {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    }
  }

  } catch { /* Le lien peut être réessayé sans afficher de détail technique. */ }
  return NextResponse.redirect(new URL("/connexion?" + new URLSearchParams({ auth_error: "1", next }), request.url), {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
