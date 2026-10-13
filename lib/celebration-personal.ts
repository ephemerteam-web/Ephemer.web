import type { Choice, Gift, Preparation } from './attention-data'

export const TASK_TEMPLATES = {
  anniversaire: { label: 'Anniversaire', tasks: ['Choisir un cadeau', 'Préparer une carte ou un message', 'Prévoir le gâteau'] },
  reveillon: { label: 'Réveillon', tasks: ['Choisir le repas', 'Prévoir les boissons', 'Préparer la décoration'] },
  repas: { label: 'Repas entre amis', tasks: ['Choisir le menu', 'Prévoir les boissons', 'Organiser les courses'] },
} as const

// Ce classement ne modifie aucun état enregistré et ne déplace aucune date source.
export function preparationIsHistory(preparation: Preparation, date: string | undefined, today: string, cancelled = false, archived = false) {
  return preparation.etat !== 'ouverte' || cancelled || archived || !!date && date < today
}

export function personalCelebrationCosts(choices: Choice[], gifts: Gift[], preparationId: string, includePlanned: boolean) {
  const totals = new Map<string, { currency: string; planned: bigint; spent: bigint; plannedUnknown: number; spentUnknown: number }>()
  const donated = new Set(gifts.filter(gift => gift.choix_id !== null).map(gift => gift.choix_id))
  function add(currency: string | null, cents: number | null, kind: 'planned' | 'spent') {
    if (cents !== null && (!Number.isSafeInteger(cents) || cents < 0)) throw new Error('Montant invalide. Recharge les données avant de calculer les frais.')
    const key = currency ?? 'SANS_DEVISE'
    const total = totals.get(key) ?? { currency: key, planned: BigInt(0), spent: BigInt(0), plannedUnknown: 0, spentUnknown: 0 }
    if (cents === null) total[kind === 'planned' ? 'plannedUnknown' : 'spentUnknown']++
    else total[kind] += BigInt(cents)
    totals.set(key, total)
  }
  for (const choice of choices) {
    if (choice.preparation_id !== preparationId) continue
    if (includePlanned && choice.etat === 'prevu' && !donated.has(choice.id)) add(choice.devise_estimee, choice.prix_estime_centimes, 'planned')
    if (choice.etat === 'achete') add(choice.devise_depensee, choice.montant_depense_centimes, 'spent')
  }
  return [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency))
}

export function exactTotal(cents: bigint, currency: string) {
  return `${cents / BigInt(100)},${String(cents % BigInt(100)).padStart(2, '0')}${currency === 'SANS_DEVISE' ? '' : ' ' + currency}`
}
