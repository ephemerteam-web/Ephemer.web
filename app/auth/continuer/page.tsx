'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { authPage, browserAuthReturn } from '@/lib/auth-return'
import { continueAfterAuth } from '@/lib/invitation-data'
export default function ContinuerConnexion() {
  const router = useRouter(), [error, setError] = useState(''), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    const go = async () => {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (!alive) return
        if (error || !data.user) { router.replace(authPage('/connexion', browserAuthReturn())); return }
        const target = await continueAfterAuth(data.user.id, browserAuthReturn())
        if (alive) router.replace(target)
      } catch (failure) { if (alive) setError(failure instanceof Error ? failure.message : 'Connexion indisponible. Réessaie.') }
    }
    void go()
    return () => { alive = false }
  }, [router, attempt])
  return <main className="mx-auto max-w-lg space-y-4 p-8 text-ink">{error ? <><p role="alert">{error}</p><button className="min-h-11 underline" onClick={() => { setError(''); setAttempt(value => value + 1) }}>Réessayer</button></> : <p role="status">Nous retrouvons ton profil et ton invitation…</p>}</main>
}
