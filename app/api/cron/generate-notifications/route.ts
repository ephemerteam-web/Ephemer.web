import { readPages, readAllRows, batches } from '@/lib/pagination';
import { resolvePreferences } from '@/lib/notification-preferences';
import { parisDay } from '@/lib/calendar-day';
import { birthdayNotifications, selectBirthdayRecap } from '@/lib/reminder-policy';
import type { BirthdayContact, ReminderPreferences } from '@/lib/reminder-policy';
import { createHash } from 'node:crypto';
import { deliverEmail, recordCronRun } from '@/lib/email-delivery';
import type { EmailJob } from '@/lib/email-delivery';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { echapperHtml } from '@/lib/email-html';

type User = { id: string; email: string | null; prenom?: string | null; nom?: string | null };

// Le secret reste obligatoire, avant toute lecture ou tout envoi.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    const today = parisDay();
    let totalNotifs = 0;
    let totalEmails = 0;
    const errors: { user_id: string; phase: string }[] = [];
    for await (const users of readPages(() => supabaseAdmin.from('profiles').select('id, email, prenom, nom'))) {
    for (const user of users) {
      // Un compte en échec ne bloque jamais le traitement des suivants.
      try {
        const result = await processUser(user, today);
        totalNotifs += result.notifs;
        totalEmails += result.emails;
        errors.push(...result.errors.map(phase => ({ user_id: user.id, phase })));
      } catch (error) {
        console.error('Échec du traitement utilisateur', user.id, error);
        errors.push({ user_id: user.id, phase: 'lecture' });
      }
    }
    }
    return NextResponse.json({ success: errors.length === 0, date: today, notifs: totalNotifs, emails: totalEmails, errors },
      { status: errors.length ? 500 : 200 });
  } catch (error) {
    console.error('Échec général du cron notifications', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

async function generateUserEvents(userId: string, contacts: BirthdayContact[], prefs: ReminderPreferences | null, today: string) {
  const rows = birthdayNotifications(userId, contacts, prefs, today);
  if (!rows.length) return 0;
  let inserted = 0;
  for (const batch of batches(rows)) {
    const { data, count, error } = await supabaseAdmin.from('notifications')
      .upsert(batch, { onConflict: 'user_id,contact_id,type,event_date,jours_restants', ignoreDuplicates: true, count: 'exact' })
      .select('id');
    if (error) throw error;
    inserted += count ?? data?.length ?? 0;
  }
  return inserted;
}

async function deliverUserPending(user: User, contacts: BirthdayContact[], prefs: ReminderPreferences | null, today: string) {
  if (!resolvePreferences(prefs).canal_email || !user.email) return 0;
  // La livraison dépend de la file persistante, jamais de nouvelles insertions.
  // Inclure les paliers déjà envoyés permet d'écarter un ancien palier superflu.
  const data = await readAllRows(() => supabaseAdmin.from('notifications')
    .select('id, contact_id, event_date, jours_restants, email_envoye')
    .eq('user_id', user.id).eq('type', 'anniversaire').gte('event_date', today));
  const groups = selectBirthdayRecap(data || [], contacts, prefs, today);
  if (!groups.length) return 0;
  const ids = groups.flatMap(group => group.ids).sort();
  const emails = groups.map(({ contact, date, jours }) => ({ contact, date, jours }));
  // Même contenu et mêmes IDs => même clé, même si le cron est répété.
  // Un journal durable reste nécessaire au-delà des 24 h de Resend.
  const fingerprint = createHash('sha256').update(JSON.stringify({ ids, emails, email: user.email, prenom: user.prenom ?? null })).digest('hex');
  const result = await sendRecapEmail({ ...user, email: user.email }, emails, {
    key: `recap/${user.id}/${fingerprint}`, kind: 'recap', userId: user.id, notificationIds: ids,
    eventKeys: groups.map(g => `${user.id}/${g.contactId}/${g.eventDate}`),
    expiresOn: groups.map(g => g.eventDate).sort()[0],
  });
  if (['review', 'failed'].includes(result.state)) throw new Error('Récapitulatif à vérifier dans le journal');
  return result.state === 'accepted' ? 1 : 0;
}

async function processUser(user: User, today = parisDay()) {
  const contacts = await readAllRows(() => supabaseAdmin.from('contacts')
    .select('id, prenom, nom, date_naissance').eq('user_id', user.id));
  const { data: prefs, error: prefsError } = await supabaseAdmin.from('notification_preferences')
    .select('*').eq('user_id', user.id).maybeSingle();
  if (prefsError) throw prefsError;
  let notifs = 0;
  let emails = 0;
  const errors: string[] = [];
  async function journal(phase: string, success: boolean) {
    try { await recordCronRun('generate-notifications', user.id, today, phase, success); }
    catch { if (!errors.includes('journal')) errors.push('journal'); }
  }
  try {
    notifs = await generateUserEvents(user.id, contacts || [], prefs, today);
    await journal('generation', true);
  } catch (error) {
    console.error('Échec génération notifications', user.id, error);
    errors.push('generation');
    await journal('generation', false);
  }
  // Même si la génération échoue, essayer de livrer la file déjà enregistrée.
  try {
    emails = await deliverUserPending(user, contacts || [], prefs, today);
    await journal('livraison', true);
  } catch (error) {
    console.error('Échec livraison récapitulatif', user.id, error);
    errors.push('livraison');
    await journal('livraison', false);
  }
  return { notifs, emails, errors };
}

async function sendRecapEmail(user: { email: string; prenom?: string | null }, notifs: { contact: string; date: string; jours: number }[], job: Omit<EmailJob, 'payload'>) {
  // Grouper par urgence
  const urgents = notifs.filter(n => n.jours <= 1);
  const normaux = notifs.filter(n => n.jours > 1);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0 0;
      opacity: 0.9;
      font-size: 16px;
    }
    .content {
      padding: 30px 20px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #667eea;
      margin: 0 0 15px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .event {
      background: #f9f9f9;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 15px 0;
      border-radius: 8px;
    }
    .event.urgent {
      border-left-color: #ef4444;
      background: #fef2f2;
    }
    .event-name {
      font-weight: 600;
      font-size: 16px;
      color: #111;
      margin: 0 0 5px 0;
    }
    .event-date {
      color: #666;
      font-size: 14px;
    }
    .event-badge {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 8px;
    }
    .event.urgent .event-badge {
      background: #ef4444;
    }
    .footer {
      background: #f9f9f9;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #eee;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      padding: 12px 30px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎂 ${notifs.length} événement${notifs.length > 1 ? 's' : ''} à venir</h1>
      <p>Bonjour ${echapperHtml(user.prenom)}, voici vos rappels</p>
    </div>
    
    <div class="content">
      ${urgents.length > 0 ? `
        <h2 class="section-title">
          <span>🔴</span>
          <span>Urgent (${urgents.length})</span>
        </h2>
        ${urgents.map(n => `
          <div class="event urgent">
            <p class="event-name">
              ${echapperHtml(n.contact)}
              <span class="event-badge">J-${echapperHtml(n.jours)}</span>
            </p>
            <p class="event-date">${echapperHtml(n.date)}</p>
          </div>
        `).join('')}
      ` : ''}

      ${normaux.length > 0 ? `
        <h2 class="section-title">
          <span>📅</span>
          <span>À venir (${normaux.length})</span>
        </h2>
        ${normaux.map(n => `
          <div class="event">
            <p class="event-name">
              ${echapperHtml(n.contact)}
              <span class="event-badge">J-${echapperHtml(n.jours)}</span>
            </p>
            <p class="event-date">${echapperHtml(n.date)}</p>
          </div>
        `).join('')}
      ` : ''}

      <div style="text-align: center;">
        <a href="https://ephemer.name/dashboard" class="cta-button">
          Voir mon dashboard →
        </a>
      </div>
    </div>

    <div class="footer">
      <p>Vous recevez cet email car vous avez activé les rappels dans vos préférences.</p>
      <p>© 2026 Ephemer — Ne manquez plus aucun anniversaire</p>
    </div>
  </div>
</body>
</html>
  `;

  return deliverEmail({ ...job, payload: {
    from: 'Ephemer <notifications@ephemer.name>',
    to: user.email,
    subject: `🎂 ${notifs.length} événement${notifs.length > 1 ? 's' : ''} à ne pas oublier`,
    html
  } });
}
