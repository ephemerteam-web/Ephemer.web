'use client'
// Éditeur contrôlé : seules les modifications enregistrées sont partagées.
import { useId } from 'react'
import Link from 'next/link'
import { emailEtoile } from '@/lib/etoiles-contract'
import { UNIVERS_TEXTES, type PartageUnivers, type UniversPartage } from '@/lib/univers-contract'
import { apercuUniversCadeaux as apercuUnivers, type MonUniversCadeaux as MonUnivers } from '@/lib/cadeaux-social-contract'
import UniversCadeauxPermissions from '@/components/cadeaux/UniversCadeauxPermissions'
import UniversView from './UniversView'

const labels = { presentation: 'Présentation personnelle', passions: 'Mes passions', plaisirs: 'Ce qui me fait plaisir', eviter: 'Mes préférences à éviter' } as const
const field = 'w-full min-w-0 rounded-xl border border-line bg-canvas p-3 text-ink'
export default function UniversEditor({ draft, onChange, avatarEnregistre = null, disabled = false }: {
  draft: MonUnivers; onChange: (value: MonUnivers) => void; avatarEnregistre?: unknown; disabled?: boolean
}) {
  const id = useId()
  let preview: UniversPartage | null = null, error = ''
  try { preview = apercuUnivers(draft, avatarEnregistre) } catch (failure) { error = failure instanceof Error ? failure.message : 'Vérifie les informations saisies.' }
  function toggle(key: PartageUnivers, value: boolean) {
    const iaCadeaux = { ...draft.iaCadeaux }
    if (!value && (UNIVERS_TEXTES as readonly string[]).includes(key)) iaCadeaux[key as typeof UNIVERS_TEXTES[number]] = false
    onChange({ ...draft, iaCadeaux, partage: { ...draft.partage, [key]: value, ...(key === 'anniversaire' && !value ? { annee: false } : {}) } })
  }
  function sharing(key: PartageUnivers, label: string) {
    return <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
      <input type="checkbox" checked={draft.partage[key]} disabled={disabled || (key === 'annee' && (!draft.partage.anniversaire || draft.valeurs.anniversaire?.annee == null))}
        onChange={event => toggle(key, event.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--color-accent)]" />
      <span>{label}</span>
    </label>
  }
  function birthday(key: 'jour' | 'mois' | 'annee', raw: string) {
    const value = raw === '' ? (key === 'annee' ? null : 0) : Number(raw)
    const date = { jour: 0, mois: 0, annee: null, ...draft.valeurs.anniversaire, [key]: value }
    onChange({ ...draft, valeurs: { ...draft.valeurs, anniversaire: date }, partage: { ...draft.partage, ...(key === 'annee' && value === null ? { annee: false } : {}) } })
  }
  return <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
    <div className="min-w-0 space-y-5">
      <fieldset disabled={disabled} className="min-w-0 space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <legend className="px-2 text-lg font-semibold text-ink">Mon identité</legend>
        <div className="flex flex-wrap gap-4">{(['prenom', 'pseudonyme'] as const).map(mode => <label key={mode} className="flex min-h-11 items-center gap-2 text-ink">
          <input name={id + '-identite'} type="radio" checked={draft.modeIdentite === mode} onChange={() => onChange({ ...draft, modeIdentite: mode })} />
          {mode === 'prenom' ? 'Prénom' : 'Pseudonyme'}
        </label>)}</div>
        <label className="block space-y-2 text-sm text-ink"><span>{draft.modeIdentite === 'prenom' ? 'Mon prénom social' : 'Mon pseudonyme'}</span>
          <input className={field} value={draft.identite} maxLength={80} autoComplete="off" onBlur={event => onChange({ ...draft, identite: event.target.value.trim() })} onChange={event => onChange({ ...draft, identite: event.target.value })} />
        </label>
        <p className="text-sm text-muted">Cette identité apparaît auprès de tes étoiles et dans les demandes que tu envoies. Ton carnet reste personnel.</p>
        {sharing('avatar', 'Partager mon avatar enregistré')}
        <p className="text-sm text-muted">Si tu actives ce partage, tes étoiles voient automatiquement ton dernier avatar enregistré. Tes essais restent privés.</p>
        {!preview?.champs.avatar && draft.partage.avatar && <p className="text-sm text-muted">Sans avatar enregistré valide, une initiale sera affichée.</p>}
        <Link href="/avatar" className="inline-flex min-h-11 items-center text-accent underline">Ouvrir mon atelier d’avatar</Link>
      </fieldset>
      <fieldset disabled={disabled} className="min-w-0 space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <legend className="px-2 text-lg font-semibold text-ink">Mes goûts</legend>
        {UNIVERS_TEXTES.map(key => <div key={key} className="space-y-1">
          <label className="block space-y-2 text-sm text-ink"><span>{labels[key]}</span><textarea rows={3} className={field + ' resize-y'} maxLength={1000}
            value={draft.valeurs[key]} onChange={event => onChange({ ...draft, valeurs: { ...draft.valeurs, [key]: event.target.value } })} /></label>
          {sharing(key, 'Partager ' + labels[key].toLowerCase())}
        </div>)}
      </fieldset>
      <fieldset disabled={disabled} className="min-w-0 space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <legend className="px-2 text-lg font-semibold text-ink">Mes informations pratiques</legend>
        <p className="text-sm text-muted">Ces champs sont saisis volontairement. Les informations de ton profil et de ton carnet ne sont pas reprises.</p>
        <div className="grid grid-cols-3 gap-2">{(['jour', 'mois', 'annee'] as const).map(key => <label key={key} className="min-w-0 space-y-2 text-sm text-ink">
          <span>{key === 'jour' ? 'Jour' : key === 'mois' ? 'Mois' : 'Année (facultative)'}</span>
          <input type="number" inputMode="numeric" min={1} max={key === 'jour' ? 31 : key === 'mois' ? 12 : 9999} className={field}
            value={draft.valeurs.anniversaire?.[key] || ''} onChange={event => birthday(key, event.target.value)} />
        </label>)}</div>
        {sharing('anniversaire', 'Partager le jour et le mois de mon anniversaire')}
        {sharing('annee', 'Partager aussi mon année de naissance')}
        {draft.valeurs.anniversaire && <button type="button" onClick={() => onChange({ ...draft, valeurs: { ...draft.valeurs, anniversaire: null }, partage: { ...draft.partage, anniversaire: false, annee: false } })}
          className="min-h-11 text-sm text-accent underline">Effacer l’anniversaire saisi</button>}
        {(['email', 'telephone'] as const).map(key => <div key={key}>
          <label className="block space-y-2 text-sm text-ink"><span>{key === 'email' ? 'Email à partager' : 'Téléphone à partager'}</span>
            <input type={key === 'email' ? 'email' : 'tel'} autoComplete="off" className={field} value={draft.valeurs[key]} maxLength={key === 'email' ? 320 : 32}
              onBlur={event => { if (key === 'email' && event.target.value) { try { onChange({ ...draft, valeurs: { ...draft.valeurs, email: emailEtoile(event.target.value) } }) } catch { /* La saisie invalide reste disponible pour correction. */ } } }}
              onChange={event => onChange({ ...draft, valeurs: { ...draft.valeurs, [key]: event.target.value } })} /></label>
          {sharing(key, key === 'email' ? 'Partager cet email' : 'Partager ce téléphone')}
        </div>)}
      </fieldset>
      <UniversCadeauxPermissions univers={draft} onChange={iaCadeaux => onChange({ ...draft, iaCadeaux })} disabled={disabled} />
    </div>
    <aside className="min-w-0 space-y-4 self-start lg:sticky lg:top-6">
      <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">Visible par toutes tes étoiles actuelles et futures. Les changements seront appliqués ensemble lors de l’enregistrement.</p>
      {preview ? <UniversView value={preview} title="Ce que mes étoiles verront après enregistrement" /> :
        <div role="status" className="rounded-xl border border-line p-4 text-sm text-ink"><p className="font-semibold">Aperçu à vérifier</p><p>{error}</p></div>}
      <p className="text-xs text-muted">Pour les cadeaux IA, seules les informations que tu autorises et que ton étoile sélectionne pour sa demande seront transmises à Mammouth AI.</p>
    </aside>
  </div>
}
