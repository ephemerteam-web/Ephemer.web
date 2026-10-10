'use client'
import { GROUPES_INTERETS } from '@/app/invitation/[token]/interets'
export default function InterestPicker({ value, onChange, disabled = false }: { value: string[]; onChange: (value: string[]) => void; disabled?: boolean }) {
  return <div className="space-y-5">{GROUPES_INTERETS.map(group => <fieldset key={group.titre} disabled={disabled} className="space-y-3">
    <legend className="font-medium text-ink">{group.emoji} {group.titre}</legend>
    <div className="flex flex-wrap gap-2">{group.items.map(item => <button type="button" key={item} aria-pressed={value.includes(item)}
      onClick={() => onChange(value.includes(item) ? value.filter(other => other !== item) : [...value, item])}
      className={'min-h-11 rounded-full border px-4 py-2 text-sm transition ' + (value.includes(item) ? 'border-accent bg-action/15 text-accent' : 'border-line bg-surface text-muted hover:border-accent/50')}>{item}</button>)}</div>
  </fieldset>)}</div>
}
