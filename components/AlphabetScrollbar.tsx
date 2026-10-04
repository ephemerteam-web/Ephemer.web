'use client'

import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react'
import { alphabetIndex } from '@/lib/contact-alphabet'
import { contactsScrollOffset } from '@/lib/hooks/useAlphabetLetters'

type AlphabetScrollbarProps = {
  letters: string[]
  activeLetter?: string | null
  onLetterClick: (letter: string, behavior?: ScrollBehavior) => void
  triPar: 'nom' | 'prenom'
  listRef: RefObject<HTMLDivElement | null>
}

export default function AlphabetScrollbar({ letters, activeLetter, onLetterClick, triPar, listRef }: AlphabetScrollbarProps) {
  const scrollbarRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<number | null>(null)
  const lastLetterRef = useRef<string | null>(null)
  const suppressClickRef = useRef(false)
  const refreshPositionRef = useRef<() => void>(() => {})
  const [gestureLetter, setGestureLetter] = useState<string | null>(null)
  const [top, setTop] = useState<number | null>(null)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      // Stabiliser les zones de lettres pendant le glissement du doigt.
      if (pointerRef.current !== null) return
      const firstContact = listRef.current?.querySelector<HTMLElement>('[data-letter]')
      const offset = contactsScrollOffset()
      setTop(Math.max(offset, firstContact?.getBoundingClientRect().top ?? offset))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure) }
    refreshPositionRef.current = schedule
    const observer = new ResizeObserver(schedule)
    const header = document.querySelector('header')
    if (header) observer.observe(header)
    if (listRef.current) observer.observe(listRef.current)
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      refreshPositionRef.current = () => {}
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
    }
  }, [listRef, letters])

  const selectAt = (clientY: number) => {
    const bounds = scrollbarRef.current?.getBoundingClientRect()
    if (!bounds) return
    const index = alphabetIndex(clientY, bounds.top, bounds.height, letters.length)
    const letter = letters[index]
    if (!letter || letter === lastLetterRef.current) return
    lastLetterRef.current = letter
    setGestureLetter(letter)
    // Aucun déplacement animé pendant le geste : la liste suit le doigt.
    onLetterClick(letter, 'instant')
  }

  const finishGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== pointerRef.current) return
    pointerRef.current = null
    lastLetterRef.current = null
    setGestureLetter(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    refreshPositionRef.current()
  }

  if (letters.length <= 1) return null

  const selected = gestureLetter ?? activeLetter
  return (
    <nav
      aria-label={`Navigation alphabétique par ${triPar === 'nom' ? 'nom' : 'prénom'}`}
      className="pointer-events-none fixed right-[max(0.25rem,env(safe-area-inset-right))] bottom-[max(6rem,env(safe-area-inset-bottom))] z-20 flex w-11 items-center justify-center"
      style={{ top: top ?? 80, visibility: top === null ? 'hidden' : 'visible' }}
    >
      <div
        ref={scrollbarRef}
        className="pointer-events-auto relative flex h-full max-h-full w-11 touch-none select-none flex-col rounded-full border border-line bg-canvas/95 py-0 shadow-sm"
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0) return
          suppressClickRef.current = event.pointerType !== 'mouse'
          if (event.pointerType === 'mouse') return
          pointerRef.current = event.pointerId
          event.currentTarget.setPointerCapture(event.pointerId)
          lastLetterRef.current = null
          selectAt(event.clientY)
        }}
        onPointerMove={event => {
          if (event.pointerId === pointerRef.current) selectAt(event.clientY)
        }}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
        onLostPointerCapture={finishGesture}
      >
        {gestureLetter && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-14 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl bg-action text-2xl font-bold text-on-action shadow-lg"
            style={{ top: `${(letters.indexOf(gestureLetter) + 0.5) / letters.length * 100}%` }}
          >
            {gestureLetter}
          </span>
        )}
        {letters.map(letter => (
          <button
            key={letter}
            type="button"
            aria-label={`Aller à la lettre ${letter}`}
            aria-current={letter === selected ? 'location' : undefined}
            // Les clics clavier n'ont pas de pointeur ; éviter le double saut après un geste.
            onClick={event => { if (event.detail === 0 || !suppressClickRef.current) onLetterClick(letter, 'smooth') }}
            className="flex min-h-0! w-full flex-1 items-center justify-center rounded-full text-xs font-semibold text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span className={`flex h-6 max-h-full w-6 items-center justify-center rounded-full transition-colors ${letter === selected ? 'bg-action text-on-action' : ''}`}>
              {letter}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
