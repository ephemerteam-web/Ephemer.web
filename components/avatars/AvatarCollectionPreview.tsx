'use client'
// 🌙 Atelier autonome : aucune session, requête, sauvegarde ou modification de carte.
import { useState } from 'react'
import Modal from '@/components/Modal'
import { button } from '@/components/AttentionShared'
import { AVATAR_PRESETS_V2, DEFAULT_AVATAR_V2, avatarCollectionConfig } from '@/lib/avatar-collection-v2'
import AvatarRendererV2 from './AvatarRendererV2'
import AvatarCollectionEditor from './AvatarCollectionEditor'

export default function AvatarCollectionPreview() {
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState(() => avatarCollectionConfig(DEFAULT_AVATAR_V2))
  function close() { setOpen(false); setChoice(avatarCollectionConfig(DEFAULT_AVATAR_V2)) }
  return <div className="mt-5 rounded-2xl border border-line p-4">
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex gap-2" aria-hidden="true">{AVATAR_PRESETS_V2.map(preset => <div key={preset.label} className="w-16"><AvatarRendererV2 config={preset.config} decorative /></div>)}</div>
      <div className="min-w-0 flex-1"><h3 className="font-semibold">Collection céleste</h3><p className="mt-1 text-sm text-muted">Visages ronds, grands sourires et nouveaux accessoires.</p></div>
    </div>
    <p className="my-3 text-sm text-muted">Collection en aperçu : tes essais ne sont pas enregistrés et ne changent ni ton avatar personnel ni tes cartes.</p>
    <button type="button" className={button} onClick={() => setOpen(true)}>Essayer la collection céleste</button>
    <Modal open={open} onClose={close} title="Collection céleste — aperçu" className="w-[min(960px,100vw)]">
      <h2 className="text-xl font-semibold">Ton portrait céleste</h2>
      <p className="mt-2 mb-5 text-sm text-muted">Compose un portrait avec les nouveaux éléments. Les choix restent temporaires ; fermer annule tes essais.</p>
      <div className="mb-6 flex flex-wrap gap-3">{AVATAR_PRESETS_V2.map(preset => <button key={preset.label} type="button" className={`${button} flex items-center gap-3`} onClick={() => setChoice(avatarCollectionConfig(preset.config))}>
        <span className="w-10 shrink-0"><AvatarRendererV2 config={preset.config} decorative /></span>{preset.label}
      </button>)}</div>
      <AvatarCollectionEditor value={choice} onChange={setChoice} />
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className={button} onClick={() => setChoice(avatarCollectionConfig(DEFAULT_AVATAR_V2))}>Réinitialiser l’aperçu</button>
        <button type="button" className={button} onClick={close}>Fermer l’aperçu</button>
      </div>
    </Modal>
  </div>
}
