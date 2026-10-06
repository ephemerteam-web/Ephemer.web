'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Modal from './Modal'

export type ContactDraft = { id: string; prenom: string; nom?: string; email?: string; telephone_indicatif?: string; telephone_numero?: string; date_naissance?: string; relation?: string; note?: string }
type DraftContext = {
  contacts: ContactDraft[]; setContacts: Dispatch<SetStateAction<ContactDraft[]>>
  prenom: string; setPrenom: Dispatch<SetStateAction<string>>; clear: () => void
  confirm: (message: string) => Promise<boolean>; navigate: (path: string, action?: () => void) => Promise<void>
  registerPrivateDraft: (id: string, dirty: boolean) => void
  hasPrivateDraft: () => boolean
}
const Context = createContext<DraftContext | null>(null)
export const useContactDraft = () => { const value = useContext(Context); if (!value) throw new Error('Brouillon hors du layout connecté'); return value }

export default function ContactDraftProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<ContactDraft[]>([])
  const [prenom, setPrenom] = useState('')
  const [question, setQuestion] = useState<string | null>(null)
  const resolver = useRef<((answer: boolean) => void) | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const dirty = contacts.length > 0 || Boolean(prenom.trim())
  const privateDrafts = useRef(new Set<string>())
  const registerPrivateDraft = useCallback((id: string, isDirty: boolean) => { if (isDirty) privateDrafts.current.add(id); else privateDrafts.current.delete(id) }, [])
  const hasPrivateDraft = useCallback(() => privateDrafts.current.size > 0, [])
  useEffect(() => () => { resolver.current?.(false) }, [])
  const clear = useCallback(() => { setContacts([]); setPrenom('') }, [])
  const confirm = useCallback((message: string) => new Promise<boolean>(resolve => {
    resolver.current?.(false); resolver.current = resolve; setQuestion(message)
  }), [])
  const answer = (value: boolean) => { resolver.current?.(value); resolver.current = null; setQuestion(null) }
  const navigate = useCallback(async (path: string, action?: () => void) => {
    if (privateDrafts.current.size && !await confirm('Quitter sans enregistrer les modifications de tes attentions ?')) return
    if (dirty && pathname === '/dashboard/contacts/nouveau' &&
      !await confirm('Quitter la saisie ? Ton brouillon reste disponible pendant cette session.')) return
    action?.(); router.push(path)
  }, [confirm, dirty, pathname, router])
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    const click = (event: MouseEvent) => {
      if ((!privateDrafts.current.size && (!dirty || pathname !== '/dashboard/contacts/nouveau')) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element)?.closest<HTMLAnchorElement>('a[href]')
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return
      const url = new URL(link.href)
      if (url.origin !== location.origin || url.pathname === pathname) return
      event.preventDefault(); event.stopPropagation()
      void navigate(url.pathname + url.search + url.hash)
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', click, true)
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', click, true) }
  }, [dirty, pathname, navigate])
  return <Context.Provider value={{ contacts, setContacts, prenom, setPrenom, clear, confirm, navigate, registerPrivateDraft, hasPrivateDraft }}>
    {children}
    <Modal open={question !== null} onClose={() => answer(false)} title="Confirmer mon choix" className="w-[min(95vw,32rem)]">
      <p className="mb-5 whitespace-pre-line">{question}</p>
      <div className="flex gap-3"><button data-initial-focus onClick={() => answer(false)} className="p-3 rounded-xl border border-line">Annuler</button>
        <button onClick={() => answer(true)} className="p-3 rounded-xl bg-action text-on-action">Confirmer</button></div>
    </Modal>
  </Context.Provider>
}
