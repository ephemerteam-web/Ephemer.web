'use client'
import { useCallback, useEffect, useState, useRef } from 'react'
import { useDashboardUser } from '@/components/DashboardUserContext'
import { supabase } from '../supabase-browser'
import { readPrivateLists, contactsInList, type PrivateList, type Membership } from '../private-lists'
import type { Contact } from '@/types/database'

export function usePrivateLists() {
  const { id } = useDashboardUser()
  const [state, setState] = useState<{ owner: string; lists: PrivateList[]; memberships: Membership[]; error: string } | null>(null)
  const [selected, setSelected] = useState('')
  const epoch = useRef({ value: 0 })
  const retry = useCallback(async () => {
    const request = ++epoch.current.value
    try {
      const data = await readPrivateLists(supabase, id)
      if (request !== epoch.current.value) return false
      setState({ owner: id, ...data, error: '' })
      return true
    } catch {
      if (request === epoch.current.value) setState({ owner: id, lists: [], memberships: [], error: 'Impossible de charger toutes les listes et leurs contacts.' })
      return false
    }
  }, [id])
  useEffect(() => {
    let active = true
    const counter = epoch.current
    void Promise.resolve().then(() => { if (active) return retry() })
    return () => { active = false; counter.value++ }
  }, [retry])
  const data = state?.owner === id ? state : null
  const list = data?.lists.some(row => row.id === selected) ? selected : ''
  return { owner: id, lists: data?.lists ?? [], memberships: data?.memberships ?? [], loading: !data, error: data?.error ?? '', retry,
    selected: list, select: setSelected,
    filter: <T extends Pick<Contact, 'id'>>(contacts: T[]) => contactsInList(contacts, list, data?.memberships ?? []) }
}
