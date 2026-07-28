// app/api/envoyer-newsletter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { resend } from '@/lib/resend';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  genererNewsletterMensuelle,
  EvenementNewsletter,
  EMAIL_CONFIG,
} from '@/lib/email-templates';

// 🆕 AJOUT : on importe la fonction qui retrouve une fête prénomale
import { trouverSaintParPrenom } from '@/lib/saints';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // ─────────────────────────────────────────────
  // 1️⃣ SÉCURITÉ : on vérifie le mot de passe
  // Vercel Cron envoie automatiquement le header
  // "Authorization: Bearer <CRON_SECRET>"
  // Placé AVANT le try : une requête non autorisée
  // ne doit pas entrer dans la logique métier.
  // ─────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    // ⬇️⬇️⬇️ TOUT LE RESTE DE TON FICHIER RESTE IDENTIQUE ⬇️⬇️⬇️
    // ─────────────────────────────────────────────
    // 1️⃣ SÉCURITÉ : on vérifie le mot de passe
    // (un "secret" = un mot de passe caché dans Vercel,
    //  personne d'autre ne peut déclencher la newsletter)
    // ─────────────────────────────────────────────
    const secret = request.nextUrl.searchParams.get('secret');
    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // ─────────────────────────────────────────────
    // 2️⃣ On calcule le mois en cours
    // ─────────────────────────────────────────────
    const maintenant = new Date();
    const annee = maintenant.getFullYear();
    const mois = maintenant.getMonth(); // 0 = janvier, 11 = décembre

    const moisLibelle = maintenant.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });

    // ─────────────────────────────────────────────
    // 3️⃣ On récupère les users qui ont COCHÉ la newsletter
    // ─────────────────────────────────────────────
    const { data: prefs, error: errPrefs } = await supabaseAdmin
      .from('notification_preferences')
      .select('user_id')
      .eq('newsletter_mensuelle', true)
      .eq('canal_email', true);

    if (errPrefs) throw errPrefs;

    if (!prefs || prefs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucun utilisateur abonné à la newsletter',
        total: 0,
      });
    }

    const userIds = prefs.map((p) => p.user_id);

    // ─────────────────────────────────────────────
    // 4️⃣ On récupère les profils (pour email + prénom)
    // ─────────────────────────────────────────────
    const { data: profils, error: errProfils } = await supabaseAdmin
      .from('profiles')
      .select('id, prenom, email')
      .in('id', userIds);

    if (errProfils) throw errProfils;

    // ─────────────────────────────────────────────
    // 5️⃣ On récupère TOUS les contacts de ces users
    // 🆕 CORRECTION : on ne filtre PLUS sur date_naissance
    // car on veut aussi les fêtes prénôminales (pas besoin de date de naissance !)
    // ─────────────────────────────────────────────
    const { data: contacts, error: errContacts } = await supabaseAdmin
      .from('contacts')
      .select('user_id, prenom, nom, date_naissance')
      .in('user_id', userIds);

    if (errContacts) throw errContacts;

    // ─────────────────────────────────────────────
    // 6️⃣ Pour chaque user, on construit la liste des événements du mois
    // ─────────────────────────────────────────────
    const resultats = [];

    for (const profil of profils || []) {
      if (!profil.email) continue;

      const mesContacts = (contacts || []).filter((c) => c.user_id === profil.id);
      const evenements: EvenementNewsletter[] = [];

      for (const contact of mesContacts) {
        // 🅰️ ANNIVERSAIRE : si le contact a une date de naissance CE mois-ci
        if (contact.date_naissance) {
          const dateNaiss = new Date(contact.date_naissance);
          if (dateNaiss.getMonth() === mois) {
            evenements.push({
              prenomContact: contact.prenom || 'Contact',
              nomContact: contact.nom || '',
              typeEvenement: 'anniversaire',
              jour: dateNaiss.getDate(),
              emoji: '🎂',
            });
          }
        }

        // 🆕 🅱️ Fête prénomale : si le prénom matche UNE fête CE mois-ci
        if (contact.prenom) {
          const saint = trouverSaintParPrenom(contact.prenom);
          if (saint) {
            // saint.date est au format "MM-JJ" (ex: "07-23" pour le 23 juillet)
            const moisFete = parseInt(saint.date.split('-')[0], 10) - 1; // -1 car janvier=0
            const jourFete = parseInt(saint.date.split('-')[1], 10);

            if (moisFete === mois) {
              evenements.push({
                prenomContact: contact.prenom || 'Contact',
                nomContact: contact.nom || '',
                typeEvenement: 'fete_prenomale',
                jour: jourFete,
                emoji: '🎉',
              });
            }
          }
        }
      }

      // On trie par jour croissant
      evenements.sort((a, b) => a.jour - b.jour);

      // ─────────────────────────────────────────────
      // 7️⃣ On génère et envoie l'email
      // ─────────────────────────────────────────────
      try {
        const html = genererNewsletterMensuelle({
          prenomUtilisateur: profil.prenom || 'cher utilisateur',
          moisLibelle: moisLibelle.charAt(0).toUpperCase() + moisLibelle.slice(1),
          evenements,
        });

        const { data, error } = await resend.emails.send({
          from: `${EMAIL_CONFIG.brandName} <${EMAIL_CONFIG.defaultFrom}>`,
          to: profil.email,
          subject: `📅 Votre agenda de ${moisLibelle}`,
          html,
        });

        if (error) throw error;

        resultats.push({
          user: profil.email,
          statut: 'envoye',
          nbEvenements: evenements.length,
          emailId: data?.id,
        });

        console.log(`📰 Newsletter envoyée -> ${profil.email} (${evenements.length} événements)`);
      } catch (err: any) {
        console.error(`❌ Échec newsletter ${profil.email}:`, err.message);
        resultats.push({
          user: profil.email,
          statut: 'erreur',
          erreur: err.message,
        });
      }
    }

    // ─────────────────────────────────────────────
    // 8️⃣ On renvoie le bilan
    // (le "bilan" = un résumé JSON de tout ce qui s'est passé,
    //  pour qu'on sache si ça a marché)
    // ─────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      mois: moisLibelle,
      total_traites: resultats.length,
      resultats,
    });
  } catch (err: any) {
    console.error('❌ Erreur générale newsletter:', err);
    return NextResponse.json(
      { error: 'Erreur interne', details: err.message },
      { status: 500 }
    );
  }
}