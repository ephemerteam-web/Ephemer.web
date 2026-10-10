'use client'
import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import { useDashboardUser } from './DashboardUserContext'
import { usePersonalEvents } from '@/lib/hooks/usePersonalEvents'
import { supabase } from '@/lib/supabase-browser'
import { nameDays } from '@/lib/name-days'
import { parisDay, parseLocalDay } from '@/lib/calendar-day'
import { eventLabels, shiftDay, type EventView, type PersonalEvent } from '@/lib/personal-events'
import type { Contact, Json } from '@/types/database'
import Link from 'next/link'
import ShareImageButton from './ShareImageButton'
import { eventImageFields } from '@/lib/image-projections'

const input = 'block min-h-11 w-full rounded-lg border border-line bg-surface p-2 text-ink'
export function EventAgenda({ views, title = 'Dates personnelles' }: { views: EventView[]; title?: string }) {
  return <section className="my-4 space-y-2"><h2 className="font-bold">{title}</h2>
    {!views.length && <p className="text-muted">Aucun événement pour cette période.</p>}
    {views.map(view => <div key={view.key} className="rounded-xl border border-line p-3">
      <p>{parseLocalDay(view.date).toLocaleDateString('fr-FR')} · {view.title}</p>
      <p className="text-sm text-muted">{view.contact ? `${view.contact.prenom ?? ''} ${view.contact.nom ?? ''}` : 'Ma date'}{view.age !== null ? ` · ${view.age} ans` : ''}{!view.reminder && view.event ? ' · Rappels suspendus' : ''}</p>
      {view.occurrence && <Link className="inline-flex min-h-11 items-center text-sm text-accent underline" href={'/dashboard/preparer/' + view.occurrence.id}>Préparer cet événement</Link>}
      <ShareImageButton title={view.title} fields={eventImageFields(view)} />
    </div>)}
  </section>
}

