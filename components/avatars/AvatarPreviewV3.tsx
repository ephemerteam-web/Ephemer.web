'use client'
// Atelier autonome : fermer annule les essais, aucun appel réseau ni écriture.
import { useState } from 'react'
import Modal from '@/components/Modal'
import { button } from '@/components/AttentionShared'
import { AVATAR_PRESETS_V3, DEFAULT_AVATAR_V3, avatarConfigV3 } from '@/lib/avatar-collection-v3'
import AvatarRenderer from './AvatarRenderer'
import AvatarEditorV3 from './AvatarEditorV3'
export default function AvatarPreviewV3() {
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState(() => avatarConfigV3(DEFAULT_AVATAR_V3))
  function close() { setOpen(false); setChoice(avatarConfigV3(DEFAULT_AVATAR_V3)) }
  return <section className="mt-5 rounded-2xl border border-line p-4">
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex gap-2" aria-hidden="true">{AVATAR_PRESETS_V3.map(preset => <span key={preset.label} className="w-16"><AvatarRenderer config={preset.config} decorative /></span>)}</div>
      <div className="min-w-0 flex-1"><h2 className="font-semibold">Avatar</h2><p className="mt-1 text-sm text-muted">Quatre sourires, huit formes d’yeux et des accessoires à combiner.</p></div>
    </div>
    <p className="my-3 text-sm text-muted">Aperçu temporaire : tes essais ne sont pas enregistrés et ne changent ni ton avatar personnel ni tes cartes.</p>
    <button type="button" className={button} onClick={() => setOpen(true)}>Personnaliser mon avatar</button>
    <Modal open={open} onClose={close} title="Personnaliser mon avatar" className="w-[min(1040px,100vw)]">
      <h2 className="text-xl font-semibold">Personnaliser mon avatar</h2>
      <p className="mt-2 mb-5 text-sm text-muted">Choisis tes formes et tes couleurs. Homme et Femme modifient uniquement le dessin du portrait. Fermer annule tes essais.</p>
      <AvatarEditorV3 value={choice} onChange={setChoice} />
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className={button} onClick={() => setChoice(avatarConfigV3(DEFAULT_AVATAR_V3))}>Réinitialiser l’aperçu</button>
        <button type="button" className={button} onClick={close}>Annuler et fermer</button>
      </div>
    </Modal>
  </section>
}
