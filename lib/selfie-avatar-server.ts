import 'server-only'
import { randomInt } from 'node:crypto'
import { supabaseAdmin } from './supabase-admin'
import { consommerQuotaIA } from './garde-ia'
import { limitedJSON } from './ai-transport'
import {
  SelfieAvatarError, rasterInfo, validateSelfieInput, SELFIE_BODY_MAX_BYTES,
  SELFIE_OUTPUT_MAX_BYTES, SELFIE_OUTPUT_SIDE, SELFIE_PROMPT_VERSION,
} from './selfie-avatar-contract'

export const SELFIE_MODEL = '@cf/black-forest-labs/flux-2-klein-4b'
// Une seule pose est tirée au sort côté serveur, avec la même probabilité pour chacune.
// Gauche et droite désignent toujours les côtés de l’image vus par le spectateur.
export const SELFIE_POSES = [
  'Face : tête et épaules de face, tête droite, regard vers l’objectif, posture naturelle et détendue.',
  'Légère rotation vers la gauche de l’image : épaules et visage tournés d’environ 15 degrés vers la gauche, regard revenu vers l’objectif, les deux yeux bien visibles.',
  'Légère rotation vers la droite de l’image : épaules et visage tournés d’environ 15 degrés vers la droite, regard revenu vers l’objectif, les deux yeux bien visibles.',
  'Trois quarts vers la gauche de l’image : épaules tournées d’environ 35 degrés et visage d’environ 30 degrés vers la gauche, regard vers l’objectif, les deux yeux visibles et anatomiquement cohérents.',
  'Trois quarts vers la droite de l’image : épaules tournées d’environ 35 degrés et visage d’environ 30 degrés vers la droite, regard vers l’objectif, les deux yeux visibles et anatomiquement cohérents.',
] as const

// Retouche compatible du 17/10/2026 : traits visibles fidèles et cinq poses, contrat celeste-cartoon-v1 conservé.
export const SELFIE_PROMPT = `Transforme la personne de l’image 0 en portrait illustré 2D fidèle et immédiatement reconnaissable. Cette photo est l’unique référence pour son apparence. La fidélité au visage et à ses couleurs est la priorité absolue : lorsqu’un choix de stylisation entre en conflit avec la ressemblance, conserve les caractéristiques du selfie.

Reproduis précisément les yeux visibles : leur forme, leur taille, leur espacement, leur inclinaison, l’ouverture et les plis des paupières, ainsi que la couleur et les nuances visibles des iris. Respecte les différences naturelles entre les deux yeux. Ne les agrandis pas, ne les arrondis pas et ne les remplace pas par des yeux de dessin génériques. Ne change pas la couleur des iris.

Préserve la morphologie propre à cette personne dans toute sa diversité. Si le selfie montre des yeux en amande, une ouverture étroite, une paupière supérieure sans pli visible ou un épicanthus (pli au coin interne de l’œil), conserve exactement ces caractéristiques sans les atténuer, les accentuer ni ajouter un pli absent. Reproduis de même la largeur et le relief du nez, les narines, le volume et le contour des lèvres, les pommettes et la texture naturelle des cheveux. Chaque caractéristique doit venir de la photo : ne déduis ni n’attribue une origine ethnique et n’applique aucun visage stéréotypé. Garde les particularités observées même lorsque la tête change d’orientation.

Conserve la teinte et le sous-ton de la peau visibles sur la photo, avec leurs variations naturelles, les taches de rousseur et les grains de beauté visibles. N’éclaircis pas et n’assombris pas la carnation, n’ajoute pas de bronzage et évite le lissage excessif de la peau.

Préserve précisément la forme et les proportions du visage, ses asymétries naturelles, la mâchoire, les joues, le nez, les lèvres et les sourcils. Conserve l’âge apparent, la coiffure, la ligne des cheveux, la pilosité et l’expression visibles sur la photo. N’embellis pas le visage en modifiant ses traits, ne le rajeunis pas et ne remplace pas ses particularités par un visage standard. Si un détail est peu lisible, reste au plus près de ce qui est visible sans inventer une couleur d’yeux ni imposer un trait générique.

Reprends exactement les accessoires présents. Si la personne porte des lunettes, conserve leur forme et leur couleur. Sinon, représente le visage avec les yeux et les tempes entièrement dégagés.

Dessine un t-shirt dont la couleur correspond au vêtement visible sur la photo. Pour un vêtement multicolore, reprends sa couleur dominante. Si aucun vêtement n’est visible, utilise un t-shirt uni crème.

Illustration dessinée avec une stylisation légère, des contours fins et précis et des ombres douces. Utilise un éclairage neutre sur la personne pour conserver les couleurs du selfie. Réserve le bleu nuit et les reflets dorés au décor : aucune dominante bleue ou dorée sur la peau ou les iris. Conserve les proportions naturelles du visage en les adaptant uniquement à la perspective de la pose retenue ci-dessous. Applique cette seule pose, sans reprendre obligatoirement l’orientation du selfie et sans produire de planche de variantes. Portrait professionnel et accessible : tête droite sans inclinaison latérale, épaules détendues, appareil à hauteur des yeux, perspective naturelle sans effet grand-angle ni raccourci marqué. Conserve l’expression du selfie. Cadrage du haut du buste, tête et cheveux entièrement visibles avec une marge au-dessus et sur les côtés, visage suffisamment grand et centré pour rester reconnaissable dans un avatar circulaire.

Fond bleu nuit avec une grande lune croissante ivoire et dorée derrière la personne et quelques étoiles dorées. La position des étoiles et les détails de la lune peuvent légèrement varier entre les générations. Une seule personne, vêtement sans inscription, aucun texte ni logo.`

