'use client'
// 💌 Enregistrements explicites ; aucune publication ni reprise automatique de texte.
import { useEffect, useId, useRef, useState } from 'react'
import { useContactDraft } from '@/components/ContactDraftProvider'
import { button, field } from '@/components/AttentionShared'
import { CARD_TEMPLATES, CARD_EXPIRY_DAYS, CARD_MESSAGE_LIMIT, CARD_SIGNATURE_LIMIT, isCardTemplate, type CardShareStatus } from '@/lib/cards'
import { supportedCardSnapshot, type SupportedCardSnapshot } from '@/lib/card-snapshot-v2'
import { avatarForCard } from '@/lib/avatar-data'
import { cardOperation, cardRequest, draftSnapshot, loadCard, recoverCardLink, saveCard, type CardDraft, type CardOperation, type RecoveredCardLink } from '@/lib/card-data'
import CardRenderer from './CardRenderer'
import ShareImageButton from '../ShareImageButton'

const blank: SupportedCardSnapshot = { format: 2, templateId: 'clair_de_lune', templateVersion: 1, renderVersion: 2, message: '', signature: '', avatar: null }
const sharingNotice = 'Toute personne possédant le lien peut ouvrir la carte, y compris après transfert. Une révocation bloque les consultations suivantes ; elle ne retire pas une copie déjà faite.'
export default function CardEditor({ ownerId, preparationId, preparedMessage, onClose, onDirtyChange }: { ownerId: string; preparationId: string; preparedMessage?: string; onClose: () => void; onDirtyChange: (dirty: boolean) => void }) {
  const [snapshot, setSnapshot] = useState<SupportedCardSnapshot>(blank), [saved, setSaved] = useState<CardDraft | null>(null), [share, setShare] = useState<CardShareStatus | null>(null)
  const [createId] = useState(() => crypto.randomUUID()), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [days, setDays] = useState(30), [link, setLink] = useState<RecoveredCardLink | null>(null)
  const [pendingOperation, setPendingOperation] = useState<CardOperation | null>(null)
  const alive = useRef(true), lock = useRef(false), id = useId(), { registerPrivateDraft } = useContactDraft()
  const dirty = JSON.stringify(snapshot) !== JSON.stringify(saved ? draftSnapshot(saved) : blank)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { registerPrivateDraft(id, dirty); onDirtyChange(dirty); return () => { registerPrivateDraft(id, false); onDirtyChange(false) } }, [dirty, id, registerPrivateDraft, onDirtyChange])
  useEffect(() => {
    if (!dirty) return
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', leave); return () => window.removeEventListener('beforeunload', leave)
  }, [dirty])
  useEffect(() => {
    let active = true
    loadCard(ownerId, preparationId).then(data => { if (active) { setSaved(data.draft); setSnapshot(data.draft ? draftSnapshot(data.draft) : blank); setShare(data.share); setLoaded(true) } }, () => { if (active) setError('Lecture impossible. Réessaie en ouvrant à nouveau la carte.') })
    return () => { active = false }
  }, [ownerId, preparationId])
  // Un lien récupéré ne reste pas affiché dans un onglet masqué ou après son échéance.
  useEffect(() => {
    const clear = () => setLink(null), visibility = () => { if (document.visibilityState !== 'visible') clear() }
    window.addEventListener('pagehide', clear); document.addEventListener('visibilitychange', visibility)
    const remaining = link ? Math.max(0, Date.parse(link.expiresAt) - Date.now()) : 0
    const timer = link ? setTimeout(() => setLink(null), Math.min(remaining, 2147483647)) : null
    return () => { window.removeEventListener('pagehide', clear); document.removeEventListener('visibilitychange', visibility); if (timer !== null) clearTimeout(timer) }
  }, [link])
  async function run(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try { await action() }
    catch (error) { if (alive.current) setError(error instanceof Error ? error.message : 'Action impossible. Ta saisie est conservée.') }
    finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  async function save() {
    await run(async () => {
      const row = await saveCard(ownerId, preparationId, saved?.id ?? createId, saved?.revision ?? null, supportedCardSnapshot(snapshot))
      if (!alive.current) return
      setSaved(row); setNotice('Brouillon enregistré. Il reste privé.')
    })
  }
  async function reload() {
    if (dirty && !window.confirm('Relire la carte et abandonner tes modifications non enregistrées ? Copie-les d’abord pour les conserver.')) return
    await run(async () => {
      const data = await loadCard(ownerId, preparationId)
      if (!alive.current) return
      setSaved(data.draft); setSnapshot(data.draft ? draftSnapshot(data.draft) : blank); setShare(data.share); setLink(null); setPendingOperation(null); setLoaded(true); setNotice('Carte relue.')
    })
  }
  async function mutate(action: CardOperation['action'], retry = false) {
    if (lock.current) return
    if (!saved || dirty) { setError('Enregistre tes modifications avant de publier ou gérer le lien.'); return }
    if (!retry && !window.confirm(action === 'revoquer' ? 'Désactiver le lien actuel ? Le brouillon et les versions resteront privés.' : (action === 'publier' ? 'Publier le dernier brouillon enregistré et invalider le lien précédent ? ' : 'Remplacer le lien de la version publiée et invalider le précédent ? ') + sharingNotice)) return
    const operation = retry ? pendingOperation : { action, revision: saved.revision, operationId: crypto.randomUUID(), ...(action !== 'revoquer' ? { expiryDays: days } : {}) }
    if (!operation) return
    setPendingOperation(operation); setLink(null)
    await run(async () => {
      const status = await cardOperation(ownerId, saved.id, operation)
      if (!alive.current) return
      setShare(status); setPendingOperation(null)
      if (status.revision !== operation.revision + 1) throw new Error('Une autre opération a modifié la carte. Ta saisie est conservée ; relis la carte.')
      setSaved({ ...saved, revision: status.revision }); setNotice(action === 'revoquer' ? 'Lien désactivé.' : action === 'publier' ? 'Version publiée. Récupère son lien pour la partager.' : 'Lien remplacé. Récupère le nouveau lien.')
    })
  }
  async function recover() {
    if (!saved) return
    await run(async () => { const result = await recoverCardLink(ownerId, saved.id); if (alive.current && document.visibilityState === 'visible') { setLink(result); setNotice('Lien prêt. Choisis maintenant comment le partager.') } })
  }
  const url = link && typeof window !== 'undefined' ? window.location.origin + '/carte#' + link.secret : ''
  async function copy() {
    if (!url || !link || Date.parse(link.expiresAt) <= Date.now()) { setLink(null); return }
    try { await navigator.clipboard.writeText(url); if (alive.current) setNotice('Lien copié.') }
    catch { if (alive.current) setNotice('Copie automatique indisponible. Sélectionne et copie le lien ci-dessous.') }
  }
  async function nativeShare() {
    if (!url || !link || Date.parse(link.expiresAt) <= Date.now()) { setLink(null); return }
    try { await navigator.share({ title: 'Une carte pour toi · Ephemer', url }); if (alive.current) setNotice('Menu de partage terminé.') }
    catch (error) { if (alive.current) setNotice((error as { name?: string }).name === 'AbortError' ? 'Partage annulé.' : 'Partage indisponible. Tu peux copier le lien.') }
  }
  const statusLabel = share?.state === 'actif' ? 'Lien actif' : share?.state === 'revoque' ? 'Lien désactivé' : share?.state === 'expire' ? 'Lien expiré' : 'Aucun lien publié'
  return <div className="min-w-0 space-y-5">
    <header className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Une carte sous les étoiles</h2><p className="mt-1 text-sm text-muted">Trois modèles gratuits. Signature choisie par toi.</p></div><button type="button" className={button} disabled={busy} onClick={onClose}>Fermer</button></header>
    {!loaded && <p role="status">Chargement de ta carte privée…</p>}
    <fieldset disabled={busy || !loaded || !!pendingOperation} className="min-w-0 space-y-4">
      <fieldset className="min-w-0"><legend className="mb-2 font-semibold">Choisir un modèle</legend><div className="grid gap-2 sm:grid-cols-3">{CARD_TEMPLATES.map(item => <label key={item.id} className={'min-h-11 cursor-pointer rounded-xl border p-3 ' + (snapshot.templateId === item.id ? 'border-accent bg-accent/10' : 'border-line')}>
        <span className="flex items-center gap-2"><input type="radio" name={id + '-template'} value={item.id} checked={snapshot.templateId === item.id} onChange={event => { if (isCardTemplate(event.target.value)) setSnapshot({ ...snapshot, templateId: event.target.value }) }} /><span className="font-semibold">{item.label}</span></span><span className="mt-1 block text-sm text-muted">{item.description} Gratuit.</span></label>)}</div></fieldset>
      {preparedMessage && <button type="button" className={button} onClick={() => { if (!snapshot.message || window.confirm('Remplacer le texte de la carte par ton message préparé ?')) setSnapshot({ ...snapshot, message: Array.from(preparedMessage).slice(0, CARD_MESSAGE_LIMIT).join('') }) }}>Reprendre mon message préparé</button>}
      <label className="block text-sm">Message<textarea className={field + ' mt-1 min-h-36'} value={snapshot.message} maxLength={CARD_MESSAGE_LIMIT} onChange={event => setSnapshot({ ...snapshot, message: event.target.value })} /></label>
      <label className="block text-sm">Signature choisie (facultative)<input className={field + ' mt-1'} value={snapshot.signature} maxLength={CARD_SIGNATURE_LIMIT} onChange={event => setSnapshot({ ...snapshot, signature: event.target.value })} /></label>
      <div className="space-y-2"><p className="text-sm text-muted">L’avatar est une copie choisie pour cette carte. Modifier ton profil ne la change pas. Sans avatar enregistré dans le profil, l’apparence par défaut sera copiée.</p>
        <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => void run(async () => { const avatar = await avatarForCard(ownerId); if (alive.current) { setSnapshot({ ...snapshot, format: 2, renderVersion: 2, avatar }); setNotice('Avatar copié dans la saisie. Enregistre le brouillon pour le conserver.') } })}>{snapshot.format === 2 && snapshot.avatar ? 'Actualiser depuis mon profil' : 'Ajouter mon avatar'}</button>
          {snapshot.format === 2 && snapshot.avatar && <button type="button" className={button} onClick={() => setSnapshot({ ...snapshot, avatar: null })}>Retirer l’avatar</button>}
        </div>
      </div>
      <button type="button" className={button} disabled={!dirty && !!saved} onClick={() => void save()}>Enregistrer le brouillon</button>
    </fieldset>
    <p className="text-sm text-muted">{dirty ? 'Modifications non enregistrées' : saved ? 'Brouillon enregistré, visible uniquement par toi.' : 'La carte sera créée au premier enregistrement.'}</p>
    <section aria-label="Aperçu du brouillon" className="min-w-0 space-y-2"><h3 className="font-semibold">Aperçu du brouillon privé</h3><CardRenderer snapshot={snapshot} /></section>
    {loaded && <ShareImageButton title="Ma carte personnelle" snapshot={snapshot} label="Partager le brouillon en image" />}
    {saved && <section className="space-y-3 rounded-xl border border-line p-3"><h3 className="font-semibold">Publication et lien privé</h3><p className="text-sm">{sharingNotice}</p>
      <label className="block text-sm">Expiration du nouveau lien<select className={field + ' mt-1'} value={days} disabled={busy || !!pendingOperation} onChange={event => setDays(Number(event.target.value))}>{CARD_EXPIRY_DAYS.map(day => <option key={day} value={day}>{day} jours{day === 30 ? ' (par défaut)' : ''}</option>)}</select></label>
      <p className="text-sm">{statusLabel}{share?.expiresAt && ' · Échéance : ' + new Date(share.expiresAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
      <div className="flex flex-wrap gap-2"><button className={button} type="button" disabled={busy || dirty || !snapshot.message.trim() || !!pendingOperation} onClick={() => void mutate('publier')}>Publier le brouillon enregistré</button>
        {share?.published && <button className={button} type="button" disabled={busy || dirty || !!pendingOperation} onClick={() => void mutate('remplacer')}>Remplacer le lien</button>}
        {share?.state === 'actif' && <><button className={button} type="button" disabled={busy || !!pendingOperation} onClick={() => void recover()}>Récupérer mon lien</button><button className={button} type="button" disabled={busy || dirty || !!pendingOperation} onClick={() => void mutate('revoquer')}>Désactiver le lien</button></>}
        <button className={button} type="button" disabled={busy || !!pendingOperation} onClick={() => void run(async () => { if (!window.confirm('Supprimer cette carte, toutes ses versions et tous ses liens ?')) return; await cardRequest(ownerId, '/api/cartes/' + saved.id, 'DELETE'); if (alive.current) { setSaved(null); setSnapshot(blank); setShare(null); setLink(null); setNotice('Carte et liens supprimés.') } })}>Supprimer la carte</button>
      </div>
      {link && <div className="space-y-2"><label className="block text-sm">Lien secret à partager<input className={field + ' mt-1'} readOnly value={url} onFocus={event => event.currentTarget.select()} /></label><div className="flex flex-wrap gap-2"><button className={button} type="button" onClick={() => void copy()}>Copier le lien</button>{typeof navigator !== 'undefined' && typeof navigator.share === 'function' && <button className={button} type="button" onClick={() => void nativeShare()}>Partager…</button>}</div></div>}
    </section>}
    {share?.published && <section aria-label="Version publiée actuelle" className="space-y-2"><h3 className="font-semibold">Version publiée actuelle</h3><p className="text-sm text-muted">Cette version conserve son message, sa signature, son avatar choisi et sa composition.</p><CardRenderer snapshot={share.published} /><ShareImageButton title="Ma carte publiée" snapshot={share.published} label="Partager la version publiée en image" /></section>}
    {pendingOperation && <div role="alert" className="space-y-2"><p>Résultat non confirmé. Reprendre utilise la même opération et ne crée pas un deuxième lien.</p><button className={button} disabled={busy} type="button" onClick={() => void mutate(pendingOperation.action, true)}>Reprendre la même opération</button></div>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}{notice && <p role="status" className="text-sm">{notice}</p>}
    <button type="button" className={button} disabled={busy} onClick={() => void reload()}>Relire la carte</button>
    {busy && <p role="status">Opération en cours…</p>}
  </div>
}
