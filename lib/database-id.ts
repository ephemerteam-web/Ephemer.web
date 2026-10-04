// Les identifiants contacts/rappels sont des nombres SQL, pas les chaînes de l’URL.
export function databaseId(value: string | number): number {
  const id = typeof value === 'number' ? value : /^\d+$/.test(value) ? Number(value) : NaN
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Identifiant de contact invalide')
  return id
}
