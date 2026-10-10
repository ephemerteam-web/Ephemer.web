// 🔒 Paramètres fermés : les textes personnels ne passent jamais par ce contrat.
import { TYPES_EVENEMENT, TYPES_RELATION, TONS_MESSAGE, normalizeOccasion, normalizeRelation } from './constants'
import { CURRENCIES } from './attention-utils'

export const MESSAGE_LENGTHS = [{ value: 'short', label: 'Court · 1 à 2 phrases' }, { value: 'medium', label: 'Moyen · 3 à 4 phrases' }, { value: 'long', label: 'Long · 5 à 6 phrases' }] as const
export const GIFT_MODES = [{ value: 'classic', label: 'Classique' }, { value: 'experience', label: 'Une expérience' }, { value: 'personalized', label: 'Un cadeau personnalisé' }, { value: 'last_minute', label: 'Dernière minute' }, { value: 'no_purchase', label: 'Sans achat' }] as const
export type MessageLength = typeof MESSAGE_LENGTHS[number]['value']
export type GiftMode = typeof GIFT_MODES[number]['value']
export class AIInputError extends Error {
  status: number
  constructor(message: string, status = 400) { super(message); this.status = status }
}
function choice(value: unknown, allowed: readonly string[], fallback: string): string {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !allowed.includes(value)) throw new AIInputError('Option inconnue ou invalide.')
  return value
}
export function commonAIOptions(input: Record<string, unknown>) {
  if (input.eventType !== undefined && typeof input.eventType !== 'string') throw new AIInputError('Occasion invalide.')
  const eventType = choice(input.eventType === undefined ? undefined : normalizeOccasion(input.eventType), TYPES_EVENEMENT.map(v => v.value), 'anniversaire')
  // normalizeRelation possède un fallback : contrôler la valeur brute avant normalisation.
  const relation = choice(input.relation, [...TYPES_RELATION.map(v => v.value), 'amis'], 'ami')
  return { eventType, relation: normalizeRelation(relation) }
}
export function messageAIOptions(input: Record<string, unknown>) {
  const common = commonAIOptions(input)
  const tone = choice(input.tone, TONS_MESSAGE.map(v => v.value), common.relation === 'pro' ? 'formel' : 'familier')
  const length = choice(input.length, MESSAGE_LENGTHS.map(v => v.value), 'short') as MessageLength
  const addressing = choice(input.addressing, ['tu', 'vous'], common.relation === 'pro' ? 'vous' : 'tu') as 'tu' | 'vous'
  if (input.emojis !== undefined && typeof input.emojis !== 'boolean') throw new AIInputError('Option emojis invalide.')
  return { ...common, tone, length, addressing, emojis: input.emojis === true }
}
export function giftAIOptions(input: Record<string, unknown>) {
  const common = commonAIOptions(input)
  const giftMode = choice(input.giftMode, GIFT_MODES.map(v => v.value), 'classic') as GiftMode
  const currency = choice(input.currency, CURRENCIES, 'EUR')
  let budgetCents: number | null = null
  if (input.budgetCents !== undefined && input.budgetCents !== null) {
    if (typeof input.budgetCents !== 'number' || !Number.isSafeInteger(input.budgetCents) || input.budgetCents < 0) throw new AIInputError('Plafond invalide.')
    budgetCents = input.budgetCents
  }
  return { ...common, giftMode, currency, budgetCents: giftMode === 'no_purchase' ? 0 : budgetCents }
}
export function localMessage(message: string, firstName: string, signature = '') {
  const name = firstName.trim().slice(0, 80), ending = signature.trim().slice(0, 200)
  const text = name ? `${name}, ${message.trim()}` : message.trim()
  return ending ? `${text}\n\n${ending}` : text
}
