import type { Database } from '@/types/database.generated'
import { parisDay, daysBetween } from '@/lib/calendar-day';
import { readEventData } from '@/lib/personal-event-data';
import { previewEventViews, shiftDay } from '@/lib/personal-events';
import { enabledMilestones } from '@/lib/reminder-policy';
// app/api/cron/test-notifications/route.ts
import { createServerClient } from '@supabase/ssr'
import { resolvePreferences } from '@/lib/notification-preferences'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin' // On réutilise ton client admin existant
import { resend } from '@/lib/resend'                 // On réutilise ton client Resend existant
import { echapperHtml } from '@/lib/email-html'

// ============================================================
// 🧪 API DE TEST : Force le cron pour l'utilisateur connecté
// ============================================================

export async function POST(request: Request) {
  try {
    // 1️⃣ Récupérer le token depuis le header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 })
    }
    const token = authHeader.substring(7)

    // 2️⃣ Créer le client Supabase avec le token
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return [] },
          setAll() {}
        },
      }
    )

    // 3️⃣ Vérifier l'identité avec le token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // 4️⃣ Récupérer le profil complet avec le client admin
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, prenom, nom')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }



    // 5️⃣ Lancer le traitement pour CET utilisateur uniquement
    const result = await processUser(userProfile)

    return NextResponse.json({
      success: true,
      message: 'Simulation terminée : aucun envoi ni modification de données',
      simulation: true,
      notifs: result.notifs,
      emails: result.emails,
      preview: result.preview,
      recipient: result.recipient
    }, { headers: { 'Cache-Control': 'private, no-store' } })

  } catch (error) {
    console.error('❌ Erreur test cron:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

// ============================================================
// ⚙️ LOGIQUE INTERNE (Traitement d'un utilisateur)
// ============================================================

async function processUser(user: { id: string; email: string | null; prenom?: string | null; nom?: string | null }) {
  const today = parisDay();
  // Pas de matérialisation : ce diagnostic reste strictement sans écriture.
  const dates = await readEventData(supabaseAdmin, user.id, today, shiftDay(today, 7), true, false);
  const { data: prefs, error } = await supabaseAdmin.from('notification_preferences').select('*').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  const preview = previewEventViews(dates, today, shiftDay(today, 7)).filter(view => view.reminder).flatMap(view => {
    const remaining = daysBetween(today, view.date);
    return enabledMilestones(prefs).filter(palier => palier.enabled && remaining === palier.jours).map(palier => ({
      contact: view.title, date: new Date(view.date + 'T12:00:00Z').toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }), jours: palier.jours,
    }));
  });
  return { notifs: 0, emails: 0, previewNotifs: preview.length, preview, recipient: resolvePreferences(prefs).canal_email ? user.email : null };
}


// ============================================================
// 📧 ENVOI DE L'EMAIL (Design amélioré)
// ============================================================

async function sendRecapEmail(user: { email: string; prenom?: string | null }, notifs: { contact: string; date: string; jours: number }[]) {
  const urgents = notifs.filter(n => n.jours <= 1);
  const normaux = notifs.filter(n => n.jours > 1);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
    .content { padding: 30px 20px; }
    .section-title { font-size: 18px; font-weight: 600; color: #667eea; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px; }
    .event { background: #f9f9f9; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 8px; }
    .event.urgent { border-left-color: #ef4444; background: #fef2f2; }
    .event-name { font-weight: 600; font-size: 16px; color: #111; margin: 0 0 5px 0; }
    .event-date { color: #666; font-size: 14px; }
    .event-badge { display: inline-block; background: #667eea; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: 8px; }
    .event.urgent .event-badge { background: #ef4444; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎂 ${notifs.length} événement${notifs.length > 1 ? 's' : ''} à venir</h1>
      <p>Bonjour ${echapperHtml(user.prenom)}, voici vos rappels (Mode Test)</p>
    </div>
    <div class="content">
      ${urgents.length > 0 ? `
        <h2 class="section-title"><span>🔴</span><span>Urgent (${urgents.length})</span></h2>
        ${urgents.map((n) => `
          <div class="event urgent">
            <p class="event-name">${echapperHtml(n.contact)}<span class="event-badge">J-${echapperHtml(n.jours)}</span></p>
            <p class="event-date">${echapperHtml(n.date)}</p>
          </div>
        `).join('')}
      ` : ''}
      ${normaux.length > 0 ? `
        <h2 class="section-title"><span>📅</span><span>À venir (${normaux.length})</span></h2>
        ${normaux.map((n) => `
          <div class="event">
            <p class="event-name">${echapperHtml(n.contact)}<span class="event-badge">J-${echapperHtml(n.jours)}</span></p>
            <p class="event-date">${echapperHtml(n.date)}</p>
          </div>
        `).join('')}
      ` : ''}
      <div style="text-align: center;">
        <a href="https://ephemer.name/dashboard" class="cta-button">Voir mon dashboard →</a>
      </div>
    </div>
    <div class="footer">
      <p>⚠️ Ceci est un email de test généré manuellement.</p>
      <p>© 2026 Ephemer — Ne manquez plus aucun anniversaire</p>
    </div>
  </div>
</body>
</html>
  `;

  await resend.emails.send({
    from: 'Ephemer <notifications@ephemer.name>',
    to: user.email,
    subject: `🧪 [TEST] ${notifs.length} événement${notifs.length > 1 ? 's' : ''} à ne pas oublier`,
    html
  });
}
