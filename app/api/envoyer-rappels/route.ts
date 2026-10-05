import { readPages, readAllResult } from '@/lib/pagination';
import { DEFAULT_PREFERENCES, resolvePreferences } from '@/lib/notification-preferences';
import { parisDay } from '@/lib/calendar-day';
// app/api/envoyer-rappels/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { deliverEmail, recordCronRun } from '@/lib/email-delivery';
import { createHash } from 'node:crypto';
import { genererEmailRappel } from '@/lib/email-templates';
import { supabaseAdmin } from '@/lib/supabase-admin'
import { messageNeedsRescheduling, automaticReminderUseful } from '@/lib/reminder-policy';
import { rappelOccurrenceCurrent } from '@/lib/rappel-occurrence';

// 🔐 Secrets lus depuis les variables d'environnement (jamais en clair dans le code)
const CRON_SECRET = process.env.CRON_SECRET;

// 🆕 Préférences par défaut (si l'utilisateur n'a jamais réglé ses préférences)
const PREFS_DEFAUT = DEFAULT_PREFERENCES;

export async function GET(request: NextRequest) {
  // 🔐 Vérification de sécurité : UNIQUEMENT le header Authorization
  // Vercel Cron envoie automatiquement "Bearer <CRON_SECRET>"
  const authHeader = request.headers.get('authorization');

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const aujourdhui = parisDay();
    const force = false; // Aucun envoi anticipé par paramètre URL.

    console.log(`\n📅 === CRON RAPPELS EPHEMER - ${aujourdhui} ===`);
    console.log(`🔧 Mode force : ${force ? 'OUI (tous les rappels programmés)' : 'NON (date_envoi <= aujourd\'hui)'}`);

    const resultats: { id: number; statut: string; raison?: string; erreur?: string; emailId?: string }[] = [];
    for await (const rappels of readPages(() => supabaseAdmin.from('rappels')
      .select('*, contacts (prenom, nom, email, user_id)').eq('statut', 'programme').lte('date_envoi', aujourdhui))) {

    // 2️⃣ Récupération des profils expéditeurs (optimisé)
    const userIds = [...new Set(rappels.map(r => r.user_id).filter(Boolean))];
    const alertUserIds = [...new Set(rappels.filter(r => r.source !== 'message_programme').map(r => r.user_id).filter(Boolean))];
    const profilsMap: Record<string, { prenom?: string | null; nom?: string | null; email?: string | null }> = {};

    // ✅ SÉCURITÉ 2 : PostgreSQL n'accepte pas .in([]) vide
    if (userIds.length > 0) {
      const { data: profils, error: errorProfils } = await readAllResult(() => supabaseAdmin
        .from('profiles')
        .select('id, prenom, nom, email')
        .in('id', userIds));

      if (errorProfils) {
        throw errorProfils;
      } else {
        profils?.forEach(p => { if (p.id) profilsMap[p.id] = p; });
      }
    }

    // 🆕 2️⃣bis) Récupération des PRÉFÉRENCES de notification (en une seule fois)
    const prefsMap: Record<string, typeof PREFS_DEFAUT> = {};
    let preferencesUnavailable = false;

    if (alertUserIds.length > 0) {
      const { data: prefs, error: errorPrefs } = await readAllResult(() => supabaseAdmin
        .from('notification_preferences')
        .select('user_id, canal_email, rappel_j7, rappel_j3, rappel_j1, rappel_jourj')
        .in('user_id', alertUserIds), 'user_id');

      if (errorPrefs) {
        // Une panne des préférences bloque les alertes, pas les messages explicites.
        console.error('Préférences indisponibles pour les alertes');
        preferencesUnavailable = true;
      } else {
        prefs?.forEach(p => {
          if (p.user_id) {
            prefsMap[p.user_id] = resolvePreferences(p);
          }
        });
      }
    }

        // 🆕 Petite fonction : ce type de rappel est-il activé par l'utilisateur ?
    function typeRappelActive(prefs: typeof PREFS_DEFAUT, typeRappel: string): boolean {
      if (typeRappel === 'j3') return prefs.rappel_j3;
      if (typeRappel === 'j7') return prefs.rappel_j7;
      if (typeRappel === 'j1') return prefs.rappel_j1;
      if (typeRappel === 'jourj') return prefs.rappel_jourj;

      // 🆕 Les rappels 'j30' sont RÉSERVÉS à la newsletter mensuelle
      //    → on ne les envoie JAMAIS en email individuel
      if (typeRappel === 'j30') return false;

      // Type inconnu → par sécurité, on ne l'envoie pas
      return false;
    }



    // 3️⃣ Boucle de traitement
    for (const rappel of rappels) {
      try {
        if (!await rappelOccurrenceCurrent(supabaseAdmin, rappel)) {
          resultats.push({ id: rappel.id, statut: 'suspendu', raison: 'occurrence_modifiee_ou_suspendue' });
          continue;
        }
      } catch {
        resultats.push({ id: rappel.id, statut: 'erreur', erreur: 'Vérification de la date impossible' });
        continue;
      }
      const messageManuel = rappel.source === 'message_programme';
      if (!messageManuel && preferencesUnavailable) {
        resultats.push({ id: rappel.id, statut: 'erreur', erreur: 'Préférences indisponibles' });
        continue;
      }
      // Au-delà du lendemain, ne jamais envoyer un ancien message par surprise.
      // Le laisser visible pour que son auteur décide de le reprogrammer.
      if (messageManuel && messageNeedsRescheduling(rappel.date_envoi, aujourdhui)) {
        resultats.push({ id: rappel.id, statut: 'suspendu', raison: 'date_depassee_reprogrammation_requise' });
        continue;
      }
      if (!messageManuel && !automaticReminderUseful(rappel.date_envoi, rappel.type_rappel, rappel.event_date, aujourdhui)) {
        resultats.push({ id: rappel.id, statut: 'ignore', raison: 'evenement_termine' });
        continue;
      }
      // 🆕 Préférences de CET utilisateur (ou valeurs par défaut)
      const prefs = prefsMap[rappel.user_id] || PREFS_DEFAUT;

      // 🆕 FILTRE 1 : l'utilisateur veut-il recevoir des emails ?
      if (!messageManuel && !prefs.canal_email) {
        console.log(`⏭️ Rappel ${rappel.id} ignoré : emails désactivés par l'utilisateur`);
        resultats.push({ id: rappel.id, statut: 'ignore', raison: 'email_desactive' });
        continue; // on passe au rappel suivant
      }

      // 🆕 FILTRE 2 : ce type de rappel (j7/j1/jourj) est-il activé ?
      if (!messageManuel && !typeRappelActive(prefs, rappel.type_rappel)) {
        console.log(`⏭️ Rappel ${rappel.id} ignoré : type "${rappel.type_rappel}" désactivé`);
        resultats.push({ id: rappel.id, statut: 'ignore', raison: `type_${rappel.type_rappel}_desactive` });
        continue; // on passe au rappel suivant
      }

      // 👤 Expéditeur
      const expediteur = profilsMap[rappel.user_id] || {};
      const expediteurNom = `${expediteur.prenom || ''} ${expediteur.nom || ''}`.trim() || 'Un ami Ephemer';
      const expediteurEmail = expediteur.email || '';

      // 🤝 Contact (sécurisé contre null/undefined)
      const contact = rappel.contacts || { prenom: 'Ami', nom: '', email: '', user_id: null };

      // 📍 Logique de destination
      let destEmail: string | string[];
      const emailContactFallback = rappel.email_destinataire || contact.email || '';

      switch (rappel.destinataire) {
        case 'moi':
          destEmail = expediteurEmail;
          break;
        case 'contact':
          destEmail = emailContactFallback;
          break;
        case 'les_deux':
          destEmail = [expediteurEmail, emailContactFallback].filter(Boolean);
          break;
        default:
          resultats.push({ id: rappel.id, statut: 'erreur', erreur: 'Destination inconnue' });
          continue;
      }
      if ((rappel.contacts ? contact.user_id !== rappel.user_id : !(rappel.occurrence_id && rappel.contact_id === null && rappel.destinataire === 'moi')) ||
          (rappel.destinataire !== 'contact' && !expediteurEmail) ||
          (rappel.destinataire !== 'moi' && !emailContactFallback)) {
        resultats.push({ id: rappel.id, statut: 'erreur', erreur: 'Contact ou adresse de destination invalide' });
        continue;
      }

      console.log(`📬 Traitement ID ${rappel.id} -> ${Array.isArray(destEmail) ? destEmail.join(', ') : destEmail}`);

      try {
        // ✉️ Envoi via Resend
        const source = { date_envoi: rappel.date_envoi, message: rappel.message, sujet_email: rappel.sujet_email,
          destinataire: rappel.destinataire, email_destinataire: rappel.email_destinataire,
          contact_id: rappel.contact_id, type_evenement: rappel.type_evenement, ton: rappel.ton, source: rappel.source };
        const version = createHash('sha256').update(JSON.stringify(source)).digest('hex');
        const result = await deliverEmail({ key: `rappel/${rappel.id}/${version}`, kind: 'rappel', userId: rappel.user_id,
          rappelId: rappel.id, source, expiresOn: messageManuel
            ? new Date(Date.parse(`${rappel.date_envoi}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
            : rappel.event_date || new Date(Date.parse(`${rappel.date_envoi}T00:00:00Z`) + (rappel.type_rappel === 'j7' ? 7 : rappel.type_rappel === 'j3' ? 3 : rappel.type_rappel === 'j1' ? 1 : 0) * 86_400_000).toISOString().slice(0, 10),
          payload: {
          from: 'Ephemer <noreply@ephemer.name>',
          to: destEmail,
          replyTo: expediteurEmail || undefined,
          subject: rappel.sujet_email || `Rappel - ${rappel.type_evenement || 'Événement'}`,
          html: genererEmailRappel({
            prenom: contact.prenom || 'ton contact',
            nom: contact.nom || '',
            typeEvenement: rappel.type_evenement || 'Événement',
            message: rappel.message || 'Pense à cette personne aujourd\'hui ❤️',
            dateEnvoi: rappel.date_envoi,
            ton: rappel.ton,
            expediteurNom,
            expediteurEmail
          }),
        } });
        // Le journal et le statut source sont validés ensemble dans PostgreSQL.
        resultats.push({ id: rappel.id, statut: ['accepted', 'already_accepted'].includes(result.state) ? 'envoye' : result.state, emailId: result.emailId });
        await recordCronRun('envoyer-rappels', rappel.user_id, aujourdhui, 'livraison', !['review', 'failed'].includes(result.state));
      } catch (err: unknown) {
        console.error(`❌ Échec envoi rappel ${rappel.id}:`, (err instanceof Error ? err.message : 'Erreur inconnue'));
        resultats.push({ id: rappel.id, statut: 'erreur', erreur: (err instanceof Error ? err.message : 'Erreur inconnue') });
        try { await recordCronRun('envoyer-rappels', rappel.user_id, aujourdhui, 'livraison', false); } catch { /* L'échec du journal ne bloque pas le rappel suivant. */ }
      }
    }

    }
    return NextResponse.json({
      success: !resultats.some(r => ['erreur', 'review', 'failed'].includes(r.statut)),
      date: aujourdhui,
      total_traites: resultats.length,
      resultats,
    }, { status: resultats.some(r => ['erreur', 'review', 'failed'].includes(r.statut)) ? 500 : 200 });

  } catch (err: unknown) {
    console.error('❌ Erreur générale cron:', err);
    return NextResponse.json({ error: 'Erreur interne', details: (err instanceof Error ? err.message : 'Erreur inconnue') }, { status: 500 });
  }
}
