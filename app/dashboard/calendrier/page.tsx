'use client'

import { useState } from 'react'
import { useContacts } from '@/lib/hooks/useContacts'
import { usePersonalEvents } from '@/lib/hooks/usePersonalEvents'
import { usePrivateLists } from '@/lib/hooks/usePrivateLists'
import { monthWindow } from '@/lib/personal-events'
import { parisDay } from '@/lib/calendar-day'
import PersonalDates from '@/components/PersonalDates'
import { ListSelector } from '@/components/PrivateLists'
import LoadFailure from '@/components/LoadFailure'
import CalendarExperience from '@/components/CalendarExperience'

export default function CalendrierPage() {
  const [month, setMonth] = useState(() => parisDay().slice(0, 7))
  const { contacts, loading, error, retry } = useContacts()
  const lists = usePrivateLists()
  const period = monthWindow(Number(month.slice(5)) - 1, Number(month.slice(0, 4)))
  const dates = usePersonalEvents(period.start, period.end)
  const failure = error || lists.error || dates.error
  return <CalendarExperience key={lists.owner} month={month} onMonthChange={setMonth} views={dates.views}
    status={failure ? <LoadFailure message={failure} retry={() => { retry(); void lists.retry(); dates.retry() }} /> : loading || lists.loading || dates.loading ? <div role="status" className="mx-auto max-w-6xl p-6 text-muted">Chargement du calendrier…</div> : null}
    contactIds={lists.selected ? new Set(lists.filter(contacts).map(contact => contact.id)) : null}
    listSelector={<ListSelector state={lists} />}
    manageDates={<PersonalDates contacts={contacts} onSaved={dates.retry} />} />
}
