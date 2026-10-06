// 📡 Lecture bornée des requêtes et réponses ; aucune donnée privée dans les erreurs.
import { AIInputError } from './ai-options'
export async function limitedJSON(source: Request | Response, limit: number, invalidStatus: number) {
  if (Number(source.headers.get('content-length')) > limit) throw new AIInputError('Contenu trop volumineux.', invalidStatus === 400 ? 413 : 502)
  if (!source.body) throw new AIInputError('Contenu vide.', invalidStatus)
  const reader = source.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > limit) { await reader.cancel(); throw new AIInputError('Contenu trop volumineux.', invalidStatus === 400 ? 413 : 502) }
      chunks.push(part.value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown }
  catch { throw new AIInputError('Contenu JSON invalide.', invalidStatus) }
}
export async function aiRequest(request: Request): Promise<Record<string, unknown>> {
  const body = await limitedJSON(request, 16 * 1024, 400)
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AIInputError('Requête invalide.')
  return body as Record<string, unknown>
}
export async function providerText(response: Response, maxLength: number) {
  const data = await limitedJSON(response, 64 * 1024, 502) as { choices?: { message?: { content?: unknown } }[] } | null
  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim() || text.length > maxLength) throw new AIInputError('Réponse IA inutilisable. Réessaie.', 502)
  return text.trim()
}
