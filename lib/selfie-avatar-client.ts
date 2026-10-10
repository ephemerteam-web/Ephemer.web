import { supabase } from './supabase-browser'
import {
  rasterInfo, SELFIE_INPUT_MAX_BYTES, SELFIE_INPUT_MAX_SIDE, SELFIE_SOURCE_MAX_BYTES,
  SELFIE_SOURCE_TYPES, SELFIE_OUTPUT_MAX_BYTES, SELFIE_OUTPUT_SIDE, SELFIE_PROMPT_VERSION,
  type GeneratedSelfieAvatar,
} from './selfie-avatar-contract'

/** Réencodage local : orientation du navigateur, proportions conservées, EXIF retiré. */
export async function prepareSelfie(file: File, signal: AbortSignal, quality = 0.9): Promise<File> {
  if (!(SELFIE_SOURCE_TYPES as readonly string[]).includes(file.type)) throw new Error('Choisis une photo JPEG, PNG ou WebP. Le format HEIC doit être converti en JPEG.')
  if (!file.size || file.size > SELFIE_SOURCE_MAX_BYTES) throw new Error('Choisis une photo de 10 Mo maximum.')
  const info = rasterInfo(new Uint8Array(await file.arrayBuffer()))
  if (info.type !== file.type || info.width * info.height > 40_000_000) throw new Error('Cette photo est invalide ou trop grande. Choisis une image de 40 mégapixels maximum.')
  signal.throwIfAborted()
  const url = URL.createObjectURL(file), image = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => { image.src = ''; reject(new DOMException('Préparation interrompue', 'AbortError')) }
      const clean = () => signal.removeEventListener('abort', abort)
      image.onload = () => { clean(); resolve() }
      image.onerror = () => { clean(); reject(new Error('Impossible de lire cette photo. Choisis un autre fichier.')) }
      signal.addEventListener('abort', abort, { once: true })
      image.src = url
    })
    signal.throwIfAborted()
    const scale = Math.min(1, SELFIE_INPUT_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Ton navigateur ne permet pas de préparer cette photo.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    canvas.width = canvas.height = 0
    signal.throwIfAborted()
    if (!blob || blob.size > SELFIE_INPUT_MAX_BYTES) throw new Error('Impossible de préparer cette photo. Choisis un autre fichier.')
    return new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
  } finally { URL.revokeObjectURL(url); image.src = '' }
}

async function boundedBody(response: Response, max: number) {
  if (!response.body || Number(response.headers.get('content-length')) > max) throw new Error('Réponse du serveur invalide.')
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > max) { await reader.cancel(); throw new Error('Réponse du serveur trop volumineuse.') }
      chunks.push(part.value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes
}

export async function requestSelfieAvatar(ownerId: string, photo: File, signal: AbortSignal): Promise<GeneratedSelfieAvatar> {
  if (navigator.onLine === false) throw new Error('Hors ligne : reconnecte-toi pour créer ton avatar.')
  const requireOwner = async () => {
    const { data, error } = await supabase.auth.getUser()
    signal.throwIfAborted()
    if (error || data.user?.id !== ownerId) throw new Error('La session a changé ou a expiré. Reconnecte-toi.')
  }
  await requireOwner()
  const { data, error } = await supabase.auth.getSession()
  signal.throwIfAborted()
  if (error || !data.session || data.session.user.id !== ownerId) throw new Error('Session expirée. Reconnecte-toi.')
  const form = new FormData()
  form.append('photo', photo)
  form.append('consent', 'true')
  const response = await fetch('/api/avatars/generate', {
    method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}` }, body: form,
    signal, cache: 'no-store', redirect: 'error',
  })
  if (!response.ok) {
    let message = response.status === 401 ? 'Session expirée. Reconnecte-toi.' : response.status === 429 ? 'La limite de génération est atteinte. Réessaie plus tard.' : 'La création de l’avatar est indisponible. Réessaie plus tard.'
    try {
      const body = JSON.parse(new TextDecoder().decode(await boundedBody(response, 16 * 1024)))
      if (typeof body?.error?.message === 'string' && body.error.message.length <= 500) message = body.error.message
    } catch { /* Garder le message français de secours. */ }
    throw new Error(message)
  }
  const bytes = await boundedBody(response, SELFIE_OUTPUT_MAX_BYTES)
  const info = rasterInfo(bytes), version = response.headers.get('X-Ephemer-Avatar-Prompt')
  if (version !== SELFIE_PROMPT_VERSION || info.type !== response.headers.get('Content-Type') || info.width !== SELFIE_OUTPUT_SIDE || info.height !== SELFIE_OUTPUT_SIDE) throw new Error('Le format de l’avatar reçu est incorrect.')
  await requireOwner()
  const extension = info.type === 'image/jpeg' ? 'jpg' : info.type === 'image/webp' ? 'webp' : 'png'
  return { file: new File([bytes], `avatar-ephemer.${extension}`, { type: info.type }), promptVersion: SELFIE_PROMPT_VERSION }
}
