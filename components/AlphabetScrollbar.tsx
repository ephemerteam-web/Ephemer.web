'use client'

import { useEffect, useRef, useState } from 'react'

type AlphabetScrollbarProps = {
  letters: string[]
  activeLetter?: string | null
  onLetterClick: (letter: string) => void
  triPar: 'nom' | 'prenom'
}

export default function AlphabetScrollbar({
  letters,
  activeLetter,
  onLetterClick,
  triPar,
}: AlphabetScrollbarProps) {
  const scrollbarRef = useRef<HTMLDivElement>(null)
  const [isTouching, setIsTouching] = useState(false)
  
  // Ne pas afficher si trop peu de lettres (moins de 2)
  if (letters.length <= 1) return null
  
  // Taille des boutons de lettre
  const buttonSize = 'w-7 h-7'
  
  return (
    <div 
      ref={scrollbarRef}
      className="fixed right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-0.5 pointer-events-auto"
      style={{ transform: 'translateY(-50%)' }}
    >
      {letters.map((letter) => {
        // Normaliser pour comparaison (É = E, etc.)
        const normalizedLetter = letter.normalize('NFD').charAt(0).toUpperCase()
        const normalizedActive = activeLetter?.normalize('NFD').charAt(0).toUpperCase()
        const isActive = normalizedLetter === normalizedActive
        
        return (
          <button
            key={letter}
            onClick={() => onLetterClick(letter)}
            onTouchStart={() => setIsTouching(true)}
            onTouchEnd={() => setIsTouching(false)}
            aria-label={`Aller à la lettre ${letter}`}
            className={`rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent/50 ${
              isActive
                ? 'bg-action text-on-action ring-2 ring-action ring-offset-2 ring-offset-canvas'
                : 'bg-ink/5 text-muted hover:bg-ink/10 hover:text-ink'
            } ${buttonSize}`}
            style={{
              // Réduire légèrement l'opacité si beaucoup de lettres
              opacity: letters.length > 20 ? 0.85 : 1,
            }}
            title={`Aller à la lettre ${letter}`}
          >
            {letter}
          </button>
        )
      })}
    </div>
  )
}
