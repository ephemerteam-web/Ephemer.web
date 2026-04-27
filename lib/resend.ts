// lib/resend.ts
import { Resend } from 'resend'

// ⚠️ IMPORTANT : Ne crée l'instance QUE si la clé existe
if (!process.env.RESEND_API_KEY) {
  throw new Error('❌ RESEND_API_KEY manquante dans .env.local')
}

export const resend = new Resend(process.env.RESEND_API_KEY)
