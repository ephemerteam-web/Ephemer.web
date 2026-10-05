'use client'
import { useCallback, useEffect, useState } from 'react'
import { useDashboardUser } from '@/components/DashboardUserContext'
import { supabase } from '../supabase-browser'
import { readEventData } from '../personal-event-data'
import { eventViews, type EventData } from '../personal-events'

export function usePersonalEvents(start: string, end: string) {
  const { id } = useDashboardUser()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ scope: string; data: EventData | null; error: string } | null>(null)
  const scope = `${id}:${start}:${end}:${attempt}`
  const retry = useCallback(() => setAttempt(value => value + 1), [])
  useEffect(() => {
    let active = true
    readEventData(supabase, id, start, end).then(data => { if (active) setState({ scope, data, error: '' }) })
      .catch(() => { if (active) setState({ scope, data: null, error: 'Impossible de charger toutes les dates personnelles. Réessaie.' }) })
    return () => { active = false }
  }, [id, start, end, scope])
  const current = state?.scope === scope ? state : null
  return { data: current?.data ?? null, views: current?.data ? eventViews(current.data, start, end) : [], loading: !current, error: current?.error ?? '', retry }
}
