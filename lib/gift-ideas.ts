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
  if (!Array.isArray(value) || value.length > 6) return []
  return value.filter((item): item is GiftIdea => item && typeof item === 'object' &&
    Object.keys(item).every(key => ['idee', 'raison', 'categorie', 'recherche', 'emoji'].includes(key)) &&
    ['idee', 'raison', 'categorie', 'recherche'].every(key => typeof item[key] === 'string' && item[key].trim()) &&
    item.idee.length <= 200 && item.raison.length <= 500 && item.recherche.length <= 200 &&
    (item.emoji === undefined || (typeof item.emoji === 'string' && item.emoji.length <= 16)) &&
    !/\d[\d.,]*\s*(?:€|\$|£|EUR\b|USD\b|GBP\b|CHF\b|CAD\b)/i.test(item.idee + ' ' + item.raison + ' ' + item.recherche) &&
    !/\b(?:euros?|dollars?|prix|stock|livraison)\b/i.test(item.idee + ' ' + item.raison + ' ' + item.recherche) &&
    categories.has(item.categorie.trim())).slice(0, 6).map(item => ({
      idee: item.idee.trim(), raison: item.raison.trim(), categorie: item.categorie.trim(), recherche: item.recherche.trim(),
      emoji: typeof item.emoji === 'string' ? item.emoji.trim() : undefined,
    }))
}
export function giftTitleKey(title: string) {
  return title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/[^a-z0-9]+/g, ' ').trim()
}
// L'historique reste dans le navigateur. Une correspondance de titre est un indice.
export function filterGiftIdeas(ideas: GiftIdea[], selected: string[], previousTitles: string[], hidePrevious: boolean) {
  const previous = new Set(previousTitles.map(giftTitleKey))
  return ideas.filter(idea => (!selected.length || selected.includes(idea.categorie)) && (!hidePrevious || !previous.has(giftTitleKey(idea.idee))))
}
