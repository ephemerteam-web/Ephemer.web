'use client'
import { useId } from 'react'
import Link from 'next/link'
import BirthdayFields from '@/components/BirthdayFields'
import InterestPicker from '@/components/InterestPicker'
import UniversView from '@/components/univers/UniversView'
import { INDICATIFS_PAYS } from '@/lib/constants'
import type { ChampIACadeaux } from '@/lib/cadeaux-social-contract'
import { apercuProfil, profilAvecPartage, passionsProfil, reunirPassions, type ProfilUnifie } from '@/lib/profile-contract'
import type { PartageUnivers } from '@/lib/univers-contract'
const field = 'mt-2 block w-full min-w-0 p-3'
const labels: Record<PartageUnivers,string> = { presentation:'Présentation personnelle', passions:'Mes passions', plaisirs:'Ce qui me fait plaisir', eviter:'Mes préférences à éviter', anniversaire:'Jour et mois de mon anniversaire', annee:'Année de naissance', email:'E-mail', telephone:'Téléphone', avatar:'Avatar enregistré' }
export default function ProfileEditor({ draft, onChange, disabled, avatar }: { draft: ProfilUnifie; onChange:(value:ProfilUnifie)=>void; disabled:boolean; avatar?:unknown }) {
  const id = useId()
  const tastes = passionsProfil(draft.valeurs.passions)
  let preview = null, previewError = ''
  try { preview = apercuProfil(draft,avatar) } catch (cause) { previewError = cause instanceof Error ? cause.message : 'Vérifie les champs saisis.' }
  function sharing(key:PartageUnivers,checked:boolean) {
    const iaCadeaux = { ...draft.iaCadeaux }
    if (!checked && key in iaCadeaux) iaCadeaux[key as keyof typeof iaCadeaux] = false
    onChange({ ...draft, iaCadeaux, partage:{ ...draft.partage,[key]:checked,...(key==='anniversaire'&&!checked?{annee:false}:{}) } })
  }
  function aiConsent(key:ChampIACadeaux,label:string) {
    const allowed = draft.partageActif && (key==='identite' || draft.partage[key])
    return <label className="flex min-h-11 shrink-0 items-center gap-2 text-xs text-muted">
      <input type="checkbox" className="h-4 w-4 shrink-0" aria-label={'Autoriser : '+label} aria-describedby={id+'-ai-notice'} disabled={disabled||!allowed} checked={allowed&&draft.iaCadeaux[key]} onChange={e=>onChange({...draft,iaCadeaux:{...draft.iaCadeaux,[key]:e.target.checked}})}/>
      IA cadeaux
    </label>
  }
  const b = draft.valeurs.anniversaire
  return <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)]">
    <div className="min-w-0 space-y-5">
      <fieldset disabled={disabled} className="min-w-0 space-y-5 rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <legend className="px-2 text-xl font-semibold">Identité et anniversaire</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Prénom <span className="text-accent">*</span><input className={field} required maxLength={80} autoComplete="given-name" value={draft.prenom} onChange={e=>onChange({...draft,prenom:e.target.value,identite:draft.modeIdentite==='prenom'?e.target.value.trim()||'Une étoile':draft.identite})}/></label>
          <label className="text-sm">Nom (facultatif)<input className={field} maxLength={80} autoComplete="family-name" value={draft.nom} onChange={e=>onChange({...draft,nom:e.target.value})}/></label>
        </div>
        <BirthdayFields value={{jour:b?.jour?String(b.jour):'',mois:b?.mois?String(b.mois):'',annee:b?.annee?String(b.annee):''}} disabled={disabled} onChange={v=>{
          const birth = !v.jour&&!v.mois&&!v.annee?null:{jour:Number(v.jour),mois:Number(v.mois),annee:v.annee?Number(v.annee):null}
          onChange({...draft,valeurs:{...draft.valeurs,anniversaire:birth},partage:{...draft.partage,...(!birth?{anniversaire:false,annee:false}:birth.annee===null?{annee:false}:{})}})
        }}/>
        {b && <button type="button" className="min-h-11 text-sm text-accent underline" onClick={()=>onChange({...draft,valeurs:{...draft.valeurs,anniversaire:null},partage:{...draft.partage,anniversaire:false,annee:false}})}>Effacer mon anniversaire du profil</button>}
        <p className="text-xs text-muted">L’anniversaire est commun avec Dates. Son historique reste conservé si tu l’effaces ici.</p>
        <label className="block text-sm">E-mail vérifié de mon compte<input className={field} type="email" value={draft.valeurs.email} disabled autoComplete="email"/></label>
        <div className="space-y-2"><label htmlFor="profile-phone" className="text-sm">Téléphone (facultatif)</label><div className="flex flex-col gap-2 sm:flex-row">
          <select aria-label="Indicatif téléphonique" className="min-w-0 p-3 sm:w-44" value={draft.indicatif} onChange={e=>onChange({...draft,indicatif:e.target.value,valeurs:{...draft.valeurs,telephone:draft.tel?e.target.value+draft.tel:''}})}>
            {!INDICATIFS_PAYS.some(p=>p.code===draft.indicatif)&&<option value={draft.indicatif}>International ({draft.indicatif})</option>}
            {INDICATIFS_PAYS.map(p=><option key={p.code} value={p.code}>{p.pays} · {p.code}</option>)}
          </select><input id="profile-phone" className="min-w-0 flex-1 p-3" inputMode="tel" type="tel" autoComplete="tel-national" maxLength={31} value={draft.tel} onChange={e=>{const tel=e.target.value.replace(/\D/g,'');onChange({...draft,tel,valeurs:{...draft.valeurs,telephone:tel?draft.indicatif+tel:''}})}}/>
        </div></div>
        <Link aria-label="Personnaliser mon avatar" className="inline-flex min-h-11 items-center text-sm text-accent underline" href="/avatar">Personnaliser mon avatar</Link>
        <Link className="ml-4 inline-flex min-h-11 items-center text-sm text-accent underline" href="/dashboard/calendrier">Mes autres dates personnelles</Link>
      </fieldset>
      <fieldset disabled={disabled} className="min-w-0 space-y-5 rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <legend className="px-2 text-xl font-semibold">Mes goûts</legend>
        <div className="flex flex-wrap items-center justify-between gap-x-3"><p className="text-sm font-medium">Mes passions</p>{aiConsent('passions','Passions')}</div>
        <InterestPicker value={tastes.interets} onChange={v=>onChange({...draft,valeurs:{...draft.valeurs,passions:reunirPassions(v,tastes.libre)}})} disabled={disabled}/>
        <label className="block text-sm">Autres passions<textarea className={field} rows={2} maxLength={1000} value={tastes.libre} onChange={e=>onChange({...draft,valeurs:{...draft.valeurs,passions:reunirPassions(tastes.interets,e.target.value)}})}/></label>
        {(['presentation','plaisirs','eviter'] as const).map(key=><div key={key}>
          <div className="flex flex-wrap items-center justify-between gap-x-3"><label htmlFor={id+'-'+key} className="text-sm">{labels[key]}</label>{aiConsent(key,key==='presentation'?'Présentation':key==='plaisirs'?'Ce qui me fait plaisir':'Préférences à éviter')}</div>
          <textarea id={id+'-'+key} className={field} rows={3} maxLength={1000} value={draft.valeurs[key]} onChange={e=>onChange({...draft,valeurs:{...draft.valeurs,[key]:e.target.value}})}/>
        </div>)}
        <div id={id+'-ai-notice'} className="space-y-2 rounded-2xl border border-line bg-canvas/50 p-4 text-xs text-muted">
          <p className="text-sm font-medium text-ink">Idées cadeaux avec Mammouth AI</p>
          <p>Les cases « IA cadeaux » autorisent tes étoiles à utiliser ces informations pour leurs idées cadeaux via Mammouth AI, y compris leurs futures modifications enregistrées. Active d’abord leur partage dans le bloc ci-dessous ; chaque étoile choisit les informations à chaque demande.</p>
          <p>Les textes cochés sont transmis tels quels : vérifie leur contenu. Retirer ton accord empêche les prochaines demandes, sans annuler les données déjà transmises. Nom, coordonnées, anniversaire et avatar restent exclus. Ces accords ne concernent pas les messages IA.</p>
        </div>
      </fieldset>
      <fieldset disabled={disabled} className="min-w-0 space-y-4 rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <legend className="px-2 text-xl font-semibold">Partage avec mes étoiles</legend>
        <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-accent/30 bg-action/5 p-4 font-medium"><input className="h-5 w-5 shrink-0" type="checkbox" checked={draft.partageActif} onChange={e=>onChange(profilAvecPartage(draft,e.target.checked))}/>Partager mes informations avec mes étoiles</label>
        <p className="text-sm text-muted">Mêmes choix pour toutes tes étoiles actuelles et futures. Les changements s’appliquent à l’enregistrement.</p>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-x-3"><label htmlFor={id+'-identity'} className="text-sm">Mon identité auprès de mes étoiles</label>{aiConsent('identite','Prénom ou pseudonyme')}</div>
          <select id={id+'-identity'} className={field} value={draft.modeIdentite} onChange={e=>onChange({...draft,modeIdentite:e.target.value as ProfilUnifie['modeIdentite'],identite:e.target.value==='prenom'?draft.prenom.trim()||'Une étoile':draft.identite})}><option value="prenom">Mon prénom</option><option value="pseudonyme">Un pseudonyme</option></select>
        </div>
        {draft.modeIdentite==='pseudonyme'&&<label className="block text-sm">Pseudonyme<input className={field} required maxLength={80} autoComplete="off" value={draft.identite} onChange={e=>onChange({...draft,identite:e.target.value})}/></label>}
        <p className="text-xs text-muted">Cette identité minimale reste visible pour t’identifier, même lorsque le partage est désactivé.</p>
        <div className="grid gap-1 sm:grid-cols-2">
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.partageNom} disabled={!draft.partageActif} onChange={e=>onChange({...draft,partageNom:e.target.checked})}/>Nom de famille</label>
          {(Object.keys(labels) as PartageUnivers[]).map(key=><label key={key} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.partage[key]} disabled={!draft.partageActif||(key==='anniversaire'&&!b)||(key==='annee'&&(!draft.partage.anniversaire||!b?.annee))} onChange={e=>sharing(key,e.target.checked)}/>{labels[key]}</label>)}
        </div>
        {!draft.partageActif&&<p className="text-sm text-muted">Les critères sont mémorisés. Aucune information facultative ne sera visible après enregistrement.</p>}
      </fieldset>
    </div>
    <aside className="min-w-0 space-y-3 self-start lg:sticky lg:top-6">
      {preview?<UniversView value={preview} title="Ce que mes étoiles verront après enregistrement"/>:<p role="status" className="rounded-2xl border border-line p-4 text-sm">Aperçu à vérifier : {previewError}</p>}
      <p className="text-xs text-muted">Tes informations personnelles restent privées tant que tu n’actives pas leur partage.</p>
    </aside>
  </div>
}
