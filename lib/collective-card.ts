// Contrat de contenu seulement : aucun compte, lien, adresse ou état privé dans une image publiée.
import { avatarRenderConfig, type AvatarRenderConfig } from './avatar-render-config'
import { isCardTemplate, type CardTemplateId } from './cards'

export const COLLECTIVE_CARDS_ENABLED = true // Catalogue 01–03 confirmé ; accès toujours soumis au verrou SQL manuel.
export const COLLECTIVE_CARD_LIMIT = 30
export const COLLECTIVE_MESSAGE_LIMIT = 2000
export const COLLECTIVE_SIGNATURE_LIMIT = 200
export const COLLECTIVE_COPY_NOTICE = 'La carte publiée pourra être partagée en image. Retirer ta contribution révoquera les liens concernés, mais ne pourra pas effacer les copies déjà reçues ou téléchargées.'
export type CollectiveSignature = { message: string; signature: string; avatar: AvatarRenderConfig | null }
export type CollectiveCardSnapshot = {
  format: 3; renderVersion: 3; templateVersion: 1; templateId: CardTemplateId
  title: string; contributions: CollectiveSignature[]
}
export function closedCollectiveObject(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Carte collective invalide.')
  const row = value as Record<string, unknown>
  if (Object.keys(row).length !== keys.length || Object.keys(row).some(key => !keys.includes(key))) throw new Error('Champs de carte collective invalides.')
  return row
}
export function collectiveText(value: unknown, limit: number, required = false): string {
  if (typeof value !== 'string' || value.length > limit * 2 || [...value].length > limit || value.includes('\u0000') || (required && !value.trim())) throw new Error('Texte de carte invalide ou trop long.')
  return value
}
export function collectiveSignature(value: unknown): CollectiveSignature {
  const row = closedCollectiveObject(value, ['message', 'signature', 'avatar'])
  return { message: collectiveText(row.message, COLLECTIVE_MESSAGE_LIMIT, true), signature: collectiveText(row.signature, COLLECTIVE_SIGNATURE_LIMIT), avatar: row.avatar === null ? null : avatarRenderConfig(row.avatar) }
}
export function collectiveCardSnapshot(value: unknown): CollectiveCardSnapshot {
  const row = closedCollectiveObject(value, ['format', 'renderVersion', 'templateVersion', 'templateId', 'title', 'contributions'])
  if (row.format !== 3 || row.renderVersion !== 3 || row.templateVersion !== 1 || !isCardTemplate(row.templateId) || !Array.isArray(row.contributions) || row.contributions.length < 1 || row.contributions.length > COLLECTIVE_CARD_LIMIT) throw new Error('Version de carte collective non prise en charge.')
  return { format: 3, renderVersion: 3, templateVersion: 1, templateId: row.templateId, title: collectiveText(row.title, 200, true), contributions: row.contributions.map(collectiveSignature) }
}
/** Projection d'image indépendante : les cases ne réécrivent jamais la publication. */
export function collectiveImageSnapshot(value: CollectiveCardSnapshot, signatures = true, avatars = true): CollectiveCardSnapshot {
  const card = collectiveCardSnapshot(value)
  return { ...card, contributions: card.contributions.map(entry => ({ ...entry, signature: signatures ? entry.signature : '', avatar: avatars ? entry.avatar : null })) }
}
