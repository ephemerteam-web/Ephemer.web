import 'server-only'
import { createHash, createECDH } from 'node:crypto'
import webpush from 'web-push'
import { supabaseAdmin } from './supabase-admin'
import { readAllRows } from './pagination'
import { dailyEvents, digestPayload, dispatchDaily, safePushSubscription } from './daily-digest'
import { dailyPushRpc } from './daily-push-journal'
import { eventViews, type EventData } from './personal-events'
import { SAINTS_PAR_DATE } from './saints'

export function pushConfigured() {
  if (process.env.EPHEMER_DAILY_PUSH_ENABLED !== 'true') return false
  try {
    const key = createECDH('prime256v1')
    key.setPrivateKey(Buffer.from(process.env.VAPID_PRIVATE_KEY ?? '', 'base64url'))
    const subject = process.env.VAPID_SUBJECT ?? ''
    return key.getPublicKey().toString('base64url') === process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && /^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(subject)
  } catch { return false }
}
export async function pushReady() {
  if (!pushConfigured()) return false
  try { return await dailyPushRpc(supabaseAdmin, 'daily_push_ready', {}) } catch { return false }
}

export async function sendDailyPush(userId: string, dates: EventData, day: string, enabled: boolean) {
  if (!enabled || !pushConfigured()) return 0
  const devices = await readAllRows(() => supabaseAdmin.from('user_push_subscriptions').select('id, subscription').eq('user_id', userId))
  const count = dailyEvents(eventViews(dates, day, day, true), day).length
  const saint = SAINTS_PAR_DATE.get(day.slice(5))
  const saints = saint ? [saint.nomSaint] : []
  const seen = new Set<string>()
  let sent = 0, failed = false
  for (const device of devices) {
    const subscription = safePushSubscription(device.subscription)
    if (!subscription || seen.has(subscription.endpoint)) continue
    seen.add(subscription.endpoint)
    const payload = digestPayload(count, subscription.saints ? saints : [], day)
    try {
      const accepted = await dispatchDaily(payload,
        () => dailyPushRpc(supabaseAdmin, 'claim_daily_push', { p_user_id: userId, p_device_key: createHash('sha256').update(subscription.endpoint).digest('hex'), p_day: day }),
        async value => {
          // Pas de noms privés, d'ID de contact ou de contenu de cloche dans le push.
          await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, JSON.stringify(value), {
            vapidDetails: { subject: process.env.VAPID_SUBJECT!, publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! },
            TTL: 3600, timeout: 15_000,
          })
        })
      if (accepted) sent++
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        // Endpoint expiré : ne supprimer que cette liaison de ce compte.
        const result = await supabaseAdmin.from('user_push_subscriptions').delete().eq('user_id', userId).eq('id', device.id)
        if (result.error) failed = true
      } else failed = true
      // Ne jamais journaliser l'erreur brute web-push (endpoint et clés).
    }
  }
  if (failed) throw new Error('Une livraison push reste non confirmée ; aucune relance aujourd’hui')
  return sent
}
