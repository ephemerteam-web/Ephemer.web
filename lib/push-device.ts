import { supabase } from './supabase-browser'

// Toute opération cible le navigateur courant, jamais tous les appareils.
export async function findPushDevice(userId: string, endpoint: string) {
  const { data, error } = await supabase.from('user_push_subscriptions')
    .select('id').eq('user_id', userId).eq('subscription->>endpoint', endpoint)
  if (error) throw error
  return data || []
}

export async function savePushDevice(userId: string, subscription: PushSubscription) {
  const rows = await findPushDevice(userId, subscription.endpoint)
  const value = { user_id: userId, subscription: subscription.toJSON() }
  const { error } = rows.length
    ? await supabase.from('user_push_subscriptions').update(value).eq('user_id', userId).in('id', rows.map(row => row.id))
    : await supabase.from('user_push_subscriptions').insert(value)
  if (error) throw error
}

export async function removePushDevice(userId: string, subscription: PushSubscription) {
  // Même si le nettoyage DB échoue, l'endpoint navigateur est invalidé.
  if (!await subscription.unsubscribe()) throw new Error('Impossible de désabonner cet appareil. Réessaie.')
  const { error } = await supabase.from('user_push_subscriptions').delete()
    .eq('user_id', userId).eq('subscription->>endpoint', subscription.endpoint)
  if (error) throw error
}
