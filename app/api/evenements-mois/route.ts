// 📅 Événements civils du mois, réservés au propriétaire connecté.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { parisDay } from '@/lib/calendar-day'
import { requestedMonth } from '@/lib/month-events'
import { readAllRows } from '@/lib/pagination'
import { isUuid } from '@/lib/private-lists'
import { readEventData } from '@/lib/personal-event-data'
import { eventViews, monthWindow } from '@/lib/personal-events'
export type { MonthEvent as EvenementContact } from '@/lib/month-events'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    let period: { mois: number; annee: number }
    try { period = requestedMonth(request.nextUrl.searchParams, parisDay()) }
    catch { return NextResponse.json({ error: 'Mois ou année invalide' }, { status: 400 }) }
    const list = request.nextUrl.searchParams.get('liste')
    let ids: Set<number> | null = null
    if (list !== null) {
      if (!isUuid(list)) return NextResponse.json({ error: 'Liste invalide' }, { status: 400 })
      const { data, error } = await supabaseAdmin.from('listes_personnelles').select('id').eq('user_id', user.id).eq('id', list).maybeSingle()
      if (error) throw error
      if (!data) return NextResponse.json({ error: 'Liste introuvable' }, { status: 404 })
      const members = await readAllRows(() => supabaseAdmin.from('appartenances_listes').select('id,contact_id').eq('user_id', user.id).eq('liste_id', list))
      ids = new Set(members.map(row => row.contact_id))
      if (!ids.size) return NextResponse.json({ success: true, ...period, evenements: [] })
    }
    const { start, end } = monthWindow(period.mois, period.annee)
    const data = await readEventData(supabaseAdmin, user.id, start, end, true)
    if (ids) data.contacts = data.contacts.filter(contact => ids.has(contact.id))
    const views = eventViews(data, start, end).filter(view => !ids || (view.contact !== null && ids.has(view.contact.id)))
    const evenements = views.map(view => ({ id: view.contact?.id ?? null, occurrenceId: view.occurrence?.id ?? view.key,
      prenom: view.contact?.prenom ?? 'Moi', nom: view.contact?.nom ?? '', titre: view.title, age: view.age,
      typeEvenement: view.kind === 'fete_prenomale' ? 'fete_prenomale' : view.kind, jour: Number(view.date.slice(8)), dateComplete: `${view.date}T00:00:00.000Z`, emoji: view.kind === 'anniversaire' ? '🎂' : '🎉' }))
    return NextResponse.json({ success: true, ...period, evenements })
  } catch {
    return NextResponse.json({ error: 'Impossible de charger tous les événements. Réessaie.' }, { status: 500 })
  }
}
