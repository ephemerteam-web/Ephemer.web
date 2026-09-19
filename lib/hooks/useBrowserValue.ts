'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

// Pour les capacités fixes du navigateur, avec une valeur SSR stable.
export function useBrowserValue<T>(read: () => T, fallback: T): T {
  return useSyncExternalStore(subscribe, read, () => fallback)
}
