// 🎁 Une réponse JSON ne suffit pas : chaque idée doit être utilisable.
import { TYPES_EVENEMENT, normalizeOccasion } from './constants'
export type GiftIdea = { idee: string; raison: string; categorie: string; recherche: string; emoji?: string }
const categories = new Set(['loisir', 'bien_etre', 'tech', 'decoration', 'gourmand'])
export function giftOccasion(value: unknown): string | null {
  const key = normalizeOccasion(value)
  const item = TYPES_EVENEMENT.find(event => event.value === key)
  return item?.label.replace(/^\S+\s+/, '') ?? null
}
export function usableGiftIdeas(value: unknown): GiftIdea[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is GiftIdea => item && typeof item === 'object' &&
    ['idee', 'raison', 'categorie', 'recherche'].every(key => typeof item[key] === 'string' && item[key].trim()) &&
    categories.has(item.categorie.trim())).slice(0, 6).map(item => ({
      idee: item.idee.trim(), raison: item.raison.trim(), categorie: item.categorie.trim(), recherche: item.recherche.trim(),
      emoji: typeof item.emoji === 'string' ? item.emoji.trim() : undefined,
    }))
}
