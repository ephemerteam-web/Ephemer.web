// 🔐 Le corps brut doit être vérifié avant de lire le contenu du webhook.
import { NextResponse } from 'next/server'
import { emailJournalRpc } from '@/lib/email-journal'
import { resend } from '@/lib/resend'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook non configuré' }, { status: 503 })
  const id = request.headers.get('svix-id')
  const timestamp = request.headers.get('svix-timestamp')
  const signature = request.headers.get('svix-signature')
  if (!id || !timestamp || !signature) return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  const payload = await request.text()
  if (payload.length > 100_000) return NextResponse.json({ error: 'Corps trop volumineux' }, { status: 413 })
  let event
  try {
    event = resend.webhooks.verify({ payload, headers: { id, timestamp, signature }, webhookSecret: secret })
  } catch {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }
  const tracked = ['email.sent', 'email.delivered', 'email.bounced', 'email.complained', 'email.failed', 'email.suppressed', 'email.delivery_delayed']
  if (!tracked.includes(event.type)) return NextResponse.json({ success: true, ignored: true })
  if (!('email_id' in event.data) || typeof event.data.email_id !== 'string') {
    return NextResponse.json({ error: 'Identifiant email manquant' }, { status: 400 })
  }
  const { error } = await emailJournalRpc(supabaseAdmin, 'record_email_webhook', {
    p_event_id: id, p_resend_id: event.data.email_id, p_type: event.type, p_occurred_at: event.created_at,
    p_job_id: 'tags' in event.data && event.data.tags?.ephemer_job && /^[0-9a-f-]{36}$/i.test(event.data.tags.ephemer_job) ? event.data.tags.ephemer_job : null,
  })
  // Un 5xx fait reprendre le webhook par Resend ; ne pas accuser réception trop tôt.
  if (error) return NextResponse.json({ error: 'Journal indisponible' }, { status: 500 })
  return NextResponse.json({ success: true })
}
