'use client'
import { useEffect, useRef } from 'react'
import { createRequestScope } from '../request-scope'

// Capturer .current avant une action ; les réponses après fermeture sont ignorées.
export function useRequestLifetime() {
  const lifetime = useRef(createRequestScope())
  useEffect(() => {
    const scope = createRequestScope()
    lifetime.current = scope
    return scope.cancel
  }, [])
  return lifetime
}
