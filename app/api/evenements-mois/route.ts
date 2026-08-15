// app/api/evenements-mois/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin'; // ← Utilise supabaseAdmin
import { trouverSaintParPrenom } from '@/lib/saints';

// 📐 Type pour un événement
export interface EvenementContact {
  id: string;
  prenom: string;
  nom: string;
  typeEvenement: 'anniversaire' | 'fete_prenomale';
  jour: number;
  dateComplete: string;
  emoji: string;
}

export async function GET(request: NextRequest) {
  try {
    // 1️⃣ Récupérer l'user_id depuis le JWT (pas besoin de vérifier la session)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // 2️⃣ Décoder le token pour obtenir user_id (simplifié)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // 3️⃣ Récupérer les paramètres (mois et année)
    const searchParams = request.nextUrl.searchParams;
    const moisDemande = searchParams.get('mois');
    const anneeDemandee = searchParams.get('annee');

    const maintenant = new Date();
    const mois = moisDemande !== null ? parseInt(moisDemande, 10) : maintenant.getMonth();
    const annee = anneeDemandee !== null ? parseInt(anneeDemandee, 10) : maintenant.getFullYear();

    // 4️⃣ Récupérer tous les contacts de l'utilisateur
    const { data: contacts, error: errContacts } = await supabaseAdmin
      .from('contacts')
      .select('id, prenom, nom, date_naissance')
      .eq('user_id', user.id);

    if (errContacts) throw errContacts;

    // 5️⃣ Construire la liste des événements (même code que avant)
    const evenements: EvenementContact[] = [];

    for (const contact of contacts || []) {
      // 🅰️ ANNIVERSAIRE
      if (contact.date_naissance) {
        const dateNaiss = new Date(contact.date_naissance);
        if (dateNaiss.getMonth() === mois) {
          const dateComplete = new Date(annee, mois, dateNaiss.getDate());
          
          evenements.push({
            id: contact.id,
            prenom: contact.prenom || 'Contact',
            nom: contact.nom || '',
            typeEvenement: 'anniversaire',
            jour: dateNaiss.getDate(),
            dateComplete: dateComplete.toISOString(),
            emoji: '🎂',
          });
        }
      }

      // 🅱️ FÊTE PRÉNOMINALE
      if (contact.prenom) {
        const saint = trouverSaintParPrenom(contact.prenom);
        if (saint) {
          const moisFete = parseInt(saint.date.split('-')[0], 10) - 1;
          const jourFete = parseInt(saint.date.split('-')[1], 10);

          if (moisFete === mois) {
            const dateComplete = new Date(annee, mois, jourFete);
            
            evenements.push({
              id: contact.id,
              prenom: contact.prenom || 'Contact',
              nom: contact.nom || '',
              typeEvenement: 'fete_prenomale',
              jour: jourFete,
              dateComplete: dateComplete.toISOString(),
              emoji: '🎉',
            });
          }
        }
      }
    }

    // 6️⃣ Trier par jour
    evenements.sort((a, b) => a.jour - b.jour);

    return NextResponse.json({
      success: true,
      mois,
      annee,
      evenements,
    });
  } catch (err: any) {
    console.error('❌ Erreur API evenements-mois:', err);
    return NextResponse.json(
      { error: 'Erreur interne', details: err.message },
      { status: 500 }
    );
  }
}