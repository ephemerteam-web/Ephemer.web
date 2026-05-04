// app/api/envoyer-rappels/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend } from '@/lib/resend';

// 🔑 Variables d'environnement serveur (ne pas préfixer par NEXT_PUBLIC)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EMAIL_TEST = 'ephemer.team@gmail.com';
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // 1️⃣ Vérification de sécurité (empêche n'importe qui de lancer le cron)
  const urlSecret = request.nextUrl.searchParams.get('secret');
  const authHeader = request.headers.get('authorization');

  if (!CRON_SECRET) {
    console.error("❌ CRON_SECRET manquant dans les variables d'environnement Vercel");
    return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
  }

  const isAuthorized =
    (urlSecret && urlSecret === CRON_SECRET) ||
    (authHeader && authHeader === `Bearer ${CRON_SECRET}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const aujourdhui = new Date().toISOString().split('T')[0]; // ex: "2026-05-02"
    const force = request.nextUrl.searchParams.get('force') === 'true';

    console.log(`\n📅 === CRON RAPPELS EPHEMER - ${aujourdhui} ===`);
    console.log(`🔧 Mode force : ${force ? 'OUI (tous les rappels programme)' : 'NON (date_envoi <= aujourd\'hui)'}`);

    // 2️⃣ Requête corrigée selon ton schéma BDD
    let query = supabase
      .from('rappels')
      .select(`
        *,
        contacts (prenom, nom, email)
      `)
      .eq('statut', 'programme') // ✅ Correspond à ta BDD
      .order('created_at', { ascending: false });

    // Si ce n'est pas un test forcé, on ne prend que les rappels dont la date est arrivée ou passée
    if (!force) {
      query = query.lte('date_envoi', aujourdhui); // ✅ lte = Less Than or Equal (<=)
    }

    const { data: rappels, error } = await query;
    if (error) throw error;

    console.log(`📊 ${rappels?.length || 0} rappel(s) à traiter`);

    if (!rappels || rappels.length === 0) {
      return NextResponse.json({ success: true, message: 'Aucun rappel à envoyer', date: aujourdhui });
    }

    const resultats = [];

    for (const rappel of rappels) {
      const contact = rappel.contacts;
      const nomContact = contact 
        ? `${contact.prenom || ''} ${contact.nom || ''}`.trim() 
        : 'ton contact';
      
      // 🛡️ Fallback vers email de test si le contact n'a pas d'email ou pour sécurité prod
      const destEmail = rappel.email_destinataire || EMAIL_TEST;

      console.log(`📬 Traitement ID ${rappel.id} -> ${destEmail}`);

      try {
        // 3️⃣ Envoi via Resend
        const { data, error: errorEmail } = await resend.emails.send({
          from: 'Ephemer <noreply@ephemer.name>', // ✅ Format validé Resend
          to: destEmail,
          subject: rappel.sujet_email || `Rappel - ${rappel.type_evenement || 'Événement'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
              <h2>🔔 Rappel Ephemer.name</h2>
              <p><strong>Pour :</strong> ${nomContact}</p>
              <p><strong>Type :</strong> ${rappel.type_evenement || 'Événement'} • ${rappel.type_rappel || 'J-0'}</p>
              <hr style="border: 1px solid #eee; margin: 20px 0;"/>
              <p style="font-size: 16px; white-space: pre-wrap;">${rappel.message || 'Pense à cette personne aujourd\'hui ❤️'}</p>
              <hr style="border: 1px solid #eee; margin: 20px 0;"/>
              <p style="color: #888; font-size: 13px;">Envoyé automatiquement le ${aujourdhui} par <strong>Ephemer.name</strong></p>
            </div>
          `,
        });

        if (errorEmail) throw errorEmail;

        // 4️⃣ Mise à jour du statut dans Supabase
        const { error: updateError } = await supabase
          .from('rappels')
          .update({ statut: 'envoye', sent_at: new Date().toISOString() })
          .eq('id', rappel.id);

        if (updateError) {
          console.error(`❌ Erreur update statut rappel ${rappel.id}:`, updateError);
        }

        resultats.push({ id: rappel.id, statut: 'envoye', emailId: data?.id });
      } catch (err: any) {
        console.error(`❌ Échec envoi rappel ${rappel.id}:`, err.message);
        resultats.push({ id: rappel.id, statut: 'erreur', erreur: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      date: aujourdhui,
      total_traites: resultats.length,
      resultats,
    });

  } catch (err: any) {
    console.error('❌ Erreur générale cron:', err);
    return NextResponse.json({ error: 'Erreur interne', details: err.message }, { status: 500 });
  }
}
