import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Client admin (contourne les RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

// Sécurité : vérifier que c'est bien Vercel qui appelle (pas un pirate)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1) Récupérer tous les utilisateurs
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, prenom, nom');

    if (usersError) throw usersError;

    console.log(`📧 Cron: ${users?.length || 0} utilisateurs à traiter`);

    let totalNotifs = 0;
    let totalEmails = 0;

    // 2) Pour chaque utilisateur
    for (const user of users || []) {
      const result = await processUser(user);
      totalNotifs += result.notifs;
      totalEmails += result.emails;
    }

    return NextResponse.json({
      success: true,
      notifs: totalNotifs,
      emails: totalEmails
    });
  } catch (error) {
    console.error('❌ Cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function processUser(user: { id: string; email: string; prenom?: string; nom?: string }) {
  let notifsCreated = 0;
  let emailSent = 0;

  try {
    // Récupérer les contacts de cet utilisateur
    const { data: contacts, error } = await supabaseAdmin
      .from('contacts')
      .select('id, prenom, nom, date_naissance')
      .eq('user_id', user.id);

    if (error) throw error;
    if (!contacts?.length) return { notifs: 0, emails: 0 };

    // Récupérer ses préférences
    const { data: prefs } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const paliers = [
      { jours: 7, enabled: prefs?.rappel_j7 ?? true },
      { jours: 3, enabled: prefs?.rappel_j3 ?? true },
      { jours: 1, enabled: prefs?.rappel_j1 ?? false },
      { jours: 0, enabled: prefs?.rappel_jourj ?? true }
    ];

    const notifsToInsert: any[] = [];
    const notifsForEmail: any[] = [];

    // Pour chaque contact, calculer les paliers
    for (const contact of contacts) {
      if (!contact.date_naissance) continue;

      const birthDate = new Date(contact.date_naissance);
      const nextBirthday = getNextBirthday(birthDate, today);
      const daysUntil = Math.floor((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      for (const palier of paliers) {
        if (!palier.enabled) continue;
        if (daysUntil !== palier.jours) continue;

        // Préparer la notification
        const notif = {
          user_id: user.id,
          contact_id: contact.id,
          type: 'anniversaire',
          message: `C'est bientôt l'anniversaire de ${contact.prenom || contact.nom || 'quelqu\'un'} !`,
          event_date: nextBirthday.toISOString().split('T')[0],
          event_description: `Anniversaire de ${contact.prenom || contact.nom || 'quelqu\'un'}`,
          jours_restants: palier.jours,
          lue: false,
          email_envoye: false
        };

        notifsToInsert.push(notif);
        notifsForEmail.push({
          contact: contact.prenom || contact.nom || 'quelqu\'un',
          date: nextBirthday.toLocaleDateString('fr-FR'),
          jours: palier.jours
        });
      }
    }

    // Insérer les notifications (l'index unique empêche les doublons)
    if (notifsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('notifications')
        .upsert(notifsToInsert, { 
          onConflict: 'user_id,contact_id,type,event_date,jours_restants',
          ignoreDuplicates: true 
        });

      if (insertError) throw insertError;
      notifsCreated = notifsToInsert.length;
    }

    // Envoyer l'email récap si activé
    if (notifsForEmail.length > 0 && prefs?.canal_email) {
      await sendRecapEmail(user, notifsForEmail);
      emailSent = 1;

      // Marquer ces notifs comme "email envoyé"
      await supabaseAdmin
        .from('notifications')
        .update({ email_envoye: true })
        .eq('user_id', user.id)
        .eq('email_envoye', false);
    }

    return { notifs: notifsCreated, emails: emailSent };
  } catch (error) {
    console.error(`❌ Error processing user ${user.id}:`, error);
    return { notifs: 0, emails: 0 };
  }
}

function getNextBirthday(birthDate: Date, today: Date): Date {
  const next = new Date(today);
  next.setMonth(birthDate.getMonth());
  next.setDate(birthDate.getDate());
  
  if (next < today) {
    next.setFullYear(next.getFullYear() + 1);
  }
  
  return next;
}

async function sendRecapEmail(user: any, notifs: any[]) {
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
      <p>Bonjour ${user.prenom || ''}, voici vos rappels</p>
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
              ${n.contact}
              <span class="event-badge">J-${n.jours}</span>
            </p>
            <p class="event-date">${n.date}</p>
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
              ${n.contact}
              <span class="event-badge">J-${n.jours}</span>
            </p>
            <p class="event-date">${n.date}</p>
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

  await resend.emails.send({
    from: 'Ephemer <notifications@ephemer.name>',
    to: user.email,
    subject: `🎂 ${notifs.length} événement${notifs.length > 1 ? 's' : ''} à ne pas oublier`,
    html
  });
}