'use client'

import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import Link from 'next/link'
import Modal from '@/components/Modal'
import { useContactDraft } from '@/components/ContactDraftProvider'
import type { PortraitAvatar } from '@/lib/portrait-avatar'
import AccountAvatarBadge from './AccountAvatarBadge'
import { useDashboardAvatar } from './DashboardAvatarContext'

const action = 'inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export default function ProfileAvatarCard({ ownerId, initiale }: { ownerId: string; initiale?: string }) {
  const { portrait } = useDashboardAvatar()
  // Un autre compte ou portrait abandonne immédiatement le dialogue et l’appui en cours.
  return <ProfileAvatarCardSession key={`${ownerId}:${portrait?.revision ?? 'dessin'}`} portrait={portrait} initiale={initiale} />
}

export function ProfileAvatarCardSession({ portrait, initiale }: { portrait: PortraitAvatar | null; initiale?: string }) {
  const { navigate } = useContactDraft()
  const [open, setOpen] = useState(false)
  const id = useId()
  const press = useRef<{ timer: ReturnType<typeof setTimeout> | null; pointerId: number; x: number; y: number } | null>(null)
  const suppressClick = useRef(false)

  function cancelPress() {
    if (press.current?.timer != null) clearTimeout(press.current.timer)
    press.current = null
  }

  useEffect(() => {
    const cancel = () => {
      if (press.current) suppressClick.current = true
      cancelPress()
    }
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', cancel)
    return () => {
      cancelPress()
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', cancel)
    }
  }, [])

  function startPress(event: PointerEvent<HTMLButtonElement>) {
    cancelPress()
    if (!event.isPrimary || event.button !== 0) { suppressClick.current = true; return }
    suppressClick.current = false
    if (!portrait) return
    const current = { timer: null as ReturnType<typeof setTimeout> | null, pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    press.current = current
    current.timer = setTimeout(() => {
      if (press.current !== current) return
      current.timer = null
      suppressClick.current = true
      setOpen(true)
    }, 550)
  }

  function movePress(event: PointerEvent<HTMLButtonElement>) {
    const current = press.current
    if (current?.pointerId === event.pointerId && Math.hypot(event.clientX - current.x, event.clientY - current.y) > 10) {
      suppressClick.current = true
      cancelPress()
    }
  }

  return <section aria-labelledby={`${id}-title`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-surface p-3 sm:max-w-sm">
    <button type="button" aria-label="Modifier mon avatar" aria-describedby={portrait ? `${id}-help` : undefined}
      className="h-20 w-20 shrink-0 touch-pan-y select-none overflow-hidden rounded-2xl border border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      style={{ WebkitTouchCallout: 'none' }}
      onPointerDown={startPress} onPointerMove={movePress} onPointerUp={cancelPress}
      onPointerLeave={() => { if (press.current) suppressClick.current = true; cancelPress() }}
      onPointerCancel={() => { suppressClick.current = true; cancelPress() }}
      onDragStart={event => { event.preventDefault(); suppressClick.current = true; cancelPress() }}
      onContextMenu={event => { if (portrait) event.preventDefault() }}
      onKeyDown={() => { cancelPress(); suppressClick.current = false }}
      onClick={() => {
        cancelPress()
        if (suppressClick.current) { suppressClick.current = false; return }
        void navigate('/avatar')
      }}>
      <AccountAvatarBadge initiale={initiale} rounded={false} />
    </button>
    <div className="min-w-0">
      <h2 id={`${id}-title`} className="font-semibold text-ink">Mon avatar</h2>
      {portrait && <p id={`${id}-help`} className="mt-1 text-xs text-muted">Maintiens l’avatar appuyé pour le voir en grand.</p>}
      <div className="mt-1 flex flex-wrap gap-1">
        <Link href="/avatar" className={action}>Modifier</Link>
        {portrait && <button type="button" aria-haspopup="dialog" className={action} onClick={() => { cancelPress(); setOpen(true) }}>Agrandir</button>}
      </div>
    </div>
    <Modal open={open && !!portrait} onClose={() => setOpen(false)} title="Mon portrait IA" className="w-[min(95vw,36rem)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Mon portrait IA</h2>
        <button type="button" data-initial-focus className={`${action} border border-line`} onClick={() => setOpen(false)}>Fermer</button>
      </div>
      {portrait && <>
        {/* Portrait privé déjà en mémoire : aucun chargement externe ou cache d’image Next. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portrait.image} alt="Ton portrait IA enregistré, en grand" draggable={false} className="mx-auto max-h-[65dvh] w-full rounded-xl object-contain" />
        <a href={portrait.image} download="avatar-ephemer.jpg" className={`${action} mt-4 bg-action text-on-action`}>Télécharger mon avatar</a>
      </>}
    </Modal>
  </section>
}
