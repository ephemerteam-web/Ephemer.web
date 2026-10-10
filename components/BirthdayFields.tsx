'use client'
import { useId } from 'react'
export type BirthdayInput = { jour: string; mois: string; annee: string }
export default function BirthdayFields({ value, onChange, disabled = false }: { value: BirthdayInput; onChange: (value: BirthdayInput) => void; disabled?: boolean }) {
  const id = useId()
  return <fieldset disabled={disabled} className="space-y-2"><legend className="mb-2 text-sm text-muted">Ton anniversaire 🎂 <span>(facultatif)</span></legend>
    <div className="grid grid-cols-3 gap-2">{(['jour', 'mois', 'annee'] as const).map(key => <label className="min-w-0 text-sm text-muted" htmlFor={id + key} key={key}>
      <span className="flex min-h-10 items-end">{key === 'jour' ? 'Jour' : key === 'mois' ? 'Mois' : 'Année (facultative)'}</span>
      <input id={id + key} aria-label={key === 'annee' ? 'Année de naissance (facultative)' : key === 'jour' ? 'Jour de naissance' : 'Mois de naissance'} inputMode="numeric" autoComplete="off" className="mt-1 w-full min-w-0 p-3 text-center"
        value={value[key]} onChange={event => onChange({ ...value, [key]: event.target.value.replace(/\D/g, '').slice(0, key === 'annee' ? 4 : 2) })} />
    </label>)}</div><p className="text-xs text-muted">Tu peux renseigner seulement le jour et le mois. Sans année, aucun âge n’est calculé.</p>
  </fieldset>
}
