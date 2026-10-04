// 📰 Newsletter mensuelle, traitements par lots et réservation d’envoi conservée.
import { NextRequest, NextResponse } from 'next/server'
import { parisDay, parseLocalDay } from '@/lib/calendar-day'
import { monthEvents } from '@/lib/month-events'
import { readPages, readAllRows } from '@/lib/pagination'
import { deliverEmail } from '@/lib/email-delivery'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { genererNewsletterMensuelle, EMAIL_CONFIG } from '@/lib/email-templates'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  try {
    const today = parisDay()
    const annee = Number(today.slice(0, 4)), mois = Number(today.slice(5, 7)) - 1
    const moisLibelle = parseLocalDay(today).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const resultats: { user: string; statut: string; nbEvenements?: number; emailId?: string }[] = []
    for await (const preferences of readPages(() => supabaseAdmin.from('notification_preferences')
      .select('user_id').eq('newsletter_mensuelle', true), 'user_id')) {
      const profils = await readAllRows(() => supabaseAdmin.from('profiles').select('id, prenom, email')
        .in('id', preferences.map(p => p.user_id)))
      for (const profil of profils) {
        if (!profil.email) continue
        try {
          const contacts = await readAllRows(() => supabaseAdmin.from('contacts')
            .select('id, prenom, nom, date_naissance').eq('user_id', profil.id))
          const evenements = monthEvents(contacts, mois, annee).map(e => ({ prenomContact: e.prenom,
            nomContact: e.nom, typeEvenement: e.typeEvenement, jour: e.jour, emoji: e.emoji }))
          const html = genererNewsletterMensuelle({ prenomUtilisateur: profil.prenom || 'cher utilisateur',
            moisLibelle: moisLibelle.charAt(0).toUpperCase() + moisLibelle.slice(1), evenements })
          const result = await deliverEmail({ key: `newsletter/${profil.id}/${annee}-${mois + 1}`,
            kind: 'newsletter', userId: profil.id,
            expiresOn: new Date(Date.UTC(annee, mois + 1, 0)).toISOString().slice(0, 10), payload: {
              from: `${EMAIL_CONFIG.brandName} <${EMAIL_CONFIG.defaultFrom}>`, to: profil.email,
              subject: `📅 Votre agenda de ${moisLibelle}`, html,
            } })
          resultats.push({ user: profil.email, statut: ['accepted', 'already_accepted'].includes(result.state) ? 'envoye' : result.state,
            nbEvenements: evenements.length, emailId: result.emailId })
        } catch {
          resultats.push({ user: profil.email, statut: 'erreur' })
        }
      }
    }
    const success = !resultats.some(r => ['erreur', 'review', 'failed'].includes(r.statut))
    return NextResponse.json({ success, mois: moisLibelle, total: resultats.length, total_traites: resultats.length, resultats }, { status: success ? 200 : 500 })
  } catch {
    return NextResponse.json({ error: 'Traitement incomplet. Certains envois peuvent déjà être acceptés ; le journal protège les reprises.' }, { status: 500 })
  }
}
