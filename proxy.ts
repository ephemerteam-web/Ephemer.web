import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    } }
  )
  try {
    // Vérification auprès d'Auth : ne pas faire confiance au contenu du cookie.
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      const redirect = NextResponse.redirect(new URL('/connexion', request.url))
      response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie))
      response = redirect
    }
  } catch {
    // Une panne Auth ne doit pas être présentée comme une déconnexion réussie.
    response = new NextResponse('Connexion indisponible. Réessaie dans un instant.', { status: 503 })
  }
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/completer-profil'],
}
