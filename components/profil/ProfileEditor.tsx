'use client'
import { useId, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import BirthdayFields from '@/components/BirthdayFields'
import InterestPicker from '@/components/InterestPicker'
import UniversView from '@/components/univers/UniversView'
import { INDICATIFS_PAYS } from '@/lib/constants'
import type { ChampIACadeaux } from '@/lib/cadeaux-social-contract'
import { apercuProfil, profilAvecPartage, profilToutAutorise, passionsProfil, reunirPassions, type ProfilUnifie } from '@/lib/profile-contract'
import type { PartageUnivers } from '@/lib/univers-contract'

const field = 'mt-2 block w-full min-w-0 p-3'
const panel = 'min-w-0 rounded-3xl border border-line bg-surface p-4 sm:p-5'
const summary = 'cursor-pointer rounded-xl py-2 text-lg font-semibold text-ink focus-visible:outline-2 focus-visible:outline-accent'
const labels: Record<PartageUnivers, string> = { presentation: 'Présentation personnelle', passions: 'Mes passions', plaisirs: 'Ce qui me fait plaisir', eviter: 'Mes préférences à éviter', anniversaire: 'Jour et mois de mon anniversaire', annee: 'Année de naissance', email: 'E-mail', telephone: 'Téléphone', avatar: 'Avatar enregistré' }
const tabs = [{ id: 'identite', label: 'Identité et anniversaire' }, { id: 'gouts', label: 'Mes goûts' }] as const
type ProfileTab = typeof tabs[number]['id']

export default function ProfileEditor({ draft, onChange, disabled, avatar }: { draft: ProfilUnifie; onChange: (value: ProfilUnifie) => void; disabled: boolean; avatar?: unknown }) {
  const id = useId(), tastes = passionsProfil(draft.valeurs.passions), b = draft.valeurs.anniversaire
  const [activeTab, setActiveTab] = useState<ProfileTab>('identite')
  let preview = null, previewError = ''
  try { preview = apercuProfil(draft, avatar) } catch (cause) { previewError = cause instanceof Error ? cause.message : 'Vérifie les champs saisis.' }
  function sharing(key: PartageUnivers, checked: boolean) {
    const iaCadeaux = { ...draft.iaCadeaux }
    if (!checked && key in iaCadeaux) iaCadeaux[key as ChampIACadeaux] = false
    onChange({ ...draft, iaCadeaux, partage: { ...draft.partage, [key]: checked, ...(key === 'anniversaire' && !checked ? { annee: false } : {}) } })
  }
  function shareConsent(key: PartageUnivers | 'nom') {
    const unavailable = !draft.partageActif || (key === 'anniversaire' && !b) || (key === 'annee' && (!draft.partage.anniversaire || b?.annee == null))
    return <label className="flex min-h-11 shrink-0 items-center gap-2 text-xs text-muted">
      <input type="checkbox" className="h-4 w-4 shrink-0" aria-label={'Étoiles : ' + (key === 'nom' ? 'Nom de famille' : labels[key])} disabled={disabled || !!unavailable} checked={key === 'nom' ? draft.partageNom : draft.partage[key]} onChange={e => key === 'nom' ? onChange({ ...draft, partageNom: e.target.checked }) : sharing(key, e.target.checked)} />Étoiles
    </label>
  }
  function aiConsent(key: ChampIACadeaux, label: string) {
    const allowed = draft.partageActif && (key === 'identite' || draft.partage[key])
    return <label className="flex min-h-11 shrink-0 items-center gap-2 text-xs text-muted">
      <input type="checkbox" className="h-4 w-4 shrink-0" aria-label={'Autoriser : ' + label} aria-describedby={id + '-ai-notice'} disabled={disabled || !allowed} checked={allowed && draft.iaCadeaux[key]} onChange={e => onChange({ ...draft, iaCadeaux: { ...draft.iaCadeaux, [key]: e.target.checked } })} />IA cadeaux
    </label>
  }
  function revealInvalid(tab: ProfileTab, event: FormEvent<HTMLElement>) {
    // Rendre le champ visible avant que la validation native tente de lui donner le focus.
    flushSync(() => setActiveTab(tab))
    let details = (event.target as HTMLElement).closest('details')
    while (details) { details.open = true; details = details.parentElement?.closest('details') ?? null }
  }
  return <div className="min-w-0 space-y-4">
    <fieldset disabled={disabled} className={panel}>
      <legend className="px-2 text-base font-semibold">Mes autorisations</legend>
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input className="h-5 w-5 shrink-0" type="checkbox" checked={draft.partageActif} onChange={e => onChange(profilAvecPartage(draft, e.target.checked))} />Partager mes informations avec mes étoiles</label>
        <button type="button" className="min-h-11 rounded-xl border border-line px-3 text-sm text-accent" onClick={() => onChange(profilToutAutorise(draft))}>Tout autoriser</button>
      </div>
      <details className="mt-2 rounded-2xl border border-line p-3 text-xs text-muted">
        <summary className="cursor-pointer rounded-lg py-1 font-medium text-accent focus-visible:outline-2 focus-visible:outline-accent">Comprendre mes accords Étoiles et IA</summary>
        <p className="mt-2">Étoiles : visible par tes étoiles actuelles et futures. IA cadeaux : utilisable pour leurs suggestions. Tes choix s’appliquent après enregistrement. Décocher un partage retire aussi son accord IA. Réactiver le partage ne rétablit pas les accords IA retirés.</p>
      </details>
      {!draft.partageActif && <p className="mt-2 text-xs text-muted">Les critères sont mémorisés, les renseignements facultatifs masqués et les accords IA retirés. Ton prénom ou pseudonyme reste visible.</p>}
    </fieldset>
    <div role="tablist" aria-label="Rubriques de mon profil" className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface p-2">
      {tabs.map(tab => <button key={tab.id} type="button" role="tab" id={id + '-tab-' + tab.id} aria-controls={id + '-panel-' + tab.id} aria-selected={activeTab === tab.id} tabIndex={activeTab === tab.id ? 0 : -1} disabled={disabled} data-profile-tab={tab.id}
        onClick={() => setActiveTab(tab.id)} onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const next = event.key === 'Home' ? 'identite' : event.key === 'End' ? 'gouts' : activeTab === 'identite' ? 'gouts' : 'identite'
          setActiveTab(next)
          event.currentTarget.parentElement?.querySelector<HTMLButtonElement>('[data-profile-tab="' + next + '"]')?.focus()
        }}
        className={'min-h-12 min-w-0 rounded-xl px-2 py-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 motion-reduce:transition-none sm:px-4 ' + (activeTab === tab.id ? 'bg-action text-on-action' : 'text-muted hover:bg-action/10 hover:text-ink')}>
        {tab.label}
      </button>)}
    </div>
    <section role="tabpanel" id={id + '-panel-identite'} aria-labelledby={id + '-tab-identite'} hidden={activeTab !== 'identite'} tabIndex={0} onInvalidCapture={event => revealInvalid('identite', event)} className={panel + ' focus-visible:outline-2 focus-visible:outline-accent'}>
      <fieldset disabled={disabled} className="min-w-0 space-y-4">
        <legend className="sr-only">Mes renseignements personnels</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Prénom <span className="text-accent">*</span><input className={field} required maxLength={80} autoComplete="given-name" value={draft.prenom} onChange={e => onChange({ ...draft, prenom: e.target.value, identite: draft.modeIdentite === 'prenom' ? e.target.value.trim() || 'Une étoile' : draft.identite })} /></label>
          <div><div className="flex flex-wrap items-center justify-between gap-x-3"><label htmlFor={id + '-surname'} className="text-sm">Nom (facultatif)</label>{shareConsent('nom')}</div><input id={id + '-surname'} className={field} maxLength={80} autoComplete="family-name" value={draft.nom} onChange={e => onChange({ ...draft, nom: e.target.value })} /></div>
        </div>
        <div><div className="flex flex-wrap items-center justify-between gap-x-3"><label htmlFor={id + '-identity'} className="text-sm">Mon identité auprès de mes étoiles</label>{aiConsent('identite', 'Prénom ou pseudonyme')}</div>
          <select id={id + '-identity'} className={field} value={draft.modeIdentite} onChange={e => onChange({ ...draft, modeIdentite: e.target.value as ProfilUnifie['modeIdentite'], identite: e.target.value === 'prenom' ? draft.prenom.trim() || 'Une étoile' : draft.identite })}><option value="prenom">Mon prénom</option><option value="pseudonyme">Un pseudonyme</option></select>
        </div>
        {draft.modeIdentite === 'pseudonyme' && <label className="block text-sm">Pseudonyme<input className={field} required maxLength={80} autoComplete="off" value={draft.identite} onChange={e => onChange({ ...draft, identite: e.target.value })} /></label>}
        <div><p className="text-sm">Mon anniversaire</p><div className="flex flex-wrap gap-x-4">
          <div className="flex items-center gap-2 text-xs text-muted"><span>Jour et mois</span>{shareConsent('anniversaire')}</div>
          <div className="flex items-center gap-2 text-xs text-muted"><span>Année</span>{shareConsent('annee')}</div>
        </div>
          <BirthdayFields value={{ jour: b?.jour ? String(b.jour) : '', mois: b?.mois ? String(b.mois) : '', annee: b?.annee ? String(b.annee) : '' }} disabled={disabled} onChange={v => {
            const birth = !v.jour && !v.mois && !v.annee ? null : { jour: Number(v.jour), mois: Number(v.mois), annee: v.annee ? Number(v.annee) : null }
            onChange({ ...draft, valeurs: { ...draft.valeurs, anniversaire: birth }, partage: { ...draft.partage, ...(!birth ? { anniversaire: false, annee: false } : birth.annee === null ? { annee: false } : {}) } })
          }} />
          {b && <button type="button" className="min-h-11 text-xs text-accent underline" onClick={() => onChange({ ...draft, valeurs: { ...draft.valeurs, anniversaire: null }, partage: { ...draft.partage, anniversaire: false, annee: false } })}>Effacer mon anniversaire du profil</button>}
          <p className="text-xs text-muted">Anniversaire commun avec Dates ; historique conservé si tu l’effaces.</p>
        </div>
        <details className="rounded-2xl border border-line p-3"><summary className="cursor-pointer py-1 text-sm font-medium">Coordonnées et avatar</summary>
          <div className="mt-3 space-y-3">
            <div><div className="flex flex-wrap items-center justify-between gap-x-3"><label htmlFor={id + '-email'} className="text-sm">E-mail vérifié de mon compte</label>{shareConsent('email')}</div><input id={id + '-email'} className={field} type="email" value={draft.valeurs.email} disabled autoComplete="email" /></div>
            <div><div className="flex flex-wrap items-center justify-between gap-x-3"><label htmlFor={id + '-phone'} className="text-sm">Téléphone (facultatif)</label>{shareConsent('telephone')}</div><div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <select aria-label="Indicatif téléphonique" className="min-w-0 p-3 sm:w-44" value={draft.indicatif} onChange={e => onChange({ ...draft, indicatif: e.target.value, valeurs: { ...draft.valeurs, telephone: draft.tel ? e.target.value + draft.tel : '' } })}>
                {!INDICATIFS_PAYS.some(p => p.code === draft.indicatif) && <option value={draft.indicatif}>International ({draft.indicatif})</option>}
                {INDICATIFS_PAYS.map(p => <option key={p.code} value={p.code}>{p.pays} · {p.code}</option>)}
              </select><input id={id + '-phone'} className="min-w-0 flex-1 p-3" inputMode="tel" type="tel" autoComplete="tel-national" maxLength={31} value={draft.tel} onChange={e => { const tel = e.target.value.replace(/\D/g, ''); onChange({ ...draft, tel, valeurs: { ...draft.valeurs, telephone: tel ? draft.indicatif + tel : '' } }) }} />
            </div></div>
            <div className="flex flex-wrap items-center justify-between gap-x-3"><Link aria-label="Personnaliser mon avatar" className="inline-flex min-h-11 items-center text-sm text-accent underline" href="/avatar">Personnaliser mon avatar</Link>{shareConsent('avatar')}</div>
            <Link className="inline-flex min-h-11 items-center text-sm text-accent underline" href="/dashboard/calendrier">Mes autres dates personnelles</Link>
          </div>
        </details>
      </fieldset>
    </section>
    <section role="tabpanel" id={id + '-panel-gouts'} aria-labelledby={id + '-tab-gouts'} hidden={activeTab !== 'gouts'} tabIndex={0} onInvalidCapture={event => revealInvalid('gouts', event)} className={panel + ' focus-visible:outline-2 focus-visible:outline-accent'}>
      <fieldset disabled={disabled} className="min-w-0 space-y-4">
        <legend className="sr-only">Mes goûts et leurs autorisations</legend>
        <div><div className="flex flex-wrap items-center justify-between gap-x-3"><p className="text-sm font-medium text-ink">Mes passions</p><div className="flex flex-wrap items-center gap-x-3">{shareConsent('passions')}{aiConsent('passions', 'Passions')}</div></div>
          {!!tastes.interets.length && <div className="mt-1 flex flex-wrap gap-2" aria-label="Mes passions sélectionnées">{tastes.interets.map(item => <span key={item} className="rounded-full border border-accent/40 bg-action/10 px-3 py-1 text-sm text-ink">{item}</span>)}</div>}
          <details className="mt-2 rounded-2xl border border-line p-3"><summary className="cursor-pointer py-1 text-sm font-medium text-accent">Choisir mes passions{tastes.interets.length ? ` (${tastes.interets.length})` : ''}</summary>
            <div className="mt-3"><InterestPicker value={tastes.interets} onChange={v => onChange({ ...draft, valeurs: { ...draft.valeurs, passions: reunirPassions(v, tastes.libre) } })} disabled={disabled} /></div>
          </details>
          <label className="mt-3 block text-sm">Autres passions<textarea className={field} rows={2} maxLength={1000} value={tastes.libre} onChange={e => onChange({ ...draft, valeurs: { ...draft.valeurs, passions: reunirPassions(tastes.interets, e.target.value) } })} /></label>
          <p className="mt-1 text-xs text-muted">Les deux cases concernent toutes tes passions, y compris le texte libre.</p>
        </div>
        {(['presentation', 'plaisirs', 'eviter'] as const).map(key => <div key={key}>
          <div className="flex flex-wrap items-center justify-between gap-x-3"><label htmlFor={id + '-' + key} className="text-sm font-medium text-ink">{labels[key]}</label><div className="flex flex-wrap items-center gap-x-3">{shareConsent(key)}{aiConsent(key, key === 'presentation' ? 'Présentation' : key === 'plaisirs' ? 'Ce qui me fait plaisir' : 'Préférences à éviter')}</div></div>
          <textarea id={id + '-' + key} className={field} rows={2} maxLength={1000} value={draft.valeurs[key]} onChange={e => onChange({ ...draft, valeurs: { ...draft.valeurs, [key]: e.target.value } })} />
        </div>)}
      </fieldset>
    </section>
    <details id={id + '-ai-notice'} className="rounded-2xl border border-line bg-surface p-4 text-xs text-muted">
      <summary className="cursor-pointer rounded-lg py-1 text-sm font-medium text-accent focus-visible:outline-2 focus-visible:outline-accent">IA cadeaux : fonctionnement et confidentialité</summary>
      <div className="mt-3 space-y-2">
        <p>« IA cadeaux » autorise tes étoiles à transmettre les textes cochés à Mammouth AI pour leurs idées cadeaux, y compris tes prochaines modifications enregistrées. Chaque étoile choisit les informations à chaque demande. Nom, coordonnées, anniversaire et avatar structurés sont exclus ; ces accords ne concernent pas les messages IA.</p>
        <p>Les textes sont transmis tels quels : vérifie leur contenu. Retirer une case Étoiles retire aussi son accord IA. Désactiver le partage général retire tous les accords IA ; le réactiver ne les rétablit pas. Retirer ton accord empêche les prochaines demandes, sans annuler les données déjà transmises.</p>
      </div>
    </details>
    <details className={panel}><summary className={summary}>Aperçu pour mes étoiles</summary><aside className="mt-3 min-w-0">
      {preview ? <UniversView value={preview} title="Ce que mes étoiles verront après enregistrement" /> : <p role="status" className="text-sm">Aperçu à vérifier : {previewError}</p>}
    </aside></details>
  </div>
}
