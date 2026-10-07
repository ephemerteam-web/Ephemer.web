// 💌 Contrat de rendu indépendant de la base. Ne pas modifier un rendu déjà publié : créer une version suivante.
export const CARD_TEMPLATES = [
  { id: 'clair_de_lune', label: 'Clair de lune', description: 'Une lune dorée dans un ciel bleu profond.' },
  { id: 'constellation', label: 'Constellation', description: 'Des étoiles reliées sur un papier lumineux.' },
  { id: 'aurore', label: 'Aurore', description: 'Des rubans célestes aux couleurs douces.' },
] as const
export type CardTemplateId = typeof CARD_TEMPLATES[number]['id']
export const CARD_EXPIRY_DAYS = [7, 30, 90, 365] as const
export const CARD_MESSAGE_LIMIT = 10000
export const CARD_SIGNATURE_LIMIT = 200
export type CardSnapshotV1 = {
  format: 1; templateId: CardTemplateId; templateVersion: 1; renderVersion: 1
  message: string; signature: string
}
export type CardShareStatus = { revision: number; versionId: string | null; linkId: string | null; state: 'absent' | 'actif' | 'expire' | 'revoque'; expiresAt: string | null; published: CardSnapshotV1 | null }
export type PublicCard = { content: CardSnapshotV1; expiresAt: string }
export function publicCard(input: unknown, now = Date.now()): PublicCard {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Cette carte est indisponible')
  const value = input as Record<string, unknown>
  if (typeof value.expiresAt !== 'string' || !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= now) throw new Error('Cette carte est indisponible')
  return { content: cardSnapshot(value.content, true), expiresAt: value.expiresAt }
}
const snapshotKeys = ['format', 'templateId', 'templateVersion', 'renderVersion', 'message', 'signature']
export function isCardTemplate(value: unknown): value is CardTemplateId {
  return CARD_TEMPLATES.some(template => template.id === value)
}
function boundedText(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.length <= limit * 2 && Array.from(value).length <= limit && !value.includes('\u0000')
}
/** Refuser une version inconnue plutôt que remplacer silencieusement une carte publiée. */
export function cardSnapshot(input: unknown, published = false): CardSnapshotV1 {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Carte invalide.')
  const value = input as Record<string, unknown>
  if (Object.keys(value).length !== snapshotKeys.length || Object.keys(value).some(key => !snapshotKeys.includes(key)) ||
    value.format !== 1 || value.templateVersion !== 1 || value.renderVersion !== 1 || !isCardTemplate(value.templateId) ||
    !boundedText(value.message, CARD_MESSAGE_LIMIT) || !boundedText(value.signature, CARD_SIGNATURE_LIMIT) ||
    (published && !value.message.trim())) throw new Error('Carte invalide ou version non prise en charge.')
  // Projection fermée : aucune propriété personnelle additionnelle n'est propagée.
  return { format: 1, templateId: value.templateId, templateVersion: 1, renderVersion: 1, message: value.message, signature: value.signature }
}
