'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import BirthdayFields, { type BirthdayInput } from '@/components/BirthdayFields'
import InterestPicker from '@/components/InterestPicker'
import { supabase } from '@/lib/supabase-browser'
import { readFirstProfile, readRecoveries, invitationRpc, type FirstProfile } from '@/lib/invitation-data'
import { invitationAnswer, type InvitationRecovery } from '@/lib/invitation-contract'
import { partialBirthDate } from '@/lib/contact-quality'
import { authPage, browserAuthReturn } from '@/lib/auth-return'
import { INDICATIFS, GROUPES_INTERETS } from '@/app/invitation/[token]/interets'
import type { Json } from '@/types/database'

type Draft = BirthdayInput & { prenom: string; nom: string; interets: string[]; noteLibre: string; passionsLibre: string; indicatif: string; tel: string }
function prepare(base: FirstProfile, recovery?: InvitationRecovery): Draft {
  const data = recovery?.donnees, birthday = base.anniversaire ?? data?.anniversaire
  const catalogue = new Set(GROUPES_INTERETS.flatMap(group => group.items))
  const parts = base.passions.split(', ').filter(Boolean), structured = parts.length > 0 && parts.every(item => catalogue.has(item))
  return { prenom: base.prenom || data?.prenom || '', nom: base.nom || data?.nom || '',
    jour: birthday ? String(birthday.day) : '', mois: birthday ? String(birthday.month) : '', annee: birthday?.year ? String(birthday.year) : '',
    interets: base.passions ? structured ? parts : [] : data?.interets ?? [], passionsLibre: structured ? '' : base.passions,
    noteLibre: base.presentation || data?.noteLibre || '', indicatif: base.tel ? base.indicatif : data?.indicatif || '+33', tel: base.tel || data?.tel || '' }
}
export default function CompleterProfilPage() {
  const router = useRouter(), [owner, setOwner] = useState<string | null>(null), [base, setBase] = useState<FirstProfile | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null), [recoveries, setRecoveries] = useState<InvitationRecovery[]>([]), [selected, setSelected] = useState('')
  const [step, setStep] = useState(1), [error, setError] = useState(''), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [attempt, setAttempt] = useState(0)
  const life = useRef(false), identity = useRef<string | null>(null), locked = useRef(false), operation = useRef<{ fingerprint: string; id: string } | null>(null)
  useEffect(() => {
    life.current = true
    let current = true
    const load = async () => {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (!current) return
        if (error || !data.user) { router.replace(authPage('/connexion', browserAuthReturn())); return }
        identity.current = data.user.id
        const results = await Promise.all([readFirstProfile(data.user.id), readRecoveries(data.user.id)])
        if (!current) return
        setOwner(data.user.id); setBase(results[0]); setRecoveries(results[1]); setSelected(results[1][0]?.id ?? '')
        setDraft(prepare(results[0], results[1][0])); setLoading(false)
      } catch (failure) { if (current) { setError(failure instanceof Error ? failure.message : 'Profil indisponible.'); setLoading(false) } }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (identity.current && session?.user.id && session.user.id !== identity.current)) {
        current = false; identity.current = null; setDraft(null); setBase(null); setRecoveries([]); setOwner(null)
        router.replace(authPage('/connexion', browserAuthReturn()))
      }
    })
    void load()
    return () => { current = false; life.current = false; subscription.unsubscribe() }
  }, [router, attempt])
  function change(patch: Partial<Draft>) { setDraft(value => value ? { ...value, ...patch } : value); setError('') }
  function choose(id: string) {
    if (!base || saving) return
    if (draft && JSON.stringify(draft) !== JSON.stringify(prepare(base, recoveries.find(row => row.id === selected))) && !window.confirm('Changer de réponse remplacera ta saisie non enregistrée. Continuer ?')) return
    setSelected(id); setDraft(prepare(base, recoveries.find(row => row.id === id))); operation.current = null; setError('')
  }
  async function save() {
    if (locked.current || !draft || !base || !owner) return
    let payload
    try {
      const value = invitationAnswer({ prenom: draft.prenom, nom: draft.nom, anniversaire: partialBirthDate(draft.jour, draft.mois, draft.annee),
        relation: 'autre', interets: draft.interets, noteLibre: draft.noteLibre, email: base.email, indicatif: draft.indicatif, tel: draft.tel, conserver: false }, true)
      const passions = [draft.passionsLibre.trim(), value.interets.join(', ')].filter(Boolean).join(', ')
      if (passions.length > 1000) throw new Error('Tes passions sont trop longues (1000 caractères maximum).')
      payload = { ...value, passions, repriseIds: recoveries.map(row => row.id), empreinte: base.empreinte, revisionUnivers: base.revisionUnivers }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Vérifie les informations.'); return }
    const initiating = owner
    locked.current = true; setSaving(true); setError('')
    try {
      const fingerprint = JSON.stringify(payload)
      if (operation.current?.fingerprint !== fingerprint) operation.current = { fingerprint, id: crypto.randomUUID() }
      const result = await invitationRpc<{ ok: boolean }>('enregistrer_premier_profil', { p_operation: operation.current.id, p_donnees: payload as unknown as Json }, owner)
      if (!result.ok) throw new Error('Enregistrement non confirmé.')
      if (life.current && identity.current === initiating) router.replace(browserAuthReturn())
    } catch (failure) { if (life.current && identity.current === initiating) setError(failure instanceof Error ? failure.message : 'Enregistrement indisponible. Ta saisie est conservée.') }
    finally { locked.current = false; if (life.current) setSaving(false) }
  }
  return <AppLayout><div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:py-12 text-ink">
    <header className="space-y-2"><p className="text-sm text-accent">✨ Faisons connaissance</p><h1 className="text-3xl font-semibold">Compléter mon profil</h1><p className="text-muted">Seul ton prénom est obligatoire. Le reste peut attendre, et ton année de naissance peut rester privée.</p></header>
    {loading ? <p role="status">Nous retrouvons tes informations…</p> : draft && base ? <>
      {!!recoveries.length && <section className="space-y-3 rounded-2xl border border-accent/25 bg-action/5 p-4"><h2 className="font-semibold">Tes informations sont déjà là ✨</h2><p className="text-sm text-muted">Nous avons retrouvé une réponse envoyée avec ton e-mail vérifié. Relis-la ; tes informations déjà enregistrées sont prioritaires.</p>
        <label className="block text-sm">Réponse à reprendre<select className="mt-2 block w-full p-3" value={selected} disabled={saving} onChange={event => choose(event.target.value)}><option value="">Sans reprendre de réponse</option>{recoveries.map(row => <option value={row.id} key={row.id}>Réponse du {new Date(row.createdAt).toLocaleDateString('fr-FR')} · {row.donnees.prenom}</option>)}</select></label>
      </section>}
      <ol aria-label="Étapes du profil" className="flex gap-2 text-sm">{['Identité', 'Mes goûts', 'Coordonnées'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={'flex-1 rounded-xl border p-3 ' + (step === index + 1 ? 'border-accent text-accent' : 'border-line text-muted')}>{index + 1}. {label}</li>)}</ol>
      <form className="space-y-5 rounded-3xl border border-line bg-surface p-5 sm:p-7" onSubmit={event => { event.preventDefault(); if (step < 3) setStep(value => value + 1); else void save() }}>
        <fieldset disabled={saving} className="min-w-0 space-y-5">
          {step === 1 && <><h2 className="text-xl font-semibold">Comment t’appelles-tu ?</h2>
            <label className="block text-sm">Prénom <span className="text-accent">*</span><input className="mt-2 block w-full p-3" value={draft.prenom} maxLength={80} required autoComplete="given-name" onChange={event => change({ prenom: event.target.value })} /></label>
            <label className="block text-sm">Nom (facultatif)<input className="mt-2 block w-full p-3" value={draft.nom} maxLength={80} autoComplete="family-name" onChange={event => change({ nom: event.target.value })} /></label>
            <BirthdayFields value={draft} onChange={change} disabled={!!base.anniversaire} />
            {!!base.anniversaire && <p className="text-sm text-muted">Cet anniversaire est déjà enregistré. Tu pourras le modifier dans Dates.</p>}
          </>}
          {step === 2 && <><h2 className="text-xl font-semibold">Qu’est-ce qui te fait plaisir ?</h2><p className="text-sm text-muted">Ces informations complètent tes goûts dans Mon profil. Aucun partage ni envoi à une IA n’est activé pour un nouveau profil.</p>
            <InterestPicker value={draft.interets} onChange={interets => change({ interets })} disabled={saving} />
            {!!draft.passionsLibre && <label className="block text-sm">Tes passions déjà enregistrées<textarea className="mt-2 block w-full p-3" rows={3} value={draft.passionsLibre} maxLength={1000} onChange={event => change({ passionsLibre: event.target.value })} /></label>}
            <label className="block text-sm">Autre chose à ajouter ? (facultatif)<textarea className="mt-2 block w-full p-3" rows={3} maxLength={1000} value={draft.noteLibre} onChange={event => change({ noteLibre: event.target.value })} placeholder="Ce qui te ressemble, ce qui te fait plaisir…" /></label>
          </>}
          {step === 3 && <><h2 className="text-xl font-semibold">Tout est prêt, {draft.prenom}</h2>
            <label className="block text-sm">E-mail de ton compte<input className="mt-2 block w-full p-3" type="email" value={base.email} disabled /></label>
            <label className="block text-sm" htmlFor="profil-telephone">Téléphone (facultatif)</label><div className="flex gap-2">
              <select aria-label="Indicatif téléphonique" className="w-28 shrink-0 p-3" value={draft.indicatif} onChange={event => change({ indicatif: event.target.value })}>{!INDICATIFS.some(row=>row.code===draft.indicatif)&&<option value={draft.indicatif}>{draft.indicatif}</option>}{INDICATIFS.map(row => <option key={row.code} value={row.code}>{row.code}</option>)}</select>
              <input id="profil-telephone" className="min-w-0 flex-1 p-3" type="tel" inputMode="tel" autoComplete="tel-national" value={draft.tel} maxLength={31} onChange={event => change({ tel: event.target.value })} />
            </div>
            <dl className="space-y-2 rounded-2xl border border-line p-4 text-sm"><div><dt className="text-muted">Identité</dt><dd>{draft.prenom} {draft.nom}</dd></div><div><dt className="text-muted">Anniversaire</dt><dd>{draft.jour && draft.mois ? draft.jour + '/' + draft.mois + (draft.annee ? '/' + draft.annee : ' · année privée') : 'Non renseigné'}</dd></div><div><dt className="text-muted">Mes goûts</dt><dd className="break-words">{[draft.passionsLibre, draft.interets.join(', ')].filter(Boolean).join(', ') || 'À compléter plus tard'}</dd></div></dl>
            <p className="text-sm text-muted">Tes informations seront modifiables dans Mon profil ; ton anniversaire reste aussi dans Dates. Une coordonnée ou date remplacée ne sera pas partagée automatiquement. Les autres choix de partage restent conservés.</p>
          </>}
        </fieldset>
        <div className="flex flex-wrap gap-3">{step > 1 && <button type="button" disabled={saving} className="min-h-11 rounded-xl border border-line px-4 py-3" onClick={() => setStep(value => value - 1)}>← Retour</button>}
          <button type="submit" disabled={saving || !draft.prenom.trim()} className="min-h-11 flex-1 rounded-xl bg-action px-4 py-3 font-semibold text-on-action disabled:opacity-50">{saving ? 'Enregistrement…' : step === 3 ? 'Enregistrer et continuer ✨' : 'Continuer'}</button>
          {step === 2 && <button type="button" className="min-h-11 underline" disabled={saving} onClick={() => setStep(3)}>Compléter mes goûts plus tard</button>}
        </div>
      </form>
    </> : null}
    {error && <div role="alert" className="space-y-2 rounded-2xl border border-red-400/30 p-4 text-danger"><p>{error}</p><button className="min-h-11 underline" disabled={saving} onClick={() => { if (draft && !window.confirm('Relire remplacera ta saisie non enregistrée. Continuer ?')) return; setError(''); setLoading(true); setAttempt(value => value + 1) }}>Relire les informations enregistrées</button></div>}
  </div></AppLayout>
}
