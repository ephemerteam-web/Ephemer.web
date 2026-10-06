import { consentInput } from './ai-consent'
export const AI_NOTICE = 'Mammouth AI reçoit l’occasion, la relation et les réglages de génération : ton, longueur, tutoiement/vouvoiement et emojis pour les messages ; mode, plafond de recherche et devise pour les cadeaux. Le plafond saisi est un objectif, pas ton budget enregistré. Tu peux autoriser séparément le prénom, l’âge calculé et la note du contact pour cette demande uniquement. Coordonnées, naissance exacte, signature, intérêts enregistrés, historique, dépenses, brouillons et autres notes restent privés. Ce consentement personnalise la demande ; il ne garantit pas la politique d’entraînement du prestataire.'
export function minimalAIInput(input: Record<string, unknown>) {
  const text = (key: string) => typeof input[key] === 'string' ? (input[key] as string).slice(0, 80) : undefined
  return { eventType: text('eventType'), relation: text('relation'), tone: text('tone'),
    ...Object.fromEntries(['length', 'addressing', 'emojis', 'giftMode', 'budgetCents', 'currency'].filter(key => input[key] !== undefined).map(key => [key, input[key]])),
    ...consentInput(input) }
}
