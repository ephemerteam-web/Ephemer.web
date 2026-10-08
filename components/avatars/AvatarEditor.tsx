'use client'

import { useId } from 'react'
import { AVATAR_CATALOG_V1, AVATAR_GROUPS, avatarConfig, type AvatarConfigV1 } from '@/lib/avatars'
import AvatarRendererV1 from './AvatarRendererV1'

// Contrôlé par son parent : aucune sauvegarde implicite, requête ou stockage navigateur.
export default function AvatarEditor({ value, onChange }: { value: AvatarConfigV1; onChange: (value: AvatarConfigV1) => void }) {
  const prefix = useId(), config = avatarConfig(value)
  return <div className="grid min-w-0 gap-5 sm:grid-cols-[140px_1fr]">
    <div className="mx-auto w-28 sm:w-32"><AvatarRendererV1 config={config} /><p className="mt-2 text-center text-sm text-muted">Aperçu de ton avatar</p></div>
    <div className="min-w-0 space-y-4">
      {AVATAR_GROUPS.map(({ key, label }) => <fieldset key={key} className="min-w-0">
        <legend className="mb-2 font-medium">{label}</legend>
        <div className="flex flex-wrap gap-2">{AVATAR_CATALOG_V1[key].map(option => <label key={option.id}
          className="relative flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm has-checked:border-accent has-checked:bg-accent/10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent">
          <input type="radio" name={`${prefix}-${key}`} value={option.id} checked={config[key] === option.id}
            onChange={() => onChange(avatarConfig({ ...config, [key]: option.id }))} className="accent-accent" />
          {'color' in option && <span aria-hidden="true" className="size-4 shrink-0 rounded-full border border-line" style={{ backgroundColor: option.color }} />}
          <span>{option.label}</span>
        </label>)}</div>
      </fieldset>)}
      <p className="text-sm text-muted">Tous ces choix sont gratuits.</p>
    </div>
  </div>
}
