'use client'

import { useSyncExternalStore } from 'react'

let now = 0
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined
function tick() {
  now = Date.now()
  listeners.forEach(listener => listener())
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    tick()
    timer = setInterval(tick, 60_000)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

export function useClock() {
  return useSyncExternalStore(subscribe, () => now, () => 0)
}