/** Nouveau tirage pour chaque appel fournisseur, sans historique de photo ni de pose. */
export function buildSelfiePrompt() {
  const pose = SELFIE_POSES[randomInt(SELFIE_POSES.length)]
  return `${SELFIE_PROMPT}\n\nPose retenue pour cette génération (une seule) : ${pose}`
}

type QuotaResult = Awaited<ReturnType<typeof consommerQuotaIA>>
type Dependencies = {
  verifyUser: (token: string) => Promise<string | null>
  consumeQuota: (userId: string) => Promise<QuotaResult>
  fetch: typeof fetch
  env: NodeJS.ProcessEnv
  timeout: () => AbortSignal
}
const defaults: Dependencies = {
  verifyUser: async token => {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    return error ? null : data.user?.id ?? null
  },
  consumeQuota: consommerQuotaIA,
  fetch: (...args) => fetch(...args),
  env: process.env,
  timeout: () => AbortSignal.timeout(60000),
}
const privateHeaders = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }

async function readPhoto(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) throw new SelfieAvatarError('Envoie une photo depuis le formulaire.')
  if (Number(request.headers.get('content-length')) > SELFIE_BODY_MAX_BYTES) throw new SelfieAvatarError('Photo trop volumineuse.', 413)
  if (!request.body) throw new SelfieAvatarError('Choisis une photo.')
  const reader = request.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > SELFIE_BODY_MAX_BYTES) { await reader.cancel(); throw new SelfieAvatarError('Photo trop volumineuse.', 413) }
      chunks.push(part.value)
    }
  } finally { reader.releaseLock() }
  let form: FormData
  try { form = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers.get('content-type')! } }).formData() }
  catch { throw new SelfieAvatarError('Le formulaire est invalide.') }
  if ([...form.keys()].some(key => !['photo', 'consent'].includes(key)) || form.getAll('photo').length !== 1 || form.getAll('consent').length !== 1) {
    throw new SelfieAvatarError('Le formulaire est invalide.')
  }
  if (form.get('consent') !== 'true') throw new SelfieAvatarError('Autorise l’envoi de ta photo à Cloudflare pour créer ton avatar.', 400, 'CONSENTEMENT_REQUIS')
  const photo = form.get('photo')
  if (!(photo instanceof Blob) || photo.type !== 'image/jpeg') throw new SelfieAvatarError('Choisis une photo préparée en JPEG.')
  const bytes = new Uint8Array(await photo.arrayBuffer())
  validateSelfieInput(bytes)
  return bytes
}

