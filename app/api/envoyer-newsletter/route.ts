// app/api/envoyer-newsletter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { resend } from '@/lib/resend';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  genererNewsletterMensuelle,
  EvenementNewsletter,
  EMAIL_CONFIG,
} from '@/lib/email-templates';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // ─────────────────────────────────────────────
    // 1️⃣ SÉCURITÉ : on vérifie le mot de passe
    // ─────────────────────────────────────────────
    const secret = request.nextUrl.searchParams.get('secret');
    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // ─────────────────────────────────────────────
    // 2️⃣ On calcule le mois en cours (dates de début/fin)
    // ─────────────────────────────────────────────
    const maintenant = new Date();
    const annee = maintenant.getFullYear();
    const mois = maintenant.getMonth(); // 0 = janvier, 8 = septembre

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
    // ─────────────────────────────────────────────
    const { data: contacts, error: errContacts } = await supabaseAdmin
      .from('contacts')
      .select('user_id, prenom, nom, date_naissance')
      .in('user_id', userIds)
      .not('date_naissance', 'is', null);

    if (errContacts) throw errContacts;

    // ─────────────────────────────────────────────
    // 6️⃣ Pour chaque user, on filtre les anniversaires du mois
    // ─────────────────────────────────────────────
    const resultats = [];

    for (const profil of profils || []) {
      // Sécurité : pas d'email = on saute
      if (!profil.email) continue;

      // On garde les contacts de CE user dont l'anniversaire tombe ce mois-ci
      const evenements: EvenementNewsletter[] = (contacts || [])
        .filter((c) => {
          if (c.user_id !== profil.id) return false;
          if (!c.date_naissance) return false;
          // getMonth() sur la date de naissance → est-ce le mois courant ?
          const dateNaiss = new Date(c.date_naissance);
          return dateNaiss.getMonth() === mois;
        })
        .map((c) => {
          const dateNaiss = new Date(c.date_naissance);
          return {
            prenomContact: c.prenom || 'Contact',
            nomContact: c.nom || '',
            typeEvenement: 'anniversaire',
            jour: dateNaiss.getDate(), // le jour du mois (1-31)
            emoji: '🎂',
          };
        })
        // On trie par jour croissant
        .sort((a, b) => a.jour - b.jour);

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