// 💌 Contrats de rendu fermés V1/V2, indépendants des profils et des tables.
import { avatarRenderConfig, type AvatarRenderConfig } from './avatar-render-config'
import { cardSnapshot, type CardSnapshotV1 } from './cards'

export type CardSnapshotV2 = Omit<CardSnapshotV1, 'format' | 'renderVersion'> & { format: 2; renderVersion: 2; avatar: AvatarRenderConfig | null }
export type SupportedCardSnapshot = CardSnapshotV1 | CardSnapshotV2
export function cardSnapshotV2(input: unknown, published = false): CardSnapshotV2 {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Carte invalide.')
  const value = input as Record<string, unknown>
  const keys = ['format', 'templateId', 'templateVersion', 'renderVersion', 'message', 'signature', 'avatar']
  if (Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key)) || value.format !== 2 || value.renderVersion !== 2) {
    throw new Error('Carte invalide ou version non prise en charge.')
  }
  const text = cardSnapshot({ format: 1, templateId: value.templateId, templateVersion: value.templateVersion, renderVersion: 1, message: value.message, signature: value.signature }, published)
  return { ...text, format: 2, renderVersion: 2, avatar: value.avatar === null ? null : avatarRenderConfig(value.avatar) }
}
export function supportedCardSnapshot(input: unknown, published = false): SupportedCardSnapshot {
  return input && typeof input === 'object' && 'format' in input && input.format === 2 ? cardSnapshotV2(input, published) : cardSnapshot(input, published)
}
