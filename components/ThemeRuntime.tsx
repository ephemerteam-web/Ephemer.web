'use client'

import { useEffect } from 'react'
import { resolvedTheme, validTheme } from '@/lib/theme'

function applyCurrentTheme() {
  let choice = 'system'
  try { choice = validTheme(localStorage.getItem('ephemer-theme')) } catch { /* Stockage indisponible. */ }
  const theme = resolvedTheme(choice as 'dark' | 'light' | 'system', matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
    meta.setAttribute('content', theme === 'dark' ? '#0b1425' : '#faf6ef')
  })
}

export default function ThemeRuntime() {
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    applyCurrentTheme()
    media.addEventListener('change', applyCurrentTheme)
    window.addEventListener('storage', applyCurrentTheme)
    window.addEventListener('ephemer-theme-change', applyCurrentTheme)
    return () => {
      media.removeEventListener('change', applyCurrentTheme)
      window.removeEventListener('storage', applyCurrentTheme)
      window.removeEventListener('ephemer-theme-change', applyCurrentTheme)
    }
  }, [])
  return null
}
