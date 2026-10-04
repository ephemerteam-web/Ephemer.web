export type Diagnostic = { preview: { contact: string; date: string; jours: number }[]; recipient: string | null }
export function parseDiagnostic(value: unknown): Diagnostic {
  if (!value || typeof value !== 'object') throw new Error('Diagnostic indisponible')
  const data = value as Record<string, unknown>
  if (data.simulation !== true || !Array.isArray(data.preview) ||
    !(data.recipient === null || typeof data.recipient === 'string') ||
    !data.preview.every(row => row && typeof row.contact === 'string' && typeof row.date === 'string' && Number.isInteger(row.jours) && row.jours >= 0)) {
    throw new Error('Réponse de diagnostic invalide. Réessaie.')
  }
  return { preview: data.preview, recipient: data.recipient }
}
