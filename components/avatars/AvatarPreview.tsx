'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'
import { avatarConfig, DEFAULT_AVATAR_V1 } from '@/lib/avatars'
import { CARD_TEMPLATES, type CardTemplateId } from '@/lib/cards'
import AvatarEditor from './AvatarEditor'
import CardRendererV2 from '@/components/cards/CardRendererV2'

// Première tranche sans schéma : toute la saisie reste en mémoire, jamais présentée comme enregistrée.
export default function AvatarPreview() {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState(() => avatarConfig(DEFAULT_AVATAR_V1))
  const [template, setTemplate] = useState<CardTemplateId>('clair_de_lune')
  const close = () => { setOpen(false); setConfig(avatarConfig(DEFAULT_AVATAR_V1)); setTemplate('clair_de_lune') }
  return <section className="my-6 rounded-2xl border border-line bg-surface p-4">
    <h2 className="text-lg font-semibold">Ton avatar — aperçu</h2>
    <p className="mt-2 text-sm text-muted">Essaie les éléments gratuits. La sauvegarde sera disponible après validation du schéma : ces choix restent temporaires et ne modifient ni ton profil ni tes cartes.</p>
    <button type="button" onClick={() => setOpen(true)} className="mt-3 min-h-11 rounded-lg border border-line px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Essayer mon avatar</button>
    <Modal open={open} onClose={close} title="Essayer mon avatar" className="w-[min(920px,100vw)]">
      <h2 className="mb-2 text-xl font-semibold">Essayer mon avatar</h2>
      <p className="mb-5 text-sm text-muted">Aperçu temporaire, sans enregistrement ni publication.</p>
      <AvatarEditor value={config} onChange={setConfig} />
      <div className="mt-6 border-t border-line pt-4">
        <h3 className="mb-3 font-semibold">Exemple de signature de carte</h3>
        <label className="mb-3 block text-sm">Modèle de l’exemple
          <select value={template} onChange={event => setTemplate(event.target.value as CardTemplateId)} className="ml-2 max-w-full rounded-lg border border-line bg-surface p-2 focus-visible:outline-2 focus-visible:outline-accent">
            {CARD_TEMPLATES.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
          </select>
        </label>
        <CardRendererV2 snapshot={{ format: 2, renderVersion: 2, templateVersion: 1, templateId: template, message: 'Une journée lumineuse et de belles découvertes !', signature: 'Avec toute mon affection', avatar: config }} />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => setConfig(avatarConfig(DEFAULT_AVATAR_V1))} className="min-h-11 rounded-lg border border-line px-4 py-2 focus-visible:outline-2 focus-visible:outline-accent">Réinitialiser l’aperçu</button>
        <button type="button" onClick={close} className="min-h-11 rounded-lg border border-line px-4 py-2 focus-visible:outline-2 focus-visible:outline-accent">Annuler et fermer</button>
      </div>
    </Modal>
  </section>
}
