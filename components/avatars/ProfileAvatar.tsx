'use client'
// 🌙 Les choix restent locaux jusqu’à Enregistrer ; aucune modification des copies de cartes.
import { useEffect, useId, useRef, useState } from 'react'
import Modal from '@/components/Modal'
import { useContactDraft } from '@/components/ContactDraftProvider'
import { button } from '@/components/AttentionShared'
import { avatarConfigV3, DEFAULT_AVATAR_V3 } from '@/lib/avatar-collection-v3'
import { recoverProfileRenderAvatar } from '@/lib/avatar-render-config'
import { loadAvatar, saveAvatar, type ProfileAvatar as AvatarRow } from '@/lib/avatar-data'
import AvatarEditorV3 from './AvatarEditorV3'
import AvatarRenderer from './AvatarRenderer'
import { useDashboardAvatar } from './DashboardAvatarContext'

// Les anciens avatars ne sont remplacés que sur validation volontaire.
function editableAvatar(input: unknown) {
  const recovered = recoverProfileRenderAvatar(input)
  if (recovered.config.format === 2) return { config: recovered.config, notice: recovered.notice }
  return { config: avatarConfigV3(DEFAULT_AVATAR_V3), notice: 'Ton avatar précédent reste enregistré. Valider les modifications le remplacera par cet avatar ; tes cartes conserveront leur copie.' }
}

export default function ProfileAvatar({ ownerId }: { ownerId: string }) {
  return <ProfileAvatarEditor key={ownerId} ownerId={ownerId} />
}

// Un changement de compte remonte cet éditeur et abandonne ses lectures/choix privés.
export function ProfileAvatarEditor({ ownerId }: { ownerId: string }) {
  const { updateAvatar } = useDashboardAvatar()
  const [row, setRow] = useState<AvatarRow | null>(null), [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false), [choice, setChoice] = useState(() => avatarConfigV3(DEFAULT_AVATAR_V3))
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [needsReview, setNeedsReview] = useState(false)
  const alive = useRef(true), lock = useRef(false), id = useId(), { registerPrivateDraft } = useContactDraft()
  const current = editableAvatar(row?.configuration)
  const dirty = open && (JSON.stringify(choice) !== JSON.stringify(current.config) || !!current.notice)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let active = true
    loadAvatar(ownerId).then(value => { if (active) { setRow(value); setLoaded(true); updateAvatar(value) } }, () => { if (active) setError('Impossible de lire ton avatar. Réessaie avec « Relire mon avatar ».') })
    return () => { active = false }
  }, [ownerId, updateAvatar])
  useEffect(() => {
    registerPrivateDraft(id, dirty)
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    if (dirty) window.addEventListener('beforeunload', leave)
    return () => { registerPrivateDraft(id, false); window.removeEventListener('beforeunload', leave) }
  }, [id, dirty, registerPrivateDraft])
  async function run(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try { await action() }
    catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'Action impossible. Tes choix sont conservés.') }
    finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  async function reread(edit: boolean) {
    let readyToOpen = false
    await run(async () => {
      const value = await loadAvatar(ownerId)
      if (!alive.current) return
      setRow(value); setLoaded(true); setNeedsReview(false); updateAvatar(value)
      if (edit) { setChoice(editableAvatar(value?.configuration).config); readyToOpen = true }
      else setNotice(open ? 'Version enregistrée relue. Tes choix sont conservés ; vérifie-les avant de les enregistrer.' : 'Avatar relu.')
    })
    // Ouvrir après déverrouillage : le premier bouton peut alors recevoir le focus.
    if (readyToOpen && alive.current) setOpen(true)
  }
  function cancel() {
    if (lock.current) return
    setOpen(false); setChoice(current.config); setError(''); setNotice('Modifications annulées.'); setNeedsReview(false)
  }
  async function save() {
    let confirmed = false
    await run(async () => {
      try {
        const value = await saveAvatar(ownerId, row?.revision ?? null, choice)
        if (!alive.current) return
        setRow(value); setChoice(avatarConfigV3(value.configuration)); setNeedsReview(false); updateAvatar(value); setNotice('Avatar enregistré dans ton compte. Tes cartes gardent leur propre copie.'); confirmed = true
      } catch (failure) { if (alive.current) setNeedsReview(true); throw failure }
    })
    // Le bouton de lancement doit être réactivé avant que la modal lui rende le focus.
    if (confirmed && alive.current) setOpen(false)
  }
  return <section className="my-6 space-y-3 rounded-2xl border border-line bg-surface p-4">
    <h2 className="text-lg font-semibold">Avatar</h2>
    {!loaded ? <p role="status">{error || 'Chargement de ton avatar…'}</p> : <>
      <AvatarRenderer config={current.config} className="h-24 w-24" />
      <p className="text-sm text-muted">Tous les éléments sont gratuits. Ajouter cet avatar à une carte reste un choix séparé.</p>
      {current.notice && <p role="status" className="text-sm">{current.notice}</p>}
      <button type="button" className={button} disabled={busy} onClick={() => void reread(true)}>Personnaliser mon avatar</button>
    </>}
    <button type="button" className={button} disabled={busy} onClick={() => void reread(false)}>Recharger avatar</button>
    {!open && error && loaded && <p role="alert" className="text-danger text-sm">{error}</p>}
    {!open && notice && <p role="status" className="text-sm">{notice}</p>}
    <Modal open={open} onClose={cancel} title="Personnaliser mon avatar" className="w-[min(1040px,100vw)]">
      <h2 className="mb-2 text-xl font-semibold">Personnaliser mon avatar</h2>
      <p className="mb-4 text-sm text-muted">Aperçu immédiat. Valider enregistre ton avatar dans ton compte, pour le retrouver après reconnexion et sur tes autres appareils. Homme et Femme concernent uniquement le dessin.</p>
      {current.notice && <p role="status" className="mb-4 text-sm">{current.notice}</p>}
      <fieldset disabled={busy} className="min-w-0"><AvatarEditorV3 value={choice} onChange={setChoice} /></fieldset>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className={button} disabled={busy || needsReview || !loaded} onClick={() => void save()}>Valider les modifications</button>
        <button type="button" className={button} disabled={busy} onClick={cancel}>Annuler</button>
        <button type="button" className={button} disabled={busy} onClick={() => setChoice(avatarConfigV3(DEFAULT_AVATAR_V3))}>Réinitialiser les choix</button>
        <button type="button" className={button} disabled={busy} onClick={() => void reread(false)}>Recharger la version enregistrée</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="mt-3 text-sm">{notice}</p>}
      {busy && <p role="status" className="mt-3 text-sm">Vérification en cours…</p>}
    </Modal>
  </section>
}
