'use client'
import { useEffect, useState, useCallback } from 'react'
import { useDashboardUser } from '@/components/DashboardUserContext'
import { supabase } from '../supabase-browser'
import { readAllRows } from '../pagination'
import { createRequestScope } from '../request-scope'
import type { Contact } from '@/types/database'
export function useContacts() {
  const { id } = useDashboardUser()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => { setLoading(true); setError(''); setAttempt(value => value + 1) }, [])
  useEffect(() => {
    const scope = createRequestScope()
    readAllRows(() => supabase.from('contacts').select('*').eq('user_id', id))
      .then(rows => { if (scope.current()) { setContacts(rows); setError('') } })
      .catch(() => { if (scope.current()) setError('Impossible de charger tes contacts. Réessaie pour obtenir une liste complète.') })
      .finally(() => { if (scope.current()) setLoading(false) })
    return scope.cancel
  }, [id, attempt])
  return { contacts, loading, error, retry }
}
