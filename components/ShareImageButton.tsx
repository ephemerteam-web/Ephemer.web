'use client'
import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import CardRenderer from './cards/CardRenderer'
import AvatarRenderer from './avatars/AvatarRenderer'
import type { AvatarRenderConfig } from '@/lib/avatar-render-config'
import type { PublishedCardSnapshot } from '@/lib/published-card'
import { collectiveImageSnapshot } from '@/lib/collective-card'
import { defaultImageFields, downloadImage, prepareImages, selectedImageFields, type ImageField } from '@/lib/share-image'

type ImageShareProps = { title: string; fields?: ImageField[]; snapshot?: PublishedCardSnapshot; label?: string; avatarSnapshot?: AvatarRenderConfig | null; access?: { key: string; expiresAt: string; validate: () => Promise<void> } }
export default function ShareImageButton(props: ImageShareProps) {
  // Repartir de zéro si le contenu change : aucun fichier devenu obsolète.
  return <ImageShare key={JSON.stringify(props)} {...props} />
}
function ImageShare({ title, fields = [], snapshot, avatarSnapshot, access, label = 'Partager en image' }: ImageShareProps) {
  const [open, setOpen] = useState(false), [selected, setSelected] = useState(() => defaultImageFields(fields)), [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('')
  const [signature, setSignature] = useState(true), [avatar, setAvatar] = useState(true)
  const [showTitle, setShowTitle] = useState(true)
  const node = useRef<HTMLDivElement>(null), epoch = useRef(0), lock = useRef(false)
  useEffect(() => () => { epoch.current++ }, [])
  const validateAccess = useRef(access?.validate)
  const accessKey = access?.key, expiresAt = access?.expiresAt
  useEffect(() => { validateAccess.current = access?.validate })
  useEffect(() => {
    if (!accessKey || !expiresAt) return
    const invalidate = () => { epoch.current++; setFiles([]); setOpen(false); setBusy(false) }
    const expiration = Date.parse(expiresAt)
    let timer: ReturnType<typeof setTimeout>
    function checkExpiration() {
      const remaining = expiration - Date.now()
      timer = setTimeout(() => { if (!Number.isFinite(expiration) || expiration <= Date.now()) invalidate(); else checkExpiration() }, Number.isFinite(remaining) ? Math.min(Math.max(remaining, 0), 2147483647) : 0)
    }
    checkExpiration()
    window.addEventListener('offline', invalidate)
    return () => { clearTimeout(timer); window.removeEventListener('offline', invalidate) }
  }, [accessKey, expiresAt])
  function allowed() { return !access || (navigator.onLine && Date.parse(access.expiresAt) > Date.now()) }
  function close() { epoch.current++; setOpen(false); setFiles([]); setNotice('') }
  async function prepare() {
    if (!node.current || lock.current || !allowed()) return
    const run = ++epoch.current; lock.current = true; setBusy(true); setNotice(''); setFiles([])
    try {
      if (access) await validateAccess.current?.()
      if (run !== epoch.current || !allowed()) return
      const result = await prepareImages(node.current)
      if (run === epoch.current && allowed()) setFiles(result)
    }
    catch (error) { if (run === epoch.current) setNotice(snapshot?.format === 3 && error instanceof Error && error.message.includes('contenu est trop long') ? 'La carte dépasse vingt images. Partage son lien ou prépare une nouvelle version plus courte.' : error instanceof Error ? error.message : 'Image indisponible. Réessaie.') }
    finally { lock.current = false; if (run === epoch.current) setBusy(false) }
  }
  async function share() {
    if (!allowed() || !files.length) { close(); return }
    const run = epoch.current
    try { await navigator.share({ title: 'Une image Ephemer', files }); if (run === epoch.current) setNotice('Menu de partage terminé.') }
    catch (error) { if (run === epoch.current) setNotice((error as Error).name === 'AbortError' ? 'Partage annulé. Les images restent prêtes.' : 'Partage indisponible. Télécharge les images ci-dessous.') }
  }
  const button = 'min-h-11 rounded-xl border border-line px-4 py-2 text-sm text-accent disabled:opacity-50'
  const imageSnapshot = snapshot?.format === 3 ? collectiveImageSnapshot(snapshot, signature, avatar) : snapshot ? { ...snapshot, signature: signature ? snapshot.signature : '', ...(snapshot.format === 2 ? { avatar: avatar ? snapshot.avatar : null } : {}) } : null
  return <><button type="button" className={button} onClick={() => { if (allowed()) { setBusy(false); setOpen(true) } }}>{label}</button>
    <Modal open={open} onClose={close} title="Partager en image" className="w-[min(720px,95vw)]">
      <div className="space-y-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Partager en image</h3><button type="button" className={button} onClick={close}>Fermer</button></div>
        <p className="text-sm text-muted">Choisis le contenu, vérifie l’aperçu, puis prépare l’image. Aucun lien n’est créé.</p>
        {!snapshot && <fieldset disabled={busy} className="space-y-1"><legend className="font-semibold">Champs à inclure</legend><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={showTitle} onChange={event => { setFiles([]); setShowTitle(event.target.checked) }} />Titre : {title}</label>{fields.filter(field => field.value).map(field => <label className="flex min-h-11 items-center gap-2 text-sm" key={field.id}><input type="checkbox" checked={selected.includes(field.id)} onChange={event => { setFiles([]); setNotice(''); setSelected(event.target.checked ? [...selected, field.id] : selected.filter(id => id !== field.id)) }} />{field.label}{field.sensitive && ' (personnel, facultatif)'}</label>)}</fieldset>}
        {snapshot && <fieldset disabled={busy}><legend>Champs à inclure avec le message</legend><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={signature} onChange={event => { setFiles([]); setSignature(event.target.checked) }} />{snapshot.format === 3 ? 'Signatures choisies' : 'Signature choisie'}</label>{((snapshot.format === 2 && snapshot.avatar) || snapshot.format === 3) && <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={avatar} onChange={event => { setFiles([]); setAvatar(event.target.checked) }} />{snapshot.format === 3 ? 'Avatars de cette version' : 'Avatar de cette carte'}</label>}</fieldset>}
        {avatarSnapshot && <label className="flex min-h-11 items-center gap-2"><input type="checkbox" disabled={busy} checked={avatar} onChange={event => { setFiles([]); setAvatar(event.target.checked) }} />Mon avatar enregistré</label>}
        <div className="overflow-x-auto rounded-xl border border-line focus-visible:outline-2 focus-visible:outline-accent" tabIndex={0} aria-label="Aperçu de l’image, défilement horizontal possible"><div ref={node} style={{ width: 640, padding: snapshot ? 0 : 40, background: '#111827', color: '#f3f4f6', fontFamily: 'Arial, sans-serif', boxSizing: 'border-box', overflowWrap: 'anywhere' }}>
          {avatarSnapshot && avatar && <div style={{ width: 100, marginBottom: 24 }}><AvatarRenderer config={avatarSnapshot} decorative /></div>}
          {imageSnapshot ? <CardRenderer snapshot={imageSnapshot} /> : <><p style={{ color: '#c8a84e', fontSize: 15, margin: '0 0 24px' }}>Ephemer · Célébrations</p>{showTitle && <h2 style={{ fontSize: 32, margin: '0 0 24px' }}>{title}</h2>}{selectedImageFields(fields, selected).map(field => <div key={field.id} style={{ marginBottom: 24 }}><p style={{ fontSize: 15, color: '#c8a84e', margin: '0 0 8px' }}>{field.label}</p><p style={{ fontSize: 22, lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>{field.value}</p></div>)}</>}
        </div></div>
        {!files.length && <button type="button" className={button} disabled={busy} onClick={() => void prepare()}>{busy ? 'Préparation…' : 'Préparer l’image'}</button>}
        {!!files.length && <PreparedImages key={files.map(file => file.name + file.lastModified).join()} files={files} />}
        {!!files.length && typeof navigator.share === 'function' && navigator.canShare?.({ files }) && <button type="button" className={button} onClick={() => void share()}>Partager…</button>}
        {files.map((file, index) => <button key={file.name} type="button" className={button} onClick={() => { if (allowed()) downloadImage(file); else close() }}>Télécharger{files.length > 1 ? ` l’image ${index + 1}/${files.length}` : ' le PNG'}</button>)}
        {notice && <p role="status" className="text-sm">{notice}</p>}
      </div>
    </Modal></>
}
function PreparedImages({ files }: { files: File[] }) {
  return <div className="space-y-2"><p className="text-sm">PNG prêt{files.length > 1 ? ` : ${files.length} images, dans l’ordre.` : '.'} Vérifie le résultat avant de partager.</p>{files.map((file, i) => <PreparedImage key={file.name} file={file} index={i} />)}</div>
}
function PreparedImage({ file, index }: { file: File; index: number }) {
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => { const url = URL.createObjectURL(file); if (ref.current) ref.current.src = url; return () => URL.revokeObjectURL(url) }, [file])
  // URL blob locale : aucune optimisation serveur ne doit recevoir cette image privée.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} alt={'Image préparée ' + (index + 1)} className="h-auto w-full" />
}
