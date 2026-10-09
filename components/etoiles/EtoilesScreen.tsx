'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useDashboardUser } from '@/components/DashboardUserContext'
import { useContactDraft } from '@/components/ContactDraftProvider'
import Modal from '@/components/Modal'
import { useContacts } from '@/lib/hooks/useContacts'
import { useClock } from '@/lib/hooks/useClock'
import { readEtoiles } from '@/lib/etoiles-data'
import { useEtoiles } from './EtoilesContext'
import EtoileAction from './EtoileAction'
import UniversPartagePanel from '@/components/univers/UniversPartagePanel'
import type { Etoile, DemandeEnvoyee, EtoileBloquee, LienEtoile } from '@/lib/etoiles-contract'

const bouton = 'min-h-11 rounded-xl border border-line px-3 py-2 text-sm font-semibold hover:bg-ink/5 disabled:opacity-50'
const carte = 'min-w-0 rounded-2xl border border-line bg-surface p-4'
function expiration(date: string) { return new Date(date).toLocaleDateString('fr-FR') }
export default function EtoilesScreen() {
  const { id } = useDashboardUser(), social = useEtoiles(), carnet = useContacts(), drafts = useContactDraft()
  const now = useClock()
  const { registerPrivateDraft } = drafts
  const [tab, setTab] = useState<'actives' | 'recues' | 'envoyees'>('actives'), [panel, setPanel] = useState<'ajouter' | 'liens' | 'bloquees' | null>(null)
  const [envoyees, setEnvoyees] = useState<DemandeEnvoyee[]>([]), [bloquees, setBloquees] = useState<EtoileBloquee[]>([]), [liens, setLiens] = useState<LienEtoile[]>([])
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [email, setEmail] = useState(''), [busy, setBusy] = useState(false)
  const [secret, setSecret] = useState<{ token: string; lienId: string; expiresAt: string } | null>(null), [shareNotice, setShareNotice] = useState('')
  const [associate, setAssociate] = useState<Etoile | null>(null), [contactId, setContactId] = useState('')
  const life = useRef(false), controller = useRef<AbortController | null>(null), sequence = useRef(0)
  const load = useCallback(async () => {
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort; const current = ++sequence.current
    if (navigator.onLine === false) { setEnvoyees([]); setBloquees([]); setLiens([]); setLoading(false); return }
    setLoading(true)
    try {
      const values = await Promise.all([readEtoiles(id, 'envoyees', abort.signal), readEtoiles(id, 'bloquees', abort.signal), readEtoiles(id, 'liens', abort.signal)])
      if (life.current && current === sequence.current) { setEnvoyees(values[0]); setBloquees(values[1]); setLiens(values[2]); setError('') }
    } catch { if (life.current && current === sequence.current && !abort.signal.aborted) { setEnvoyees([]); setBloquees([]); setLiens([]); setError('Impossible de charger toutes les demandes et les liens. Réessaie.') } }
    finally { if (life.current && current === sequence.current) setLoading(false) }
  }, [id])
  useEffect(() => {
    life.current = true
    const invalidate = () => { sequence.current++; controller.current?.abort() }
    // Chargement réseau des panneaux, synchronisé sur les relations reconnues.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
    return () => { life.current = false; invalidate() }
  }, [load, social.actives, social.recues])
  useEffect(() => {
    registerPrivateDraft('etoiles', Boolean(email.trim() || secret))
    return () => registerPrivateDraft('etoiles', false)
  }, [email, secret, registerPrivateDraft])
  useEffect(() => {
    const clear = () => { sequence.current++; controller.current?.abort(); setSecret(null); setShareNotice(''); setEnvoyees([]); setBloquees([]); setLiens([]) }
    window.addEventListener('offline', clear); window.addEventListener('pagehide', clear)
    return () => { window.removeEventListener('offline', clear); window.removeEventListener('pagehide', clear) }
  }, [])
  async function close() {
    if (busy) return
    if ((email.trim() || secret) && !await drafts.confirm(secret ? 'Fermer ce panneau ? Le lien ne pourra pas être récupéré. Copie-le avant de quitter.' : 'Fermer sans envoyer cette demande ?')) return
    if (!life.current) return
    setPanel(null); setEmail(''); setSecret(null); setShareNotice('')
  }
  async function newContact(star: Etoile) {
    if (drafts.contacts.length || drafts.prenom.trim()) {
      if (!await drafts.confirm('Remplacer ton brouillon de contacts par une fiche pour cette étoile ?')) return
    }
    if (!life.current) return
    const draftId = crypto.randomUUID()
    drafts.setContacts([{ id: draftId, prenom: star.identite, relation: 'ami' }]); drafts.setPrenom('')
    social.setContactSeed({ etoileId: star.etoile_id, draftId })
    await drafts.navigate('/dashboard/contacts/nouveau')
  }
  async function share(native: boolean) {
    if (!secret) return
    const url = window.location.origin + '/etoile#' + secret.token
    try {
      if (native && navigator.share) { await navigator.share({ title: 'Retrouvons-nous sur Ephemer', url }); if (life.current) setShareNotice('Menu de partage terminé.') }
      else { await navigator.clipboard.writeText(url); if (life.current) setShareNotice('Lien copié.') }
    } catch (err) { if (life.current) setShareNotice(err instanceof DOMException && err.name === 'AbortError' ? 'Partage annulé.' : 'Copie indisponible. Sélectionne le lien ci-dessous.') }
  }
  const unavailable = social.offline || social.loading || loading || busy || Boolean(social.error || error)
  const counts = { actives: social.actives.length, recues: social.recues.length, envoyees: envoyees.length }
  return <main className="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
    <h1 className="text-2xl font-bold sm:text-3xl">⭐ Mes étoiles</h1>
    <p className="mt-3 max-w-2xl text-muted">Retrouve tes proches sur Ephemer. Si vos carnets contiennent chacun l’adresse de connexion vérifiée de l’autre, votre lien est reconnu. Tu peux aussi envoyer une demande.</p>
    <p className="mt-2 text-sm text-muted">Ton prénom ou pseudonyme social est visible à tes étoiles et dans tes demandes. Choisis tes informations partagées dans <Link href="/dashboard/univers" className="text-accent underline">Mon univers</Link>. Ton carnet et tes notes restent privés.</p>
    <div className="my-5 flex flex-wrap gap-2"><button className={bouton} disabled={unavailable} onClick={() => setPanel('ajouter')}>Ajouter une étoile</button>
      <button className={bouton} disabled={unavailable} onClick={() => setPanel('liens')}>Partager mon lien</button><button className={bouton} disabled={unavailable} onClick={() => setPanel('bloquees')}>Comptes bloqués</button>
      <button className={bouton} disabled={busy || social.offline} onClick={() => { void social.refresh(true); void load() }}>Actualiser</button></div>
    {social.offline && <p role="status" className="mb-4">Hors ligne : reconnecte-toi pour consulter et gérer tes étoiles.</p>}
    {(social.error || error) && <p role="alert" className="mb-4 text-danger">{social.error || error}</p>}
    <div className="mb-5 flex flex-wrap gap-2" aria-label="Vues des étoiles">{(['actives', 'recues', 'envoyees'] as const).map(vue => <button key={vue} aria-pressed={tab === vue} onClick={() => setTab(vue)} className={`${bouton} ${tab === vue ? 'bg-action text-on-action' : ''}`}>
      {{ actives: 'Mes étoiles', recues: 'Reçues', envoyees: 'Envoyées' }[vue]} {!social.error && !error && !social.loading && !loading && `(${counts[vue]})`}</button>)}</div>
    {(loading || social.loading) && <p role="status" className="mb-4 text-muted">Actualisation des relations…</p>}
    {!social.error && !error && !social.offline && <div className="grid gap-4 sm:grid-cols-2">
      {tab === 'actives' && social.actives.map(star => { const fiches = social.associations.filter(row => row.etoile_id === star.etoile_id); return <article key={star.id} className={carte}>
        <h2 className="break-words text-lg font-semibold">{star.identite}</h2><p className="mt-1 text-sm text-muted">{star.origine === 'reciproque' ? 'Reconnu dans vos deux carnets' : 'Demande acceptée'}</p>
        <div className="mt-4 flex flex-wrap gap-2">{fiches.length ? fiches.map(row => <Link key={row.contact_id} className={bouton} href={`/dashboard/contacts/${row.contact_id}/edit`}>Voir dans mon carnet{fiches.length > 1 ? ` · ${row.contact_id}` : ''}</Link>) : <button className={bouton} disabled={unavailable} onClick={() => { setAssociate(star); setContactId('') }}>Ajouter à mon carnet</button>}
          <EtoileAction action="retirer" donnees={{ etoileId: star.etoile_id }} confirmation="Retirer cette étoile ? La relation ne reviendra pas automatiquement. Une nouvelle demande acceptée sera nécessaire.">Retirer</EtoileAction>
          <EtoileAction action="bloquer" donnees={{ etoileId: star.etoile_id }} confirmation="Bloquer cette étoile et retirer votre relation ? Débloquer ne restaurera pas l’amitié.">Bloquer</EtoileAction></div>
        <UniversPartagePanel etoileId={star.etoile_id} />
        <Link className={bouton} href={'/dashboard/gift-ideas?' + new URLSearchParams({ etoileId: star.etoile_id })}>Trouver une attention</Link>
      </article> })}
      {tab === 'recues' && social.recues.map(d => <article key={d.id} className={carte}><h2 className="break-words text-lg font-semibold">{d.identite}</h2><p className="mt-1 text-sm text-muted">Demande valable jusqu’au {expiration(d.expires_at)}</p>
        <div className="mt-4 flex flex-wrap gap-2"><EtoileAction action="accepter" donnees={{ demandeId: d.id }} onResult={() => setTab('actives')}>Accepter</EtoileAction><EtoileAction action="refuser" donnees={{ demandeId: d.id }}>Refuser</EtoileAction>
          <EtoileAction action="bloquer" donnees={{ etoileId: d.auteur_id }} confirmation="Bloquer ce compte ? Ses demandes ne pourront plus créer de relation.">Bloquer</EtoileAction></div></article>)}
      {tab === 'envoyees' && envoyees.map(d => <article key={d.id} className={carte}><h2 className="break-all font-semibold">{d.adresse_cible}</h2><p className="mt-2 text-sm text-muted">{{ en_attente: 'En attente', acceptee: 'Acceptée', refusee: 'Refusée', annulee: 'Annulée', expiree: 'Expirée' }[d.etat]} · jusqu’au {expiration(d.expires_at)}</p>
        {d.etat === 'en_attente' && <div className="mt-4"><EtoileAction action="annuler" donnees={{ demandeId: d.id }} onResult={() => void load()}>Annuler la demande</EtoileAction></div>}</article>)}
      {!loading && !social.loading && counts[tab] === 0 && <p className="text-muted">{{ actives: 'Aucune étoile pour le moment. Ajoute tes proches ou partage ton lien.', recues: 'Aucune demande reçue.', envoyees: 'Aucune demande envoyée.' }[tab]}</p>}
    </div>}
    <Modal open={panel !== null} onClose={() => void close()} title={panel === 'ajouter' ? 'Ajouter une étoile' : panel === 'liens' ? 'Liens à partager' : 'Comptes bloqués'} className="w-[min(95vw,38rem)]">
      <h2 className="mb-4 text-xl font-bold">{panel === 'ajouter' ? 'Ajouter une étoile' : panel === 'liens' ? 'Partager mon lien' : 'Comptes bloqués'}</h2>
      {panel === 'ajouter' && <><label htmlFor="etoile-email" className="block">Adresse de connexion de ton proche</label><input id="etoile-email" type="email" value={email} maxLength={320} disabled={busy} onChange={event => setEmail(event.target.value)} className="my-3 w-full min-w-0 rounded-xl border border-line bg-canvas p-3" />
        <p className="mb-4 text-sm text-muted">La réponse ne révèle pas si cette adresse possède un compte. La demande reste valable 30 jours. Ton identité sociale sera visible au destinataire vérifié.</p>
        <EtoileAction action="demander" donnees={{ email }} disabled={!email.trim()} onBusy={setBusy} onResult={() => { setEmail(''); void load() }}>Envoyer la demande</EtoileAction></>}
      {panel === 'liens' && <><p className="mb-4 text-sm text-muted">Valable 7 jours. La personne qui ouvre le lien doit te demander une relation : tu décides ensuite de l’accepter. Le lien est remis une seule fois ; copie-le avant de fermer.</p>
        <EtoileAction action="creer_lien" donnees={{}} disabled={Boolean(secret)} onBusy={setBusy} onResult={result => { if (result.token && result.lienId && result.expiresAt) setSecret({ token: result.token, lienId: result.lienId, expiresAt: result.expiresAt }); else setShareNotice('Le lien existe, mais son secret n’est plus disponible. Révoque-le ci-dessous puis crée un autre lien.'); void load() }}>Créer un lien</EtoileAction>
        {secret && <div className="my-4"><label htmlFor="etoile-lien" className="text-sm">Ton lien · jusqu’au {expiration(secret.expiresAt)}</label><input id="etoile-lien" readOnly value={typeof window === 'undefined' ? '' : window.location.origin + '/etoile#' + secret.token} onFocus={event => event.target.select()} className="my-2 w-full min-w-0 rounded-xl border border-line bg-canvas p-3 text-sm" />
          <div className="flex flex-wrap gap-2"><button className={bouton} onClick={() => void share(false)}>Copier</button><button className={bouton} onClick={() => void share(true)}>Partager</button></div></div>}
        {shareNotice && <p role="status" className="my-3 text-sm">{shareNotice}</p>}
        <ul className="mt-4 space-y-3">{liens.map(lien => <li key={lien.id} className="rounded-xl border border-line p-3"><p className="mb-2 break-words text-sm">{lien.revoque ? 'Révoqué' : now && Date.parse(lien.expires_at) <= now ? 'Expiré' : 'Valable'} · jusqu’au {expiration(lien.expires_at)}</p>
          {!lien.revoque && <EtoileAction action="revoquer_lien" donnees={{ lienId: lien.id }} confirmation="Révoquer ce lien ? Il ne permettra plus de demander une relation." onBusy={setBusy} onResult={() => { if (secret?.lienId === lien.id) setSecret(null); void load() }}>Révoquer</EtoileAction>}</li>)}</ul></>}
      {panel === 'bloquees' && <><p className="mb-4 text-sm text-muted">Débloquer permet une nouvelle demande ; cela ne restaure pas une amitié.</p>{bloquees.length === 0 && <p>Aucun compte bloqué.</p>}
        <ul className="space-y-3">{bloquees.map((row, index) => <li key={row.id} className="rounded-xl border border-line p-3"><p className="mb-2">Compte bloqué {index + 1} · {expiration(row.created_at)}</p><EtoileAction action="debloquer" donnees={{ etoileId: row.id }} onBusy={setBusy} onResult={() => void load()}>Débloquer</EtoileAction></li>)}</ul></>}
      <button className={`${bouton} mt-5`} disabled={busy} onClick={() => void close()}>Fermer</button>
    </Modal>
    <Modal open={associate !== null} onClose={() => { if (!busy) setAssociate(null) }} title="Ajouter à mon carnet" className="w-[min(95vw,36rem)]">
      <h2 className="mb-3 text-xl font-bold">Ajouter {associate?.identite} à mon carnet</h2><p className="mb-4 text-sm text-muted">Choisis une fiche existante pour éviter un doublon, ou prépare une nouvelle fiche. Rien n’est ajouté automatiquement.</p>
      {carnet.error && <p role="alert">{carnet.error}</p>}<label htmlFor="etoile-contact">Fiche existante</label><select id="etoile-contact" value={contactId} onChange={event => setContactId(event.target.value)} disabled={busy || carnet.loading || Boolean(carnet.error)} className="my-3 w-full min-w-0 rounded-xl border border-line bg-canvas p-3"><option value="">Choisir une fiche</option>{carnet.contacts.filter(contact => Number.isSafeInteger(contact.id)).map(contact => <option key={contact.id} value={String(contact.id)}>{contact.prenom} {contact.nom}</option>)}</select>
      {associate && <div className="flex flex-wrap gap-3"><EtoileAction action="associer_contact" donnees={{ contactId, etoileId: associate.etoile_id }} disabled={!contactId} onBusy={setBusy} onResult={() => setAssociate(null)}>Associer cette fiche</EtoileAction>
        <button className={bouton} disabled={unavailable} onClick={() => void newContact(associate)}>Préparer une nouvelle fiche</button></div>}
      <button className={`${bouton} mt-5`} disabled={busy} onClick={() => setAssociate(null)}>Annuler</button>
    </Modal>
  </main>
}