export default function PersonalDates({ contacts, contactId, onSaved }: { contacts: Contact[]; contactId?: number; onSaved?: () => void }) {
  const user = useDashboardUser()
  const [open, setOpen] = useState(false)
  const today = parisDay()
  const state = usePersonalEvents(shiftDay(today, -365), shiftDay(today, 399))
  const [selfName, setSelfName] = useState(user.prenom ?? '')
  const [selected, setSelected] = useState<PersonalEvent | null>(null)
  const [person, setPerson] = useState(contactId === undefined ? '' : String(contactId))
  const [kind, setKind] = useState('anniversaire')
  const [title, setTitle] = useState('')
  const [annual, setAnnual] = useState(false)
  const [date, setDate] = useState('')
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [feast, setFeast] = useState('')
  const [since, setSince] = useState(today.slice(0, 4))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const identity = useRef(user.id)
  useEffect(() => { identity.current = user.id }, [user.id])
  const mounted = useRef(true)
  const creationId = useRef<string | null>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    let active = true
    if (open) supabase.from('profiles').select('prenom').eq('id', user.id).maybeSingle().then(({ data, error }) => {
      if (active) { if (error) setError('Impossible de lire ton prénom. Réessaie avant de choisir ta fête.'); else setSelfName(data?.prenom ?? '') }
    })
    return () => { active = false }
  }, [open, user.id])
  const personName = person ? contacts.find(contact => String(contact.id) === person)?.prenom ?? '' : selfName
  const choices = nameDays(personName)
  const fixedAnnual = kind === 'anniversaire' || kind === 'fete_prenomale'
  function reset() { creationId.current = null; setSelected(null); setTitle(''); setDate(''); setDay(''); setMonth(''); setBirthYear(''); setFeast(''); setAnnual(false); setSince(today.slice(0, 4)) }
  function edit(event: PersonalEvent) {
    const rule = state.data?.rules.filter(row => row.evenement_id === event.id && !row.retiree && row.debut_cycle <= Number(today.slice(0, 4)) && (row.fin_cycle === null || row.fin_cycle >= Number(today.slice(0, 4)))).sort((a, b) => b.debut_cycle - a.debut_cycle)[0]
      ?? state.data?.rules.filter(row => row.evenement_id === event.id && !row.retiree).sort((a, b) => b.debut_cycle - a.debut_cycle)[0]
    setSelected(event); setKind(event.type_evenement); setPerson(event.contact_id === null ? '' : String(event.contact_id)); setTitle(event.titre)
    setAnnual(event.recurrence === 'annuelle'); setDay(String(rule?.jour ?? '')); setMonth(String(rule?.mois ?? '')); setBirthYear(String(rule?.annee_naissance ?? ''))
    setDate(rule?.date_ponctuelle ?? (rule?.jour && rule?.mois ? `${Math.max(Number(today.slice(0, 4)), rule.debut_cycle)}-${String(rule.mois).padStart(2, '0')}-${String(rule.jour).padStart(2, '0')}` : ''))
    setFeast(rule?.jour && rule?.mois ? `${String(rule.mois).padStart(2, '0')}-${String(rule.jour).padStart(2, '0')}` : '')
    setSince(today.slice(0, 4)); setError(''); setNotice('')
  }
  async function action(run: () => PromiseLike<{ error: unknown }>, message: string, clear = false) {
    if (busy) return
    const owner = user.id
    setBusy(true); setError(''); setNotice('')
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error || data.user?.id !== owner || identity.current !== owner) throw new Error('La session a changé. Recharge la page.')
      const response = await run()
      if (response.error) throw new Error('Enregistrement refusé. Vérifie les dates ou recharge si cette fiche a changé ailleurs. La saisie est conservée.')
      if (mounted.current && identity.current === owner) { state.retry(); onSaved?.(); setNotice(message); if (clear) reset() }
    } catch (cause) { if (mounted.current && identity.current === owner) setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.') }
    finally { if (mounted.current && identity.current === owner) setBusy(false) }
  }
  return <>
    <button className="min-h-11 rounded-lg border border-line px-3" onClick={() => setOpen(true)}>Gérer les dates personnelles</button>
    <Modal open={open} onClose={() => { if (!busy) setOpen(false) }} title="Dates personnelles" className="w-full sm:max-w-2xl">
      <div className="flex justify-between"><h2 className="text-xl font-bold">Dates personnelles</h2><button className="min-h-11" disabled={busy} onClick={() => setOpen(false)}>Fermer</button></div>
      <p className="my-2 text-sm">Le 29 février est observé le 1er mars les années non bissextiles. Les anciennes dates restent utilisables jusqu’à ton choix explicite.</p>
      {state.error && <p role="alert">{state.error} <button onClick={state.retry}>Réessayer</button></p>}
      {state.loading && <p>Chargement des dates…</p>}
      <form className="space-y-3" onSubmit={event => {
        event.preventDefault()
        creationId.current ??= crypto.randomUUID()
        const payload: Record<string, Json> = { id: selected?.id ?? creationId.current, revision: selected?.revision ?? 0, contact_id: person ? Number(person) : null,
          type_evenement: kind, titre: title.trim(), recurrence: fixedAnnual || annual ? 'annuelle' : 'ponctuelle' }
        if (fixedAnnual) {
          payload.jour = kind === 'fete_prenomale' ? Number(feast.slice(3)) : Number(day)
          payload.mois = kind === 'fete_prenomale' ? Number(feast.slice(0, 2)) : Number(month)
          if (kind === 'anniversaire') payload.annee_naissance = birthYear ? Number(birthYear) : null
        } else payload.date = date
        if (selected && selected.recurrence === 'annuelle') payload.depuis_cycle = Number(since)
        void action(() => supabase.rpc('enregistrer_evenement_lot02', { p_donnees: payload }), 'Date enregistrée. Les occurrences et préférences sont conservées dans ton compte.', true)
      }}>
        <label>Pour qui ?<select className={input} value={person} disabled={busy || !!selected || contactId !== undefined} onChange={event => { setPerson(event.target.value); setFeast('') }}>
          <option value="">Moi</option>{contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.prenom} {contact.nom}</option>)}
        </select></label>
        <label>Type de date<select className={input} value={kind} disabled={busy || !!selected} onChange={event => { setKind(event.target.value); setFeast('') }}>{Object.entries(eventLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>Nom de l’événement<input className={input} required maxLength={120} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} /></label>
        {kind === 'anniversaire' && <div className="grid grid-cols-2 gap-3">
          <label>Jour<input className={input} type="number" required min={1} max={31} value={day} disabled={busy} onChange={event => setDay(event.target.value)} /></label>
          <label>Mois<input className={input} type="number" required min={1} max={12} value={month} disabled={busy} onChange={event => setMonth(event.target.value)} /></label>
          <label className="col-span-2">Année de naissance (facultative)<input className={input} type="number" min={1} max={Number(today.slice(0, 4))} value={birthYear} disabled={busy} onChange={event => setBirthYear(event.target.value)} /></label>
          <p className="col-span-2 text-sm">Sans année connue, aucun âge ne sera affiché.</p>
        </div>}
        {kind === 'fete_prenomale' && <label>Fête de {personName || 'ce prénom'}<select className={input} required value={feast} disabled={busy} onChange={event => setFeast(event.target.value)}><option value="">Choisir une correspondance</option>{choices.map(choice => <option key={choice} value={choice}>{choice.slice(3)}/{choice.slice(0, 2)}</option>)}</select>{!choices.length && <span>Aucune correspondance disponible pour ce prénom.</span>}</label>}
        {!fixedAnnual && <>
          <label>Date<input className={input} type="date" required value={date} disabled={busy} onChange={event => setDate(event.target.value)} /></label>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={annual} disabled={busy || !!selected} onChange={event => setAnnual(event.target.checked)} />Revenir chaque année</label>
          <p className="text-sm">Par défaut, cette date ne revient pas l’année suivante.</p>
        </>}
        {selected?.recurrence === 'annuelle' && <label>Appliquer la nouvelle date à partir de l’année<input className={input} type="number" min={Number(today.slice(0, 4))} max={9999} required value={since} onChange={event => setSince(event.target.value)} disabled={busy} /></label>}
        <button className="min-h-11 rounded-lg bg-action px-3 text-on-action" disabled={busy || state.loading || !!state.error}>Enregistrer</button>
        {selected && <button type="button" className="min-h-11 px-3" disabled={busy} onClick={reset}>Nouvelle date</button>}
      </form>
      {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      <section className="mt-5 space-y-3"><h3 className="font-bold">Événements enregistrés</h3>
        {state.data?.events.filter(event => contactId === undefined || event.contact_id === contactId).map(event => <div className="rounded-xl border border-line p-3" key={event.id}>
          <p>{event.titre}{event.archive ? ' · Archivé' : ''}{event.choix_a_reconfirmer ? ' · Fête à reconfirmer après changement de prénom' : ''}</p>
          <button className="min-h-11 underline" disabled={busy} onClick={() => edit(event)}>Modifier la date ou le nom</button>
          <div className="flex flex-wrap gap-3">{(['visible', 'rappels_actifs', 'archive'] as const).map(field => <label className="flex min-h-11 items-center gap-2" key={field}>
            <input type="checkbox" disabled={busy || state.loading} checked={event[field]} onChange={change => {
              const next = { ...event, [field]: change.target.checked }
              // Le SQL accepte NULL ; le générateur Supabase ne représente pas la nullabilité des arguments.
              void action(() => supabase.rpc('preferences_evenement_lot02', { p_id: event.id, p_revision: event.revision, p_visible: next.visible, p_rappels: next.rappels_actifs, p_archive: next.archive, p_arret: event.arrete_apres_cycle as number }), 'Préférences enregistrées.')
            }} />{field === 'visible' ? 'Afficher' : field === 'rappels_actifs' ? 'Rappels actifs' : 'Archiver'}
          </label>)}</div>
          {event.recurrence === 'annuelle' && <form onSubmit={submit => {
            submit.preventDefault()
            const raw = new FormData(submit.currentTarget).get('stop')?.toString() ?? ''
            void action(() => supabase.rpc('preferences_evenement_lot02', { p_id: event.id, p_revision: event.revision, p_visible: event.visible, p_rappels: event.rappels_actifs, p_archive: event.archive, p_arret: (raw ? Number(raw) : null) as number }), 'Fin de série enregistrée. L’historique reste conservé.')
          }}><label>Dernière année (vide : série ouverte)<input name="stop" className={input} type="number" min={1} max={9999} defaultValue={event.arrete_apres_cycle ?? ''} key={`${event.id}:${event.revision}`} disabled={busy} /></label><button className="min-h-11 underline" disabled={busy}>Enregistrer la fin de série</button></form>}
          <details><summary className="min-h-11 cursor-pointer">Occurrences de la période consultée</summary><p className="text-sm">Les autres occurrences et anciennes règles restent disponibles dans l’export.</p>
            {state.data?.occurrences.filter(row => row.evenement_id === event.id).map(row => <form key={`${row.id}:${row.revision}`} className="my-2 border-t border-line" onSubmit={submit => {
              submit.preventDefault(); const form = new FormData(submit.currentTarget)
              void action(() => supabase.rpc('modifier_occurrence_lot02', { p_id: row.id, p_revision: row.revision, p_date: String(form.get('date')), p_annulee: form.get('cancel') === 'on' }), 'Occurrence modifiée. Les autres années restent indépendantes.')
            }}><p>{row.titre_historique} · {row.cycle === 0 ? 'Date ponctuelle' : row.cycle}</p>
              <label>Date de cette occurrence<input className={input} name="date" type="date" required defaultValue={row.date_occurrence} disabled={busy} /></label>
              <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="cancel" defaultChecked={row.annulee} disabled={busy} />Annuler seulement cette occurrence</label><button className="min-h-11 underline" disabled={busy}>Enregistrer l’occurrence</button>
            </form>)}
          </details>
        </div>)}
      </section>
    </Modal>
  </>
}
