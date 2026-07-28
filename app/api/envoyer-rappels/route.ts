// app/api/envoyer-rappels/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { resend } from '@/lib/resend';
import { genererEmailRappel } from '@/lib/email-templates';
import { supabaseAdmin } from '@/lib/supabase-admin'

// 🔐 Secrets lus depuis les variables d'environnement (jamais en clair dans le code)
const CRON_SECRET = process.env.CRON_SECRET;
const EMAIL_TEST = process.env.EMAIL_TEST || '';

// 🆕 Préférences par défaut (si l'utilisateur n'a jamais réglé ses préférences)
const PREFS_DEFAUT = {
  canal_email: true,
  rappel_j7: true,
  rappel_j1: false,
  rappel_jourj: true,
};

export async function GET(request: NextRequest) {
  // 🔐 Vérification de sécurité : UNIQUEMENT le header Authorization
  // Vercel Cron envoie automatiquement "Bearer <CRON_SECRET>"
  const authHeader = request.headers.get('authorization');

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const aujourdhui = new Date().toISOString().split('T')[0];
    const force = request.nextUrl.searchParams.get('force') === 'true';

    console.log(`\n📅 === CRON RAPPELS EPHEMER - ${aujourdhui} ===`);
    console.log(`🔧 Mode force : ${force ? 'OUI (tous les rappels programmés)' : 'NON (date_envoi <= aujourd\'hui)'}`);

    // 1️⃣ Récupération des rappels + infos du contact
    let query = supabaseAdmin
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
      const { data: profils, error: errorProfils } = await supabaseAdmin
        .from('profiles')
        .select('id, prenom, nom, email')
        .in('id', userIds);

      if (errorProfils) {
        console.error('⚠️ Erreur récupération profils:', errorProfils.message);
      } else {
        profils?.forEach(p => { if (p.id) profilsMap[p.id] = p; });
      }
    }

    // 🆕 2️⃣bis) Récupération des PRÉFÉRENCES de notification (en une seule fois)
    const prefsMap: Record<string, typeof PREFS_DEFAUT> = {};

    if (userIds.length > 0) {
      const { data: prefs, error: errorPrefs } = await supabaseAdmin
        .from('notification_preferences')
        .select('user_id, canal_email, rappel_j7, rappel_j1, rappel_jourj')
        .in('user_id', userIds);

      if (errorPrefs) {
        console.error('⚠️ Erreur récupération préférences:', errorPrefs.message);
      } else {
        prefs?.forEach(p => {
          if (p.user_id) {
            prefsMap[p.user_id] = {
              canal_email: p.canal_email,
              rappel_j7: p.rappel_j7,
              rappel_j1: p.rappel_j1,
              rappel_jourj: p.rappel_jourj,
            };
          }
        });
      }
    }

        // 🆕 Petite fonction : ce type de rappel est-il activé par l'utilisateur ?
    function typeRappelActive(prefs: typeof PREFS_DEFAUT, typeRappel: string): boolean {
      if (typeRappel === 'j7') return prefs.rappel_j7;
      if (typeRappel === 'j1') return prefs.rappel_j1;
      if (typeRappel === 'jourj') return prefs.rappel_jourj;

      // 🆕 Les rappels 'j30' sont RÉSERVÉS à la newsletter mensuelle
      //    → on ne les envoie JAMAIS en email individuel
      if (typeRappel === 'j30') return false;

      // Type inconnu → par sécurité, on ne l'envoie pas
      return false;
    }

    const resultats = [];

    // 3️⃣ Boucle de traitement
    for (const rappel of rappels) {
      // 🆕 Préférences de CET utilisateur (ou valeurs par défaut)
      const prefs = prefsMap[rappel.user_id] || PREFS_DEFAUT;

      // 🆕 FILTRE 1 : l'utilisateur veut-il recevoir des emails ?
      if (!prefs.canal_email) {
        console.log(`⏭️ Rappel ${rappel.id} ignoré : emails désactivés par l'utilisateur`);
        resultats.push({ id: rappel.id, statut: 'ignore', raison: 'email_desactive' });
        continue; // on passe au rappel suivant
      }

      // 🆕 FILTRE 2 : ce type de rappel (j7/j1/jourj) est-il activé ?
      if (!typeRappelActive(prefs, rappel.type_rappel)) {
        console.log(`⏭️ Rappel ${rappel.id} ignoré : type "${rappel.type_rappel}" désactivé`);
        resultats.push({ id: rappel.id, statut: 'ignore', raison: `type_${rappel.type_rappel}_desactive` });
        continue; // on passe au rappel suivant
      }

      // 👤 Expéditeur
      const expediteur = profilsMap[rappel.user_id] || {};
      const expediteurNom = `${expediteur.prenom || ''} ${expediteur.nom || ''}`.trim() || 'Un ami Ephemer';
      const expediteurEmail = expediteur.email || 'noreply@ephemer.name';

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
            ton: rappel.ton,
            expediteurNom,
            expediteurEmail
          }),
        });

        if (errorEmail) throw errorEmail;

        // ✅ Mise à jour du statut dans Supabase
        const { error: updateError } = await supabaseAdmin
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