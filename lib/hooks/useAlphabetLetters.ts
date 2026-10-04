'use client'

import { useMemo, useCallback, type RefObject } from 'react'
import { contactLetter, type ContactName } from '@/lib/contact-alphabet'
import type { TriContact } from './useContactFilters'

export function contactsScrollOffset() {
  return Math.max(0, document.querySelector('header')?.getBoundingClientRect().bottom ?? 0) + 12
}

export function useAlphabetLetters(contacts: ContactName[], triPar: TriContact) {
  const letters = useMemo(() => Array.from(new Set(contacts.map(contact => contactLetter(contact, triPar))))
    .filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr')), [contacts, triPar])

  const scrollToLetter = useCallback((letter: string, listRef: RefObject<HTMLDivElement | null>, behavior: ScrollBehavior = 'smooth') => {
    const target = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-letter]') ?? [])
      .find(element => element.dataset.letter === letter)
    if (!target) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - contactsScrollOffset(),
      behavior: reducedMotion ? 'instant' : behavior,
    })
  }, [])

  return { letters, scrollToLetter }
}
