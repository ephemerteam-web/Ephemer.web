// app/api/envoyer-rappels/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend } from '@/lib/resend';
import { genererEmailRappel } from '@/lib/email-templates';

// 🔑 CLIENT SUPABASE SÉCURISÉ
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 🛡️ Vérification stricte au démarrage (évite les erreurs silencieuses en production)
if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ Variables d\'environnement Supabase manquantes : SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const EMAIL_TEST = 'ephemer.team@gmail.com';
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // 🔐 Vérification de sécurité (Vercel Cron OU tests manuels)
  const isVercelCron = request.headers.get('x-vercel-cron') === 'true';
  const urlSecret = request.nextUrl.searchParams.get('secret');
  const authHeader = request.headers.get('authorization');

  const isAuthorized =
    isVercelCron ||
    (urlSecret && urlSecret === CRON_SECRET) ||
    (authHeader && authHeader === `Bearer ${CRON_SECRET}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const aujourdhui = new Date().toISOString().split('T')[0];
    const force = request.nextUrl.searchParams.get('force') === 'true';

    console.log(`\n📅 === CRON RAPPELS EPHEMER - ${aujourdhui} ===`);
    console.log(`🔧 Mode force : ${force ? 'OUI (tous les rappels programmés)' : 'NON (date_envoi <= aujourd\'hui)'}`);

    // 1️⃣ Récupération des rappels + infos du contact
    let query = supabase
      .from('rappels')
      .select(`
        *,
        contacts (prenom, nom, email)
      `)
      .eq('statut', 'programme')
      .order('created_at', { ascending: false });

    if (!force) {
      query = query.lte('date_envoi', aujourdhui);
    }

    const { data: rappels, error: errorRappels } = await query;
    if (errorRappels) throw errorRappels;

    console.log(`📊 ${rappels?.length || 0} rappel(s) à traiter`);

    if (!rappels || rappels.length === 0) {
      return NextResponse.json({ success: true, message: 'Aucun rappel à envoyer', date: aujourdhui });
    }

    // 2️⃣ Récupération des profils expéditeurs (optimisé)
    const userIds = [...new Set(rappels.map(r => r.user_id).filter(Boolean))];
    const profilsMap: Record<string, { prenom?: string; nom?: string; email?: string }> = {};

    // ✅ SÉCURITÉ 2 : PostgreSQL n'accepte pas .in([]) vide
    if (userIds.length > 0) {
      const { data: profils, error: errorProfils } = await supabase
        .from('profiles')
        .select('id, prenom, nom, email')
        .in('id', userIds);

      if (errorProfils) {
        console.error('⚠️ Erreur récupération profils:', errorProfils.message);
      } else {
        profils?.forEach(p => { if (p.id) profilsMap[p.id] = p; });
      }
    }

    const resultats = [];

    // 3️⃣ Boucle de traitement
    for (const rappel of rappels) {
      // 👤 Expéditeur
      const expediteur = profilsMap[rappel.user_id] || {};
      const expediteurNom = `${expediteur.prenom || ''} ${expediteur.nom || ''}`.trim() || 'Un ami Ephemer';
      const expediteurEmail = expediteur.email || 'contact@ephemer.name';

      // 🤝 Contact (sécurisé contre null/undefined)
      const contact = rappel.contacts || { prenom: 'Ami', nom: '', email: '' };
      
      // 📍 Logique de destination
      let destEmail: string | string[];
      const emailContactFallback = rappel.email_destinataire || EMAIL_TEST;

      switch (rappel.destinataire) {
        case 'moi':
          destEmail = expediteurEmail;
          break;
        case 'contact':
          destEmail = emailContactFallback;
          break;
        case 'les_deux':
        default:
          destEmail = [expediteurEmail, emailContactFallback].filter(Boolean);
          break;
      }

      console.log(`📬 Traitement ID ${rappel.id} -> ${Array.isArray(destEmail) ? destEmail.join(', ') : destEmail}`);

      try {
        // ✉️ Envoi via Resend
        const { data, error: errorEmail } = await resend.emails.send({
          from: `${expediteurNom} <noreply@ephemer.name>`,
          to: destEmail,
          replyTo: expediteurEmail,
          subject: rappel.sujet_email || `Rappel - ${rappel.type_evenement || 'Événement'}`,
          html: genererEmailRappel({
            prenom: contact.prenom || 'ton contact',
            nom: contact.nom || '',
            typeEvenement: rappel.type_evenement || 'Événement',
            message: rappel.message || 'Pense à cette personne aujourd\'hui ❤️',
            dateEnvoi: aujourdhui,
            ton: rappel.type_rappel,
            expediteurNom,
            expediteurEmail
          }),
        });

        if (errorEmail) throw errorEmail;

        // ✅ Mise à jour du statut dans Supabase
        const { error: updateError } = await supabase
          .from('rappels')
          .update({ statut: 'envoye', sent_at: new Date().toISOString() })
          .eq('id', rappel.id);

        if (updateError) {
          console.error(`❌ Erreur update statut rappel ${rappel.id}:`, updateError.message);
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
