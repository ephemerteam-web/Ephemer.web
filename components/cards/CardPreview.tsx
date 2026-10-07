'use client'
import { useCallback, useRef, useState } from 'react'
import Modal from '@/components/Modal'
import { button, panel } from '@/components/AttentionShared'
import CardEditor from './CardEditor'
export default function CardPreview({ ownerId, preparationId, preparedMessage }: { ownerId: string; preparationId: string; preparedMessage?: string }) {
  const [open, setOpen] = useState(false)
  const dirtyRef = useRef(false)
  const onDirtyChange = useCallback((dirty: boolean) => { dirtyRef.current = dirty }, [])
  function close() { if (!dirtyRef.current || window.confirm('Fermer sans enregistrer tes modifications de la carte ?')) setOpen(false) }
  return <section className={panel}><h2 className="text-lg font-bold">Ma carte personnelle</h2><p className="text-sm text-muted">Prépare une carte, puis publie une version à partager avec un lien privé.</p>
    <button type="button" className={button} onClick={() => setOpen(true)}>Ouvrir ma carte</button>
    <Modal open={open} onClose={close} title="Ma carte personnelle" className="w-[min(56rem,100vw)]">{open && <CardEditor ownerId={ownerId} preparationId={preparationId} preparedMessage={preparedMessage} onClose={close} onDirtyChange={onDirtyChange} />}</Modal>
  </section>
}
