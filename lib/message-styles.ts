// ✍️ Le nom et la signature restent locaux ; seules les options fermées vont à l'IA.
import { messageAIOptions } from './ai-options'
import type { Tables } from '@/types/database'

export type MessageStyle = Tables<'styles_messages'>
export type StyleSettings = { tone: string; length: 'short' | 'medium' | 'long'; addressing: 'tu' | 'vous'; emojis: boolean; signature: string }
export function styleSettings(style: Pick<MessageStyle, 'ton' | 'longueur' | 'adresse' | 'emojis' | 'signature'>): StyleSettings {
  const lengths = { courte: 'short', moyenne: 'medium', longue: 'long' } as const
  if (!(style.longueur in lengths) || typeof style.signature !== 'string' || style.signature.length > 200) throw new Error('Style invalide.')
  const opts = messageAIOptions({ tone: style.ton, length: lengths[style.longueur as keyof typeof lengths], addressing: style.adresse, emojis: style.emojis })
  return { tone: opts.tone, length: opts.length, addressing: opts.addressing, emojis: opts.emojis, signature: style.signature }
}
export function resolveMessageStyle(styles: MessageStyle[], defaultId: string | null, contactStyleId: string | null, temporary?: StyleSettings): StyleSettings | null {
  if (temporary) return temporary
  const style = styles.find(s => s.id === contactStyleId) ?? styles.find(s => s.id === defaultId)
  return style ? styleSettings(style) : null
}
export function styleValues(data: FormData) {
  const nom = String(data.get('nom') ?? '').trim(), signature = String(data.get('signature') ?? '')
  if (!nom || nom.length > 80) throw new Error('Le nom doit contenir de 1 à 80 caractères.')
  const values = { nom, ton: String(data.get('ton')), longueur: String(data.get('longueur')), adresse: String(data.get('adresse')), emojis: data.get('emojis') === 'on', signature }
  styleSettings(values)
  return values
}
