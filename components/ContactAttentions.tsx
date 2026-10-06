'use client'
import { useDashboardUser } from './DashboardUserContext'
import { AttentionNav, LoadState, useAttentionLoad } from './AttentionShared'
import { GiftHistory, IdeaLibrary } from './GiftLibrary'
import { supabase } from '@/lib/supabase-browser'
import { usePersonalEvents } from '@/lib/hooks/usePersonalEvents'
import { parisDay } from '@/lib/calendar-day'
import { shiftDay } from '@/lib/personal-events'
import { EventAgenda } from './PersonalDates'
import ContactPreferences from './ContactPreferences'
export default function ContactAttentions({ contactId }: { contactId: number }) {
  const user = useDashboardUser(), today = parisDay()
  const loaded = useAttentionLoad(user.id + ':' + contactId, async () => {
    const result = await supabase.from('contacts').select('id,prenom,nom').eq('user_id', user.id).eq('id', contactId).single()
    if (result.error || !result.data) throw new Error('Contact inaccessible ou supprimé.')
    return result.data
  })
  const dates = usePersonalEvents(today, shiftDay(today,399))
  if (!loaded.data) return <main className="p-4 text-ink"><LoadState error={loaded.error} retry={loaded.reload} /></main>
  const recipient = [loaded.data.prenom, loaded.data.nom].filter(Boolean).join(' ')
  return <main className="mx-auto max-w-4xl space-y-6 p-4 text-ink"><h1 className="break-words text-2xl font-bold">Les attentions pour {recipient}</h1><AttentionNav />
    {dates.loading ? <p role="status">Chargement des événements…</p> : dates.error ? <LoadState error={dates.error} retry={dates.retry} /> : <EventAgenda views={dates.views.filter(v => v.contact?.id === contactId)} title="Préparer ses prochains événements" />}
    <ContactPreferences key={user.id + ':' + contactId} contactId={contactId} />
    <IdeaLibrary contactId={contactId} /><GiftHistory contactId={contactId} recipient={recipient} />
  </main>
}
