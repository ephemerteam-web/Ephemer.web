'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { prepareSelfie, requestSelfieAvatar } from '@/lib/selfie-avatar-client'
import { SELFIE_PROMPT_VERSION, type GeneratedSelfieAvatar } from '@/lib/selfie-avatar-contract'
import { preparePortrait } from '@/lib/portrait-avatar-client'
import { loadAvatar, savePortraitAvatar } from '@/lib/avatar-data'
import { useDashboardAvatar } from './DashboardAvatarContext'

export type SelfieAvatarGeneratorProps = {
  ownerId: string
  onGenerated?: (avatar: GeneratedSelfieAvatar) => void
  allowSave?: boolean
}
type Preview = { file: File; url: string }
const button = 'min-h-11 rounded-xl border border-line px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50'

/** Le changement de propriétaire démonte immédiatement toute saisie de l’ancien compte. */
export default function SelfieAvatarGenerator(props: SelfieAvatarGeneratorProps) {
  return <SelfieAvatarSession key={props.ownerId} {...props} />
}

function SelfieAvatarSession({ ownerId, onGenerated, allowSave = false }: SelfieAvatarGeneratorProps) {
  const { updateAvatar, revision: savedRevision, portrait } = useDashboardAvatar()
  const id = useId(), input = useRef<HTMLInputElement>(null)
  const work = useRef({ revision: 0, controller: null as AbortController | null, urls: new Set<string>() })
  const [photo, setPhoto] = useState<Preview | null>(null)
  const [avatar, setAvatar] = useState<Preview | null>(null)
  const [consent, setConsent] = useState(false)
  const [stage, setStage] = useState<'idle' | 'preparing' | 'generating' | 'saving'>('idle')
  const [saved, setSaved] = useState(false)
  const lock = useRef(false)
  const baseRevision = useRef<number | null>(null)
  const [message, setMessage] = useState('')
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)
  const busy = stage !== 'idle'

  function clear() {
    work.current.revision++
    work.current.controller?.abort()
    work.current.controller = null
    for (const url of work.current.urls) URL.revokeObjectURL(url)
    work.current.urls.clear()
    setPhoto(null); setAvatar(null); setConsent(false); setStage('idle'); setMessage(''); setSaved(false)
    if (input.current) input.current.value = ''
  }
  function preview(file: File): Preview {
    const url = URL.createObjectURL(file)
    work.current.urls.add(url)
    return { file, url }
  }

  useEffect(() => {
    const current = work.current
    const connected = () => setOnline(true)
    const disconnected = () => { setOnline(false); current.controller?.abort() }
    window.addEventListener('online', connected)
    window.addEventListener('offline', disconnected)
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== ownerId) { clear(); setMessage('La session a changé ou a expiré. Reconnecte-toi.') }
    })
    return () => {
      window.removeEventListener('online', connected)
      window.removeEventListener('offline', disconnected)
      data.subscription.unsubscribe()
      current.revision++
      current.controller?.abort()
      for (const url of current.urls) URL.revokeObjectURL(url)
      current.urls.clear()
    }
  }, [ownerId])

  async function choose(file?: File) {
    clear()
    if (!file) return
    const revision = work.current.revision, controller = new AbortController()
    work.current.controller = controller
    setStage('preparing')
    try {
      const prepared = await prepareSelfie(file, controller.signal)
      if (revision === work.current.revision && !controller.signal.aborted) setPhoto(preview(prepared))
    } catch (error) {
      if (revision === work.current.revision && !controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Impossible de préparer cette photo.')
    } finally {
      if (revision === work.current.revision) { setStage('idle'); work.current.controller = null }
    }
  }

  async function generate() {
    if (!photo || !consent || busy || lock.current) return
    if (!navigator.onLine) { setOnline(false); return }
    const revision = work.current.revision, controller = new AbortController()
    work.current.controller = controller
    if (avatar) { URL.revokeObjectURL(avatar.url); work.current.urls.delete(avatar.url) }
    setAvatar(null); setStage('generating'); setMessage(''); setSaved(false)
    const timeout = window.setTimeout(() => controller.abort(), 90000)
    try {
      if (allowSave) {
        const row = await loadAvatar(ownerId)
        if (revision !== work.current.revision || controller.signal.aborted) return
        baseRevision.current = row?.revision ?? null
      }
      const generated = await requestSelfieAvatar(ownerId, photo.file, controller.signal)
      if (revision !== work.current.revision || controller.signal.aborted) return
      setAvatar(preview(generated.file))
      setMessage('Ton avatar est prêt. Tu peux le télécharger ; il n’est pas encore enregistré dans ton profil.')
      // Une erreur du futur parent ne doit pas invalider l’image déjà reçue.
      try { onGenerated?.(generated) } catch { setMessage('Ton avatar est prêt et téléchargeable. Sa transmission à la page a échoué.') }
    } catch (error) {
      if (revision === work.current.revision) setMessage(controller.signal.aborted ? 'La génération a été interrompue. Tu peux réessayer quand la connexion est disponible.' : error instanceof Error ? error.message : 'La création de l’avatar est indisponible.')
    } finally {
      window.clearTimeout(timeout)
      if (revision === work.current.revision) { setStage('idle'); work.current.controller = null }
    }
  }

  async function save() {
    if (!avatar || saved || busy || lock.current || savedRevision === undefined || !navigator.onLine) return
    lock.current = true
    const revision = work.current.revision, controller = new AbortController()
    work.current.controller = controller
    setStage('saving'); setMessage('')
    try {
      const prepared = await preparePortrait({ file: avatar.file, promptVersion: SELFIE_PROMPT_VERSION }, (baseRevision.current ?? 0) + 1, controller.signal)
      const row = await savePortraitAvatar(ownerId, baseRevision.current, prepared, controller.signal)
      if (revision !== work.current.revision || controller.signal.aborted) return
      updateAvatar(row); setSaved(true); setMessage('Ton avatar IA est enregistré et apparaît maintenant dans ton profil.')
    } catch (error) {
      if (revision === work.current.revision) setMessage(controller.signal.aborted ? 'Enregistrement interrompu. Recharge ton profil pour vérifier si le portrait a été enregistré.' : error instanceof Error ? error.message : 'Impossible d’enregistrer ton avatar. Ton aperçu reste disponible.')
    } finally {
      lock.current = false
      if (revision === work.current.revision) { setStage('idle'); work.current.controller = null }
    }
  }

  return <section aria-labelledby={`${id}-title`} className="rounded-2xl border border-line bg-surface p-4 text-ink sm:p-6">
    <h2 id={`${id}-title`} className="text-xl font-semibold">Ton portrait céleste</h2>
    {allowSave && portrait && <figure className="mt-4"><div className="h-24 w-24 overflow-hidden rounded-full border border-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={portrait.image} alt="Ton portrait IA enregistré" className="h-full w-full object-cover" />
    </div><figcaption className="mt-2 text-sm text-muted">Ton avatar de profil enregistré</figcaption></figure>}
    <p id={`${id}-help`} className="mt-2 text-sm text-muted">Choisis un selfie avec une seule personne et un visage suffisamment net. JPEG, PNG ou WebP, jusqu’à 10 Mo.</p>
    <p className="mt-2 text-sm text-muted">Un portrait illustré fidèle à ton selfie, avec la couleur de ton vêtement, une grande lune et des étoiles. Ta photo actuelle est la seule référence envoyée à Cloudflare lorsque tu demandes la création ; elle reste temporaire dans l’application.</p>
    <label htmlFor={`${id}-photo`} className="mt-5 block text-sm font-medium">Ta photo</label>
    <input ref={input} id={`${id}-photo`} type="file" disabled={stage === 'saving'} accept="image/jpeg,image/png,image/webp" aria-describedby={`${id}-help`} className="mt-2 block w-full min-w-0 text-sm file:mr-3 file:min-h-11 file:rounded-xl file:border file:border-line file:bg-surface file:px-3 file:text-ink" onChange={event => { void choose(event.currentTarget.files?.[0]) }} />
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {photo && <figure className="min-w-0"><div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface">
        {/* Images locales privées : pas de proxy d’optimisation ou de cache Next. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="Aperçu de ta photo préparée" className="h-full w-full object-contain" />
      </div><figcaption className="mt-2 text-sm text-muted">Ta photo préparée</figcaption></figure>}
      {avatar && <figure className="min-w-0"><div className="aspect-square overflow-hidden rounded-2xl border border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar.url} alt="Ton avatar céleste généré" className="h-full w-full object-contain" />
      </div><figcaption className="mt-2 text-sm text-muted">{saved ? 'Ton avatar — enregistré dans ton profil' : 'Ton avatar — aperçu temporaire'}</figcaption></figure>}
    </div>
    <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} disabled={!photo || busy} onChange={event => setConsent(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-accent" /><span>J’autorise l’envoi de ma photo à Cloudflare pour créer cet avatar.</span></label>
    {!online && <p role="status" className="mt-3 text-sm text-muted">Hors ligne : reconnecte-toi pour créer ou enregistrer ton avatar. L’aperçu et le téléchargement restent disponibles.</p>}
    <p role="status" aria-live="polite" aria-atomic="true" className="mt-3 text-sm text-muted">{stage === 'preparing' ? 'Préparation de ta photo…' : stage === 'generating' ? 'Création de ton avatar…' : stage === 'saving' ? 'Enregistrement de ton avatar…' : message}</p>
    {allowSave && avatar && savedRevision === undefined && !saved && <p role="status" className="mt-2 text-sm text-muted">Reconnecte-toi ou recharge ton profil pour vérifier l’avatar enregistré avant de le remplacer.</p>}
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" disabled={!photo || !consent || busy || !online} onClick={() => { void generate() }} className={`${button} bg-action text-on-action hover:bg-action-hover`}>Créer mon avatar</button>
      {avatar && <a href={avatar.url} download={avatar.file.name} className={button}>Télécharger</a>}
      {allowSave && avatar && <button type="button" disabled={saved || busy || !online || savedRevision === undefined} onClick={() => { void save() }} className={`${button} bg-action text-on-action hover:bg-action-hover`}>{saved ? 'Avatar enregistré' : 'Valider et enregistrer'}</button>}
      {(photo || busy || message) && <button type="button" disabled={stage === 'saving'} onClick={clear} className={button}>Effacer</button>}
    </div>
  </section>
}
