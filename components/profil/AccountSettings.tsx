'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/Modal'
import { supabase } from '@/lib/supabase-browser'
export default function AccountSettings({ owner, email }: { owner:string; email:string }) {
  const router=useRouter(),alive=useRef(false),lock=useRef(false)
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[confirm,setConfirm]=useState(false)
  useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[owner])
  async function run(remove:boolean) {
    if(lock.current)return
    lock.current=true;setBusy(true);setNotice('');setError('')
    try {
      const check=await supabase.auth.getUser()
      if(check.error||check.data.user?.id!==owner)throw new Error('La session a changé. Reconnecte-toi.')
      if(remove) {
        const {data}=await supabase.auth.getSession()
        if(data.session?.user.id!==owner)throw new Error('Session indisponible. Reconnecte-toi.')
        const response=await fetch('/api/delete-account',{method:'DELETE',headers:{Authorization:'Bearer '+data.session.access_token}})
        const result=await response.json()
        if(!response.ok||result.success!==true)throw new Error(typeof result.error==='string'?result.error:'Suppression indisponible. Réessaie.')
        const current=await supabase.auth.getUser()
        if(!alive.current||current.error||current.data.user?.id!==owner)return
        await supabase.auth.signOut();router.replace('/?deleted=true')
      } else {
        const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/auth/callback?next=/reset-password'})
        if(error)throw new Error('Envoi indisponible. Réessaie.')
        if(alive.current)setNotice('Un e-mail de réinitialisation a été envoyé. Vérifie ta boîte mail.')
      }
    } catch(cause){if(alive.current)setError(cause instanceof Error?cause.message:'Action indisponible.')}
    finally{lock.current=false;if(alive.current)setBusy(false)}
  }
  return <section className="space-y-4 rounded-3xl border border-line bg-surface p-5 sm:p-6"><h2 className="text-xl font-semibold">Mon compte</h2>
    <button type="button" disabled={busy} className="min-h-11 rounded-xl border border-line px-4 py-3 text-accent disabled:opacity-50" onClick={()=>void run(false)}>Modifier mon mot de passe</button>
    <button type="button" disabled={busy} className="ml-3 min-h-11 rounded-xl border border-line px-4 py-3 text-danger disabled:opacity-50" onClick={()=>setConfirm(true)}>Supprimer mon compte</button>
    {notice&&<p role="status" className="text-sm">{notice}</p>}{error&&<p role="alert" className="text-sm text-danger">{error}</p>}
    <Modal open={confirm} title="Supprimer mon compte" onClose={()=>{if(!busy)setConfirm(false)}} className="w-[min(95vw,32rem)]"><p className="mb-5">Ton compte et tes données seront supprimés définitivement. Cette action est irréversible.</p><div className="flex gap-3"><button type="button" disabled={busy} onClick={()=>setConfirm(false)} className="min-h-11 rounded-xl border border-line px-4">Annuler</button><button type="button" disabled={busy} onClick={()=>void run(true)} className="min-h-11 rounded-xl bg-action px-4 text-on-action">{busy?'Suppression…':'Oui, supprimer'}</button></div></Modal>
  </section>
}
