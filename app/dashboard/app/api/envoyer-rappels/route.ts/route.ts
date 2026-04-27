import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resend } from '@/lib/resend'

// On crée un client Supabase "admin" (côté serveur, pas côté utilisateur)
// Ce client a le droit de lire TOUTES les données, pas seulement celles de l'utilisateur connecté
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ← clé secrète admin (pas la clé publique)
)

export async function GET(request: Request) {

  // 🔐 Sécurité : on vérifie que l'appel vient bien de Vercel Cron (et pas de n'importe qui)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // 📅 On récupère la date d'aujourd'hui au format YYYY-MM-DD
  const aujourdhui = new Date().toISOString().split('T')[0]

  // 🔍 On cherche dans Supabase tous les rappels à envoyer aujourd'hui
  const { data: rappels, error } = await supabaseAdmin
    .from('rappels')
    .select('*')
    .eq('date_envoi', aujourdhui)      // date_envoi = aujourd'hui
    .eq('statut', 'programme')         // pas encore envoyés

  if (error) {
    console.error('Erreur Supabase:', error)
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
  }

  if (!rappels || rappels.length === 0) {
    return NextResponse.json({ message: 'Aucun rappel aujourd\'hui' })
  }

  // 📧 Pour chaque rappel, on envoie l'email
  const resultats = await Promise.all(
    rappels.map(async (rappel) => {

      // On construit la liste des destinataires selon le champ "destinataire"
      const emails: string[] = []

      if (rappel.destinataire === 'moi' || rappel.destinataire === 'les_deux') {
        // On récupère l'email de l'utilisateur depuis la table profiles
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('email')
          .eq('id', rappel.user_id)
          .single()

        if (profile?.email) emails.push(profile.email)
      }

      if ((rappel.destinataire === 'contact' || rappel.destinataire === 'les_deux') && rappel.email_destinataire) {
        emails.push(rappel.email_destinataire)
      }

      // Si pas d'email trouvé, on passe
      if (emails.length === 0) {
        return { id: rappel.id, statut: 'ignoré - pas d\'email' }
      }

      // 📤 Envoi de l'email via Resend
      const { error: erreurEnvoi } = await resend.emails.send({
        from: 'MemoRi <noreply@ton-domaine.com>',  // ← à modifier avec ton domaine
        to: emails,
        subject: rappel.sujet_email,
        text: rappel.message,  // version texte brut
      })

      if (erreurEnvoi) {
        // En cas d'erreur, on marque le rappel comme "erreur"
        await supabaseAdmin
          .from('rappels')
          .update({ statut: 'annule' })
          .eq('id', rappel.id)
        return { id: rappel.id, statut: 'erreur', erreur: erreurEnvoi }
      }

      // ✅ Succès : on marque le rappel comme envoyé
      await supabaseAdmin
        .from('rappels')
        .update({ statut: 'envoye', sent_at: new Date().toISOString() })
        .eq('id', rappel.id)

      return { id: rappel.id, statut: 'envoyé', emails }
    })
  )

  return NextResponse.json({ resultats })
}
