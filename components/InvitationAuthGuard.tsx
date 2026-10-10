'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { bindEtoileContext, clearEtoileContext } from '@/lib/etoile-context'
export default function InvitationAuthGuard() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      try {
        if (event === 'SIGNED_OUT') clearEtoileContext(sessionStorage)
        else if (session?.user.id) bindEtoileContext(sessionStorage, session.user.id)
      } catch { /* Un stockage interdit n'empêche pas la connexion. */ }
    })
    return () => subscription.unsubscribe()
  }, [])
  return null
}
