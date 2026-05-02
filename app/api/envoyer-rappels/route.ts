// app/api/envoyer-rappels/route.ts
// Cette route envoie les rappels du jour par email (utilisée par le cron Vercel)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend } from '@/lib/resend';

// Client Supabase avec droits administrateur (service_role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ⚠️ Pendant les tests : tous les emails arrivent ici
const EMAIL_TEST = 'ephemer.team@gmail.com';

export async function GET(request: NextRequest) {
  // 🔒 Sécurité : on accepte soit le header Authorization, soit le paramètre ?secret=...
  const authHeader = request.headers.get('authorization');
  const urlSecret = request.nextUrl.searchParams.get('secret');
  const CRON_SECRET = process.env.CRON_SECRET;

  console.log('🔍 Header Authorization reçu:', authHeader);
  console.log('🔍 Secret dans URL (?secret=):', urlSecret);
  console.log('🔍 CRON_SECRET dans .env:', CRON_SECRET ? '✅ Présent' : '❌ Manquant !');

  const expectedHeader = CRON_SECRET ? `Bearer ${CRON_SECRET}` : null;

  const isAuthorized = 
    (authHeader && expectedHeader && authHeader === expectedHeader) ||
    (urlSecret && CRON_SECRET && urlSecret === CRON_SECRET);

  if (!isAuthorized) {
    return NextResponse.json({ 
      error: 'Non autorisé',
      received: authHeader || urlSecret,
      expected: expectedHeader || 'secret manquant dans les variables d\'environnement',
      note: 'Utilise ?secret=VOTRE_SECRET pour tester dans le navigateur'
    }, { status: 401 });
  }

  try {
    // 📅 Date d'aujourd'hui au format YYYY-MM-DD
    const aujourdhui = new Date().toISOString().split('T')[0];
    console.log('📅 Date recherchée:', aujourdhui);

    console.log('🔌 Récupération des rappels dans Supabase...');

    // 🔍 Récupérer les rappels du jour + les infos du contact
    const { data: rappels, error } = await supabase
      .from('rappels')
      .select(`
        *,
        contacts ( prenom, nom, email )
      `)
      .eq('date_envoi', aujourdhui)
      .eq('statut', 'programme')
      .order('id', { ascending: true });

    console.log('📦 Nombre de rappels trouvés:', rappels?.length || 0);

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!rappels || rappels.length === 0) {
      console.log('ℹ️ Aucun rappel à traiter aujourd\'hui');
      return NextResponse.json({ 
        success: true,
        message: 'Aucun rappel à envoyer aujourd\'hui',
        date: aujourdhui
      });
    }

    console.log(`✅ ${rappels.length} rappel(s) trouvé(s)`);

    // 📧 Envoi des emails
    const resultats = [];
    for (const rappel of rappels) {
      console.log(`\n📬 Traitement du rappel ID: ${rappel.id}`);

      const destination = EMAIL_TEST;
      console.log(`📧 Email de destination (mode test): ${destination}`);

      const contact = rappel.contacts;
      const nomContact = contact 
        ? `${contact.prenom} ${contact.nom}` 
        : 'ton contact';

      console.log(`👤 Contact: ${nomContact}`);

      try {
        const { data, error: errorEmail } = await resend.emails.send({
          from: 'noreply@ephemer.name',
          to: destination,
          subject: rappel.sujet_email || `Rappel Ephemer - ${rappel.type_evenement}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>🔔 Rappel Ephemer</h2>
              <p><strong>Concerne :</strong> ${nomContact}</p>
              <p><strong>Type :</strong> ${rappel.type_evenement} (${rappel.type_rappel})</p>
              <hr style="border: 1px solid #eee;"/>
              <p>${(rappel.message || 'Pas de message défini.').replace(/\n/g, '<br/>')}</p>
              <hr style="border: 1px solid #eee;"/>
              <p style="color: #888; font-size: 12px;">Envoyé par Ephemer 💌</p>
            </div>
          `,
        });

        if (errorEmail) {
          console.error(`❌ Erreur envoi email pour rappel ${rappel.id}:`, errorEmail);
          resultats.push({ id: rappel.id, statut: 'erreur', erreur: errorEmail.message });
        } else {
          console.log(`✅ Email envoyé avec succès (ID: ${data?.id})`);

          // ✅ Marquer comme envoyé dans la base
          await supabase
            .from('rappels')
            .update({
              statut: 'envoye',
              sent_at: new Date().toISOString(),
            })
            .eq('id', rappel.id);

          resultats.push({ 
            id: rappel.id, 
            statut: 'envoye', 
            emailId: data?.id 
          });
        }
      } catch (emailError: any) {
        console.error(`❌ Exception lors de l'envoi pour ${rappel.id}:`, emailError);
        resultats.push({ id: rappel.id, statut: 'erreur', erreur: emailError.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${resultats.length} rappel(s) traité(s)`,
      resultats,
      date: aujourdhui
    });

  } catch (err: any) {
    console.error('❌ Erreur générale:', err);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur', 
      details: err.message 
    }, { status: 500 });
  }
}
