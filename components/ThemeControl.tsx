"use client"
import { useSyncExternalStore } from 'react'
import { resolvedTheme, validTheme, type ThemeChoice } from '@/lib/theme'

let memory: ThemeChoice | null = null
function choice(): ThemeChoice {
  if (memory) return memory
  try { return validTheme(localStorage.getItem('ephemer-theme')) } catch { return 'system' }
}
function snapshot() {
  return resolvedTheme(choice(), matchMedia('(prefers-color-scheme: dark)').matches)
}
function serverSnapshot() { return 'dark' as const }
function subscribe(listener: () => void) {
  const media = matchMedia('(prefers-color-scheme: dark)')
  const storage = () => { memory = null; listener() }
  window.addEventListener('storage', storage)
  window.addEventListener('ephemer-theme-change', listener)
  media.addEventListener('change', listener)
  return () => {
    window.removeEventListener('storage', storage)
    window.removeEventListener('ephemer-theme-change', listener)
    media.removeEventListener('change', listener)
  }
}
function apply(theme: 'dark' | 'light') {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', theme === 'dark' ? '#0b1425' : '#faf6ef'))
}
export default function ThemeControl() {
  const theme = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const dark = theme === 'dark'
  function change(checked: boolean) {
    memory = checked ? 'dark' : 'light'
    try { localStorage.setItem('ephemer-theme', memory) } catch { /* Choix conservé en mémoire. */ }
    apply(memory)
    window.dispatchEvent(new Event('ephemer-theme-change'))
  }
  // Interrupteur soleil/lune inspiré du markup fourni (Uiverse / JkHuger).
  return <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm text-ink">
    <span>Apparence <span className="block text-xs text-muted">{dark ? 'Sombre' : 'Clair'}</span></span>
    <span className="relative inline-flex h-11 w-20 shrink-0 items-center">
      <input type="checkbox" role="switch" aria-label="Mode sombre" checked={dark} onChange={e => change(e.target.checked)} className="peer sr-only" />
      <span aria-hidden="true" className="absolute inset-0 rounded-full border border-[#805d1d] bg-[#d8b568] shadow-inner transition-colors duration-300 peer-checked:border-[#d8b568] peer-checked:bg-[#0b1425] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-accent" />
      <span aria-hidden="true" className="relative ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#fffaf0] text-[#805d1d] shadow-md transition-transform duration-300 peer-checked:translate-x-9 peer-checked:bg-[#d8b568] peer-checked:text-[#132b4d]">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {dark ? <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" fill="currentColor" stroke="none" /> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}
        </svg>
      </span>
    </span>
  </label>
}
