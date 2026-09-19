export const AI_NOTICE = 'La génération utilise Mammouth AI. Seuls le type d’occasion, la relation et le ton (messages) sont transmis. Les noms, coordonnées, notes et dates de naissance ne sont pas envoyés au prestataire. Le prénom est ajouté au message après génération.'
export function minimalAIInput(input: Record<string, unknown>) {
  const text = (key: string) => typeof input[key] === 'string' ? (input[key] as string).slice(0, 80) : ''
  return { eventType: text('eventType'), relation: text('relation'), tone: text('tone') }
}