/** Point d’entrée testable avec fournisseur, identité et quota simulés. */
export async function generateSelfieAvatar(request: Request, overrides: Partial<Dependencies> = {}) {
  const deps = { ...defaults, ...overrides }
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1]
    if (!token) throw new SelfieAvatarError('Tu dois être connecté.', 401, 'SESSION_EXPIREE')
    const userId = await deps.verifyUser(token)
    if (!userId) throw new SelfieAvatarError('Session expirée. Reconnecte-toi.', 401, 'SESSION_EXPIREE')
    const photo = await readPhoto(request)
    const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: apiToken, EPHEMER_AVATAR_AI_ENABLED: enabled } = deps.env
    if (enabled !== 'true' || !account || !/^[a-f0-9]{32}$/i.test(account) || !apiToken) {
      throw new SelfieAvatarError('La création d’avatars attend sa configuration Cloudflare.', 503, 'SERVICE_INDISPONIBLE')
    }
    const signal = AbortSignal.any([request.signal, deps.timeout()])
    signal.throwIfAborted()
    const quota = await deps.consumeQuota(userId)
    if (!quota.ok) throw new SelfieAvatarError(quota.message, quota.status, quota.status === 429 ? 'QUOTA_UTILISATEUR' : 'SERVICE_INDISPONIBLE')
    signal.throwIfAborted()
    const form = new FormData()
    form.append('input_image_0', new Blob([Uint8Array.from(photo)], { type: 'image/jpeg' }), 'selfie.jpg')
    form.append('prompt', buildSelfiePrompt())
    form.append('width', String(SELFIE_OUTPUT_SIDE))
    form.append('height', String(SELFIE_OUTPUT_SIDE))
    const response = await deps.fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${SELFIE_MODEL}`, {
      method: 'POST', headers: { Authorization: `Bearer ${apiToken}` }, body: form, signal, cache: 'no-store', redirect: 'error',
    })
    if (response.status === 429) {
      await response.body?.cancel()
      throw new SelfieAvatarError('La limite Cloudflare est atteinte. Réessaie plus tard.', 429, 'QUOTA_CLOUDFLARE')
    }
    if (!response.ok) { await response.body?.cancel(); throw new SelfieAvatarError('Cloudflare est temporairement indisponible. Réessaie plus tard.', 502, 'FOURNISSEUR_INDISPONIBLE') }
    const data = await limitedJSON(response, 12 * 1024 * 1024, 502) as { success?: boolean; result?: { image?: unknown } } | null
    signal.throwIfAborted()
    const encoded = data?.result?.image
    if (data?.success !== true || typeof encoded !== 'string' || !encoded.length || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw new SelfieAvatarError('Cloudflare n’a pas retourné d’image utilisable.', 502, 'REPONSE_INVALIDE')
    }
    const bytes = Buffer.from(encoded, 'base64')
    if (bytes.length > SELFIE_OUTPUT_MAX_BYTES) throw new SelfieAvatarError('L’image générée est trop volumineuse.', 502, 'REPONSE_INVALIDE')
    let info
    try { info = rasterInfo(bytes) } catch { throw new SelfieAvatarError('L’image générée est invalide.', 502, 'REPONSE_INVALIDE') }
    if (info.width !== SELFIE_OUTPUT_SIDE || info.height !== SELFIE_OUTPUT_SIDE) throw new SelfieAvatarError('Le format de l’avatar reçu est incorrect.', 502, 'REPONSE_INVALIDE')
    return new Response(bytes, { headers: { ...privateHeaders, 'Content-Type': info.type, 'X-Ephemer-Avatar-Prompt': SELFIE_PROMPT_VERSION } })
  } catch (error) {
    const known = error instanceof SelfieAvatarError
    const expired = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)
    return Response.json({ error: {
      code: known ? error.code : expired ? 'DELAI_DEPASSE' : 'SERVICE_INDISPONIBLE',
      message: known ? error.message : expired ? 'La génération a été interrompue ou a pris trop de temps. Tu peux réessayer.' : 'La création de l’avatar est indisponible. Réessaie plus tard.',
    } }, { status: known ? error.status : expired ? 504 : 502, headers: privateHeaders })
  }
}
