'use client'
// 🎁 Lecture éphémère et sélection attachée au compte, à la relation et à la révision.
import { useEffect, useRef, useState } from 'react'
import { readUniversCadeaux } from '../univers-data'
import type { ChampIACadeaux, UniversPourCadeaux } from '../cadeaux-social-contract'

export function useCadeauxSource(owner: string, etoileId: string | null, relation: string, onInvalidate: () => void) {
  const scope = `${owner}:${etoileId ?? ''}:${relation}`
  const [data, setData] = useState<{ scope: string; value: UniversPourCadeaux } | null>(null)
  const [selected, setSelected] = useState<{ scope: string; version: string; fields: ChampIACadeaux[] } | null>(null)
  const [loading, setLoading] = useState(false), [offline, setOffline] = useState(false)
  const callback = useRef(onInvalidate)
  const refreshRef = useRef<(() => Promise<void>) | null>(null)
  useEffect(() => { callback.current = onInvalidate }, [onInvalidate])
  useEffect(() => {
    let alive = true, sequence = 0, last = '', controller: AbortController | null = null
    const clear = () => { sequence++; controller?.abort(); setData(null); setSelected(null); setLoading(false); if (last) callback.current(); last = '' }
    const refresh = async () => {
      setOffline(navigator.onLine === false)
      if (!etoileId || navigator.onLine === false || document.visibilityState === 'hidden') { clear(); return }
      controller?.abort(); controller = new AbortController()
      const signal = controller.signal, request = ++sequence
      setLoading(true)
      try {
        const value = await readUniversCadeaux(owner, etoileId, signal)
        if (!alive || request !== sequence || signal.aborted) return
        const version = JSON.stringify(value)
        if (version !== last) { setSelected(null); if (last) callback.current() }
        last = version; setData({ scope, value })
      } catch { if (alive && request === sequence && !signal.aborted) clear() }
      finally { if (alive && request === sequence) setLoading(false) }
    }
    const stop = () => { setOffline(navigator.onLine === false); clear(); callback.current() }
    refreshRef.current = () => { clear(); return refresh() }
    // Les réglages privés du formulaire restent disponibles ; le contenu tiers est retiré.
    void refresh()
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh); window.addEventListener('offline', stop); window.addEventListener('pagehide', stop)
    document.addEventListener('visibilitychange', refresh)
    return () => { alive = false; sequence++; controller?.abort(); refreshRef.current = null; if (last) callback.current(); window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); window.removeEventListener('offline', stop); window.removeEventListener('pagehide', stop); document.removeEventListener('visibilitychange', refresh) }
  }, [scope, owner, etoileId])
  const projection = etoileId && !offline && data?.scope === scope ? data.value : null
  const version = JSON.stringify(projection)
  const fields = selected?.scope === scope && selected.version === version ? selected.fields : []
  return { projection, fields, loading, offline, setFields: (values: ChampIACadeaux[]) => setSelected({ scope, version, fields: values }), reset: () => setSelected(null), refresh: () => refreshRef.current?.() }
}
