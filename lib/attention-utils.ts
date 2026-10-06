// Montants exacts : aucune multiplication de nombres décimaux flottants.
export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD'] as const
export function parseCents(value: string): number | null {
  const text = value.trim()
  if (!text) return null
  if (text.length > 30 || !/^\d+(?:[.,]\d{1,2})?$/.test(text)) throw new Error('Saisis un montant positif avec au plus deux décimales.')
  const [whole, fraction = ''] = text.replace(',', '.').split('.')
  const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0'))
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Montant trop élevé.')
  return Number(cents)
}
export function centsInput(value: number | null): string {
  if (value === null) return ''
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Montant invalide.')
  const cents = BigInt(value)
  return String(cents / BigInt(100)) + '.' + String(cents % BigInt(100)).padStart(2, '0')
}
export function money(value: number | null, currency: string | null): string {
  return value === null ? 'Montant inconnu' : centsInput(value).replace('.', ',') + ' ' + (currency ?? '')
}
export function decimalMoney(value: string, currency: string): string {
  if (!/^\d+\.\d{2}$/.test(value)) throw new Error('Total invalide.')
  const [whole, fraction] = value.split('.')
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + fraction + (currency === 'SANS_DEVISE' ? '' : ' ' + currency)
}
export function merchantLink(value: string): string | null {
  const text = value.trim()
  if (!text) return null
  if (text.length > 2048 || /[\s<>""'\\\x00-\x1f\x7f]/.test(text)) throw new Error('Lien invalide : utilise une adresse absolue http ou https.')
  const match = /^(https?):\/\/([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(?::([0-9]{1,5}))?(?:[/?#][^\s]*)?$/i.exec(text)
  if (!match || (match[3] && (Number(match[3]) < 1 || Number(match[3]) > 65535))) throw new Error('Lien invalide : utilise une adresse absolue http ou https, sans identifiants.')
  return text.replace(/^https?/i, protocol => protocol.toLowerCase())
}
export function attentionError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : ''
  if (code === '40001' || code === 'PGRST116') return 'Une autre modification a eu lieu. Ta saisie est conservée. Recharge les données puis compare avant de réenregistrer.'
  if (code === '42501') return 'Cette ressource est inaccessible. Vérifie ta session.'
  return error instanceof Error ? error.message : 'Enregistrement impossible. Ta saisie est conservée ; tu peux réessayer.'
}
