'use client'
import { useId, useState } from 'react'
import Modal from '@/components/Modal'
import { button } from '@/components/AttentionShared'
import { AVATAR_CATALOG_V3, AVATAR_ACCESSORIES_V3, AVATAR_GROUPS_V3, AVATAR_ACCESSORY_GROUPS_V3, avatarConfigV3, type AvatarConfigV3 } from '@/lib/avatar-collection-v3'
import AvatarRenderer from './AvatarRenderer'
import AvatarRendererV3 from './AvatarRendererV3'

const groups = [...AVATAR_GROUPS_V3.map(group => ({ ...group, accessory: false })), ...AVATAR_ACCESSORY_GROUPS_V3.map(group => ({ ...group, accessory: true }))]
type Group = typeof groups[number]
const colorsByAsset: Record<string, string> = { faceId: 'skinId', hairId: 'hairColorId', eyeId: 'eyeColorId', clothingId: 'clothingColorId' }
const categories = groups.filter(group => !Object.values(colorsByAsset).includes(group.key))
function relatedColor(group: Group) { return groups.find(item => item.key === colorsByAsset[group.key]) }
function optionsFor(group: Group) {
  return group.accessory ? AVATAR_ACCESSORIES_V3[group.key as keyof typeof AVATAR_ACCESSORIES_V3] : AVATAR_CATALOG_V3[group.key as keyof typeof AVATAR_CATALOG_V3]
}
function choiceFor(config: AvatarConfigV3, group: Group) {
  return group.accessory ? config.accessories[group.key as keyof typeof config.accessories] : config[group.key as keyof typeof AVATAR_CATALOG_V3]
}
function change(config: AvatarConfigV3, group: Group, id: string) {
  return avatarConfigV3(group.accessory ? { ...config, accessories: { ...config.accessories, [group.key]: id } } : { ...config, [group.key]: id })
}
// Chaque catégorie ouvre une palette native ; annuler restaure les choix à son ouverture.
export default function AvatarEditorV3({ value, onChange }: { value: AvatarConfigV3; onChange: (value: AvatarConfigV3) => void }) {
  const prefix = useId(), config = avatarConfigV3(value)
  const [palette, setPalette] = useState<{ group: Group; before: AvatarConfigV3 } | null>(null)
  function cancelPalette() { if (palette) onChange(avatarConfigV3(palette.before)); setPalette(null) }
  return <div className="grid min-w-0 items-start gap-6 sm:grid-cols-[220px_1fr]">
    <figure className="mx-auto w-44 sm:sticky sm:top-0 sm:w-full">
      <AvatarRenderer config={config} />
      <figcaption className="mt-3 text-center text-sm text-muted">Aperçu de ton portrait</figcaption>
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-line p-3">
        <span className="w-10 shrink-0"><AvatarRenderer config={config} decorative /></span>
        <span className="text-sm">Avec affection<br /><span className="text-muted">Exemple de signature</span></span>
      </div>
    </figure>
    <div className="min-w-0">
      <p className="mb-3 text-sm text-muted">Ouvre une catégorie pour découvrir sa palette.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categories.map(group => {
          const option = optionsFor(group).find(option => option.id === choiceFor(config, group))!
          const related = relatedColor(group)
          const colorChoice = related && optionsFor(related).find(option => option.id === choiceFor(config, related))
          const color = 'color' in option ? option.color as string : null
          return <button key={group.key} type="button" aria-haspopup="dialog" className="flex min-w-0 flex-col items-center gap-2 rounded-xl border border-line p-3 text-center hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" onClick={() => setPalette({ group, before: avatarConfigV3(config) })}>
            {color ? <span aria-hidden="true" className="size-9 rounded-full border border-line" style={{ backgroundColor: color }} /> :
              <AvatarRendererV3 config={config} decorative detail={group.key === 'mouthId' ? 'mouth' : group.key === 'eyeId' ? 'eyes' : undefined} className={group.key === 'mouthId' || group.key === 'eyeId' ? 'max-w-28' : 'max-w-16'} />}
            <span className="text-sm font-semibold">{group.label}</span><span className="text-xs text-muted">{option.label}{colorChoice ? ` · ${colorChoice.label}` : ''}</span>
          </button>
        })}
      </div>
      <p className="mt-4 text-sm text-muted">Tous les éléments sont gratuits. Les accessoires de catégories différentes se combinent.</p>
    </div>
    <Modal open={!!palette} onClose={cancelPalette} title={palette ? `Choisir : ${palette.group.label}` : 'Choisir un élément'} className="w-[min(660px,100vw)]">
      {palette && <>
        <div className="grid min-w-0 items-start gap-4 sm:grid-cols-[160px_1fr]">
          <figure className="sticky top-0 z-10 flex items-center justify-center gap-3 rounded-xl border border-line bg-surface p-2 sm:flex-col">
            <span className="w-24 shrink-0 sm:w-full"><AvatarRenderer config={config} /></span>
            <figcaption className="text-sm text-muted">Ton portrait<br />Aperçu immédiat</figcaption>
          </figure>
          <div className="min-w-0 space-y-5">
          {[palette.group, relatedColor(palette.group)].filter((group): group is Group => !!group).map(group => <fieldset key={group.key} className="min-w-0">
          <legend className="mb-4 text-lg font-semibold">{group.label}</legend>
          <div className={optionsFor(group).some(option => 'color' in option) ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 gap-3'}>
            {optionsFor(group).map(option => {
              const color = 'color' in option ? option.color as string : null
              const next = change(config, group, option.id)
              return <label key={option.id} className={`relative flex min-w-0 cursor-pointer rounded-xl border border-line p-2 text-sm has-checked:border-accent has-checked:bg-accent/10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${color ? 'min-h-11 items-center gap-2' : 'flex-col gap-2'}`}>
                {color ? <span aria-hidden="true" className="size-5 shrink-0 rounded-full border border-line" style={{ backgroundColor: color }} /> :
                  <AvatarRendererV3 config={next} decorative detail={group.key === 'mouthId' ? 'mouth' : group.key === 'eyeId' ? 'eyes' : undefined} className={group.key === 'mouthId' || group.key === 'eyeId' ? 'mx-auto max-w-28' : 'mx-auto max-w-24'} />}
                <span className="flex items-center gap-1.5"><input type="radio" name={`${prefix}-${group.key}`} value={option.id} checked={choiceFor(config, group) === option.id} onChange={() => onChange(next)} className="shrink-0 accent-accent" /><span className="min-w-0 break-words">{option.label}</span></span>
              </label>
            })}
          </div>
          </fieldset>)}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className={button} onClick={() => setPalette(null)}>Utiliser ce choix</button>
          <button type="button" className={button} onClick={cancelPalette}>Annuler ce choix</button>
        </div>
      </>}
    </Modal>
  </div>
}
