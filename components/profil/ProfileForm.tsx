'use client'
// Orchestration indépendante du transport : révision, reprise et brouillon privé.
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useContactDraft } from '@/components/ContactDraftProvider'
import { resultatUnivers } from '@/lib/univers-contract'
import { commandeProfil as commandeUnivers, profilUnifie as monUnivers, type CommandeProfil as CommandeUnivers, type ProfilUnifie as MonUnivers } from '@/lib/profile-contract'
import ProfileEditor from './ProfileEditor'
import AccountSettings from './AccountSettings'
import ShareImageButton from '../ShareImageButton'
import { ownUniversImageFields } from '@/lib/image-projections'
import { avatarRenderConfig } from '@/lib/avatar-render-config'
import { profilToutAutorise } from '@/lib/profile-contract'
import { proposerPermissionsProfil, permissionsProfilTraitees } from '@/lib/profile-permission-proposal'
import ProfileAvatarCard from '@/components/avatars/ProfileAvatarCard'

export type ProfileService = {
  lire: (ownerId: string, signal: AbortSignal) => Promise<unknown>
  commander: (ownerId: string, command: CommandeUnivers, signal: AbortSignal) => Promise<unknown>
}
const isOffline = () => navigator.onLine === false
export default function ProfileForm(props: { ownerId: string; api: ProfileService; avatarEnregistre?: unknown }) {
  return <AccountProfileForm key={props.ownerId} {...props} />
}
export function AccountProfileForm({ ownerId, api, avatarEnregistre = null }: { ownerId: string; api: ProfileService; avatarEnregistre?: unknown }) {
  const [saved, setSaved] = useState<MonUnivers | null>(null), [draft, setDraft] = useState<MonUnivers | null>(null)
  const [busy, setBusy] = useState(false), [offline, setOffline] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [conflict, setConflict] = useState(false)
  const [proposal, setProposal] = useState(false)
  const firstRead = useRef(true)
  const { confirm, registerPrivateDraft } = useContactDraft(), id = useId()
  const alive = useRef(false), dirtyRef = useRef(false), lock = useRef(false), epoch = useRef(0)
  const readAbort = useRef<AbortController | null>(null), writeAbort = useRef<AbortController | null>(null)
  const attempt = useRef<{ fingerprint: string; command: CommandeUnivers } | null>(null), savedRef = useRef<MonUnivers | null>(null)
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved)
  let imageAvatar = null
  if (avatarEnregistre) { try { imageAvatar = avatarRenderConfig(avatarEnregistre) } catch { /* Pas de copie d'une configuration invalide. */ } }
  useEffect(() => { dirtyRef.current = dirty; savedRef.current = saved }, [dirty, saved])
  const invalidate = useCallback(() => { epoch.current++; readAbort.current?.abort(); writeAbort.current?.abort(); attempt.current = null }, [])
  const read = useCallback(async () => {
    if (!alive.current) throw new Error('Lecture profil abandonnée.')
    if (isOffline()) throw new Error('Hors ligne : reconnecte-toi pour relire ton profil.')
    readAbort.current?.abort()
    const version = ++epoch.current, abort = new AbortController(); readAbort.current = abort
    try {
      const row = monUnivers(await api.lire(ownerId, abort.signal))
      if (!alive.current || version !== epoch.current || abort.signal.aborted) throw new Error('Lecture profil dépassée.')
      return row
    } catch (failure) {
      if (!alive.current || version !== epoch.current || abort.signal.aborted) { const obsolete = new Error('Lecture profil abandonnée.'); obsolete.name = 'AbortError'; throw obsolete }
      throw failure
    }
  }, [api, ownerId])
  useEffect(() => {
    alive.current = true
    const refresh = async () => {
      if (document.visibilityState === 'hidden' || lock.current) return
      if (isOffline()) { setOffline(true); return }
      setOffline(false)
      try {
        const row = await read()
        if (dirtyRef.current) {
          if (row.empreinte !== savedRef.current?.empreinte) { setConflict(true); setNotice('Ton profil a changé ailleurs. Ta saisie est conservée ; relis avant d’enregistrer.') }
        } else {
          const propose = firstRead.current && proposerPermissionsProfil(ownerId)
          firstRead.current = false
          const next = propose ? profilToutAutorise(row) : row
          savedRef.current = row; dirtyRef.current = JSON.stringify(next) !== JSON.stringify(row)
          setSaved(row); setDraft(next); setProposal(propose); setConflict(false)
        }
        setError('')
      } catch (failure) { if (alive.current && (failure as Error)?.name !== 'AbortError') setError(failure instanceof Error ? failure.message : 'Lecture impossible.') }
    }
    const stop = () => { setOffline(true); epoch.current++; readAbort.current?.abort(); writeAbort.current?.abort() }
    void refresh()
    const update = () => { void refresh() }
    const timer = window.setInterval(update, 60000)
    window.addEventListener('focus', update); window.addEventListener('online', update); window.addEventListener('offline', stop)
    document.addEventListener('visibilitychange', update)
    return () => { alive.current = false; invalidate(); window.clearInterval(timer)
      window.removeEventListener('focus', update); window.removeEventListener('online', update); window.removeEventListener('offline', stop); document.removeEventListener('visibilitychange', update) }
  }, [read, invalidate, ownerId])
  useEffect(() => { registerPrivateDraft(id, dirty); return () => registerPrivateDraft(id, false) }, [id, dirty, registerPrivateDraft])
  async function reload() {
    if (lock.current || isOffline()) return
    if (dirty && !await confirm('Relire remplacera ta saisie par les informations enregistrées. Continuer ?')) return
    lock.current = true; setBusy(true)
    try { const row = await read(); setSaved(row); setDraft(row); savedRef.current = row; dirtyRef.current = false; setProposal(false); permissionsProfilTraitees(ownerId); setError(''); setNotice('Informations enregistrées relues.'); setConflict(false); attempt.current = null }
    catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'Lecture impossible.') }
    finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  async function run(action: 'enregistrer') {
    if (lock.current || !draft || !saved || isOffline() || conflict) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    let command: CommandeUnivers | null = null
    try {
      if (!alive.current || isOffline()) throw new Error('Reconnecte-toi avant de continuer.')
      const { revision: ignoredRevision, ...donnees } = draft; void ignoredRevision
      const fingerprint = JSON.stringify({ action, revision: saved.revision, donnees: donnees })
      if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, command: commandeUnivers({ action, revision: saved.revision, operation: crypto.randomUUID(), donnees: donnees }) }
      command = attempt.current.command
      epoch.current++; readAbort.current?.abort()
      const abort = new AbortController(); writeAbort.current = abort
      let result: ReturnType<typeof resultatUnivers> | null = null, failure: unknown = null
      try { result = resultatUnivers(await api.commander(ownerId, command, abort.signal)) } catch (error) { failure = error }
      // Même après erreur/réponse perdue : lire sans réémettre une nouvelle commande.
      const row = await read()
      const expected = command.revision + 1
      // L'ordre des clés reçu ne constitue pas une preuve : comparaison canonique métier.
      const withoutVersion = (value: MonUnivers) => { const { empreinte, ...fields } = value; void empreinte; return fields }
      const same = JSON.stringify(withoutVersion(monUnivers({ ...command.donnees, revision: expected }))) === JSON.stringify(withoutVersion(row))
      if (row.revision === expected && same && (!result || result.revision === row.revision)) {
        setSaved(row)
        setDraft(row)
        savedRef.current = row; dirtyRef.current = false
        setProposal(false); permissionsProfilTraitees(ownerId)
        window.dispatchEvent(new Event('ephemer-profile-changed'))
        setConflict(false); attempt.current = null; setNotice('Ton profil et tes choix de partage sont enregistrés.')
      } else {
        if (row.empreinte !== saved.empreinte || row.revision !== saved.revision) setConflict(true)
        throw failure instanceof Error ? failure : new Error('Enregistrement non confirmé ou conflit. Ta saisie est conservée ; relis avant de continuer.')
      }
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'Action impossible. Ta saisie est conservée.') }
    finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  return <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="text-2xl font-semibold text-ink">Mon profil</h1><p className="mt-2 text-sm text-muted">Tes informations, tes goûts et ce que tu choisis de partager, au même endroit.</p></div>
      <ProfileAvatarCard ownerId={ownerId} initiale={saved?.prenom.slice(0, 1)} />
    </header>
    {saved && <ShareImageButton title="Mon profil" fields={[...ownUniversImageFields(saved),{id:'surname',label:'Nom de famille',value:saved.nom,sensitive:true}]} avatarSnapshot={imageAvatar} />}
    {offline && <p role="status" className="text-sm text-muted">Hors ligne : tes modifications restent en mémoire pendant cette session.</p>}
    {error && <p role="alert" className="rounded-xl border border-line p-3 text-ink">{error}</p>}
    {notice && <p role="status" className="text-sm text-ink">{notice}</p>}
    <form onSubmit={event => { event.preventDefault(); void run('enregistrer') }} className="space-y-5">
    {proposal && <details className="rounded-2xl border border-accent/30 bg-action/5 p-4 text-sm text-ink">
      <summary className="cursor-pointer rounded-lg py-1 font-medium focus-visible:outline-2 focus-visible:outline-accent">Accords proposés : à vérifier avant d’enregistrer</summary>
      <p className="mt-3">Tous les renseignements partageables et les accords IA cadeaux sont proposés cochés. Vérifie tes choix : ils s’appliqueront uniquement après « Enregistrer ». Pour garder tes anciens choix, utilise « Relire les informations enregistrées ».</p>
    </details>}
    {draft ? <ProfileEditor draft={draft} onChange={value => { dirtyRef.current = JSON.stringify(value) !== JSON.stringify(savedRef.current); setDraft(value) }} avatar={avatarEnregistre} disabled={busy} /> : <p className="text-muted">{error ? 'Les informations enregistrées ne sont pas disponibles.' : 'Chargement de ton profil…'}</p>}
    <div className="flex flex-wrap gap-3">
      {/* aria-disabled garde le déclencheur focalisable au retour du dialogue ; le verrou interdit tout deuxième appel. */}
      <button type="submit" disabled={!draft || offline || conflict || busy} aria-disabled={busy || !draft || offline || conflict} className="min-h-11 rounded-xl bg-action px-4 py-3 text-on-action disabled:opacity-50 aria-disabled:opacity-50">Enregistrer mes informations et mon partage</button>
      <button type="button" disabled={offline} aria-disabled={busy || offline} onClick={() => void reload()} className="min-h-11 px-3 py-3 text-accent disabled:opacity-50 aria-disabled:opacity-50">Relire les informations enregistrées</button>
    </div>
    {dirty && <p className="text-sm text-muted">Modifications non enregistrées.</p>}
    </form>
    {saved && <AccountSettings key={ownerId} owner={ownerId} email={saved.valeurs.email} />}
  </div>
}
