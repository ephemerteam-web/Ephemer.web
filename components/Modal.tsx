'use client'

import { useEffect, useId, useRef, type ReactNode, type CSSProperties } from 'react'

// Le dialogue natif gère le confinement du focus et rend le reste de la page inerte.
export default function Modal({ open, onClose, title, children, className = '', style }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string; style?: CSSProperties
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !open) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    const initial = dialog.querySelector<HTMLElement>('[data-initial-focus], button, input, select, textarea, a[href]')
    ;(initial ?? dialog).focus()
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      if (trigger?.isConnected) trigger.focus()
    }
  }, [open])
  return <dialog ref={ref} tabIndex={-1} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); event.stopPropagation(); closeRef.current() }}
    onClick={event => { if (event.target === event.currentTarget) closeRef.current() }}
    style={{ ...style, ...(!open ? { display: 'none' } : {}) }} className={`m-auto max-h-[100dvh] max-w-[100vw] overflow-y-auto border border-line bg-surface text-ink p-5 rounded-2xl backdrop:bg-black/60 ${className}`}>
    <h2 id={titleId} className="sr-only">{title}</h2>{open && children}
  </dialog>
}
