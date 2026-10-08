'use client'
import { useId } from 'react'
import { AVATAR_GROUPS } from '@/lib/avatars'
import { AVATAR_CATALOG_V2, avatarCollectionConfig, type AvatarConfigV2 } from '@/lib/avatar-collection-v2'
import AvatarRendererV2 from './AvatarRendererV2'

// Radios natifs : flèches du clavier, noms de couleurs et focus visible sans script dédié.
export default function AvatarCollectionEditor({ value, onChange }: {
  value: AvatarConfigV2; onChange: (value: AvatarConfigV2) => void
}) {
  const prefix = useId(), config = avatarCollectionConfig(value)
  return <div className="grid min-w-0 items-start gap-6 sm:grid-cols-[180px_1fr]">
    <figure className="mx-auto w-44 sm:sticky sm:top-0 sm:w-full">
      <AvatarRendererV2 config={config} />
      <figcaption className="mt-3 text-center text-sm text-muted">Ton portrait céleste<br />Aperçu temporaire</figcaption>
    </figure>
    <div className="min-w-0 space-y-6">
      {AVATAR_GROUPS.map(({ key, label }) => <fieldset key={key} className="min-w-0">
        <legend className="mb-2 font-medium">{key === 'accessoryId' ? 'Accessoire ou finition' : label}</legend>
        <div className={['skinId', 'hairColorId', 'clothingColorId'].includes(key) ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 gap-2 sm:grid-cols-4'}>
          {AVATAR_CATALOG_V2[key].map(option => {
            const color = 'color' in option ? option.color : null
            return <label key={option.id} className={`relative flex min-w-0 cursor-pointer rounded-xl border border-line p-2 text-sm has-checked:border-accent has-checked:bg-accent/10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${color ? 'min-h-11 items-center gap-2' : 'flex-col gap-2'}`}>
              {color ? <span aria-hidden="true" className="size-5 shrink-0 rounded-full border border-line" style={{ backgroundColor: color }} /> :
                <AvatarRendererV2 config={avatarCollectionConfig({ ...config, [key]: option.id })} decorative className="mx-auto max-w-20" />}
              <span className="flex items-center gap-1.5">
                <input type="radio" name={`${prefix}-${key}`} value={option.id} checked={config[key] === option.id}
                  onChange={() => onChange(avatarCollectionConfig({ ...config, [key]: option.id }))} className="shrink-0 accent-accent" />
                <span className="min-w-0 break-words">{option.label}</span>
              </span>
            </label>
          })}
        </div>
      </fieldset>)}
      <p className="text-sm text-muted">Tous les éléments sont gratuits. Un accessoire ou une finition à la fois.</p>
    </div>
  </div>
}
