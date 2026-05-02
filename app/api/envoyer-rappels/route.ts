// app/api/envoyer-rappels/route.ts
// Cette route est appelée tous les matins à 9h00 par le cron Vercel
// Elle cherche les rappels à envoyer et les envoie par email

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend } from '@/lib/resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EMAIL_TEST = 'ephemer.team@gmail.com';
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const urlSecret = request.nextUrl.searchParams.get('secret');
  const authHeader = request.headers.get('authorization');

  const isAuthorized = 
    (urlSecret && urlSecret === CRON_SECRET) ||
    (authHeader && authHeader === `Bearer ${CRON_SECRET}`);

  if (!isAuthorized) {
    return NextResponse.json({ 
      error: 'Non autorisé',
      received: authHeader || urlSecret,
    }, { status: 401 });
  }

  try {
    const aujourdhui = new Date().toISOString().split('T')[0]; // ex: "2026-05-02"
    const force = request.nextUrl.searchParams.get('force') === 'true';

    console.log(`\n📅 === CRON RAPPELS EPHEMER - ${aujourdhui} ===`);
    console.log(`🔧 Mode force : ${force ? 'OUI (tous les rappels a_envoyer)' : 'NON (seulement ceux du jour)'}`);
    console.log(`⏰ Heure d\'exécution : ${new Date().toLocaleTimeString('fr-FR')}`);

    // Construction de la requête
    let query = supabase
      .from('rappels')
      .select(`
        *,
        contacts (
          prenom,
          nom,
          email
        )
      `)
      .eq('statut', 'a_envoyer')
      .order('created_at', { ascending: false });

    // En mode normal (cron quotidien), on ne prend que les rappels du jour
    if (!force) {
      query = query.eq('date_rappel', aujourdhui);
    }

    const { data: rappels, error } = await query;

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      return NextResponse.json({ 
        error: 'Erreur base de données', 
        details: error.message 
      }, { status: 500 });
    }

    console.log(`📊 ${rappels?.length || 0} rappel(s) trouvé(s) à traiter`);

    if (!rappels || rappels.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: force 
          ? "Aucun rappel à envoyer (même en mode force)" 
          : `Aucun rappel à envoyer aujourd'hui (${aujourdhui})`,
        date: aujourdhui,
        total_rappels: 0,
        mode: force ? 'force' : 'normal'
      });
    }

    const resultats: any[] = [];

    for (const rappel of rappels) {
      console.log(`\n📬 Traitement du rappel ID: ${rappel.id} - ${rappel.type_evenement || ''} ${rappel.type_rappel || ''}`);

      const contact = rappel.contacts;
      const nomContact = contact 
        ? `${contact.prenom || ''} ${contact.nom || ''}`.trim() 
        : 'ton contact';

      try {
        const { data, error: errorEmail } = await resend.emails.send({
          from: 'noreply@ephemer.name',
          to: EMAIL_TEST,                    // ← Pour l'instant on envoie tout en test
          subject: rappel.sujet_email || `Rappel - ${rappel.type_evenement || 'Événement'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
              <h2>🔔 Rappel Ephemer.name</h2>
              <p><strong>Pour :</strong> ${nomContact}</p>
              <p><strong>Type :</strong> ${rappel.type_evenement || 'Événement'} • ${rappel.type_rappel || 'J-0'}</p>
              <hr style="border: 1px solid #eee; margin: 20px 0;"/>
              <p style="font-size: 16px; white-space: pre-wrap;">${rappel.message || 'Pense à cette personne aujourd\'hui ❤️'}</p>
              <hr style="border: 1px solid #eee; margin: 20px 0;"/>
              <p style="color: #888; font-size: 13px;">
                Envoyé automatiquement le ${aujourdhui} par <strong>Ephemer.name</strong>
              </p>
            </div>
          `,
        });

        if (errorEmail) {
          console.error(`❌ Erreur email pour rappel ${rappel.id}:`, errorEmail);
          resultats.push({ 
            id: rappel.id, 
            statut: 'erreur', 
            erreur: errorEmail.message 
          });
        } else {
          console.log(`✅ Email envoyé avec succès pour le rappel ${rappel.id}`);

          // Mise à jour du statut dans la base
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
        console.error(`❌ Exception lors du traitement du rappel ${rappel.id}:`, emailError);
        resultats.push({ 
          id: rappel.id, 
          statut: 'erreur', 
          erreur: emailError.message || 'Erreur inconnue' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${resultats.length} rappel(s) traité(s) avec succès`,
      date: aujourdhui,
      mode: force ? 'force' : 'normal',
      total_rappels: rappels.length,
      resultats,
    });

  } catch (err: any) {
    console.error('❌ Erreur générale dans le cron:', err);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur', 
      details: err.message 
    }, { status: 500 });
  }
}
