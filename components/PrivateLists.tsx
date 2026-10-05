'use client'
import { useState, useRef, useEffect } from 'react'
import Modal from './Modal'
import { supabase } from '@/lib/supabase-browser'
import { changeMembership, renameList } from '@/lib/private-lists'
import { usePrivateLists } from '@/lib/hooks/usePrivateLists'
import type { Contact } from '@/types/database'

type ListsState = ReturnType<typeof usePrivateLists>
const input = 'min-h-11 w-full rounded-lg border border-line bg-surface p-2 text-ink'
export function ListSelector({ state }: { state: ListsState }) {
  return <label className="block text-sm">Liste
    <select className={input} value={state.selected} onChange={event => state.select(event.target.value)} disabled={state.loading || !!state.error}>
      <option value="">Toutes les listes</option>{state.lists.map(list => <option key={list.id} value={list.id}>{list.nom}</option>)}
    </select>
    {state.error && <span role="alert">{state.error} <button className="min-h-11 underline" onClick={state.retry}>Réessayer</button></span>}
  </label>
}

export function ManageLists({ state, contacts }: { state: ListsState; contacts: Contact[] }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState('')
  const [activeList, setActiveList] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const identity = useRef(state.owner)
  useEffect(() => { identity.current = state.owner }, [state.owner])
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const current = state.lists.find(list => list.id === activeList)
  async function run(action: () => Promise<void>, success: string, after?: () => void) {
    if (busy) return
    const owner = state.owner
    setBusy(true); setError(''); setNotice('')
    try {
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError || data.user?.id !== owner || identity.current !== owner) throw new Error('La session a changé. Recharge la page.')
      await action()
      if (mounted.current && identity.current === owner) {
        if (!await state.retry()) throw new Error('La réponse a été reçue, mais la relecture a échoué. Réessaie pour confirmer l’état enregistré.')
        if (mounted.current && identity.current === owner) { setNotice(success); after?.() }
      }
    } catch (cause) {
      if (mounted.current && identity.current === owner) setError(cause instanceof Error ? cause.message : 'Enregistrement impossible. Vérifie le nom et réessaie ; tes choix ont été conservés.')
    } finally { if (mounted.current && identity.current === owner) setBusy(false) }
  }
  return <>
    <button className="min-h-11 rounded-lg border border-line px-3" onClick={() => setOpen(true)}>Gérer mes listes</button>
    <Modal open={open} onClose={() => { if (!busy) setOpen(false) }} title="Gérer mes listes" className="w-full sm:max-w-xl">
      <div className="flex justify-between gap-3"><h2 className="text-xl font-bold">Mes listes privées</h2><button disabled={busy} className="min-h-11" onClick={() => setOpen(false)}>Fermer</button></div>
      <p>Un contact peut appartenir à plusieurs listes. Aucune information n’est partagée.</p>
      <p className="text-sm text-muted">Exemples : Famille, Amis proches, Collègues.</p>
      <form className="my-3 space-y-2" onSubmit={event => {
        event.preventDefault()
        const old = state.lists.find(list => list.id === editing)
        void run(async () => {
          if (editing && !old) throw new Error('La liste a disparu. Recharge les listes.')
          if (old) await renameList(supabase, state.owner, old, name)
          else { const { error } = await supabase.from('listes_personnelles').insert({ user_id: state.owner, nom: name.trim() }); if (error) throw error }
        }, 'Liste enregistrée.', () => { setName(''); setEditing('') })
      }}>
        <label>{editing ? 'Nouveau nom' : 'Nom de la nouvelle liste'}<input className={input} required maxLength={80} value={name} disabled={busy} onChange={event => setName(event.target.value)} /></label>
        <button className="min-h-11 rounded-lg bg-action px-3 text-on-action" disabled={busy || !name.trim()}>{editing ? 'Renommer' : 'Créer'}</button>
        {editing && <button type="button" className="min-h-11 px-3" disabled={busy} onClick={() => { setEditing(''); setName('') }}>Annuler le renommage</button>}
      </form>
      {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      {state.error && <p role="alert">{state.error}<button onClick={state.retry}>Réessayer</button></p>}
      {state.lists.map(list => <div className="flex flex-wrap items-center gap-2 border-b border-line py-2" key={list.id}>
        <button disabled={busy} className="min-h-11 flex-1 text-left" onClick={() => setActiveList(list.id)} aria-pressed={list.id === activeList}>{list.nom}</button>
        <button disabled={busy} className="min-h-11 underline" onClick={() => { setEditing(list.id); setName(list.nom) }}>Renommer</button>
        <button disabled={busy} className="min-h-11 underline" onClick={() => {
          if (!window.confirm(`Supprimer « ${list.nom} » ? Tous les contacts seront conservés.`)) return
          void run(async () => { const { error } = await supabase.from('listes_personnelles').delete().eq('user_id', state.owner).eq('id', list.id); if (error) throw error }, 'Liste supprimée. Les contacts sont conservés.')
        }}>Supprimer</button>
      </div>)}
      {current && <section className="mt-4"><h3 className="font-bold">Contacts dans {current.nom}</h3>
        <input aria-label="Rechercher un contact à classer" className={input} type="search" value={search} onChange={event => setSearch(event.target.value)} />
        {!contacts.length && <p>Aucun contact. Cette liste peut rester vide.</p>}
        {contacts.filter(contact => `${contact.prenom ?? ''} ${contact.nom ?? ''}`.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr'))).map(contact => <label className="flex min-h-11 items-center gap-2" key={contact.id}>
          <input type="checkbox" disabled={busy || !!state.error} checked={state.memberships.some(row => row.liste_id === current.id && row.contact_id === contact.id)} onChange={event => {
            const checked = event.target.checked
            void run(() => changeMembership(supabase, state.owner, current.id, contact.id, checked), checked ? 'Contact ajouté à la liste.' : 'Contact retiré de la liste.')
          }} />{contact.prenom} {contact.nom}
        </label>)}
      </section>}
    </Modal>
  </>
}
