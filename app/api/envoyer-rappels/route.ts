// app/api/envoyer-rappels/route.ts
// Cette route envoie les rappels du jour par email

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resend } from '@/lib/resend'

// Client Supabase avec la clé service_role (accès admin)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ⚠️ Pendant les tests : tous les emails arrivent ici
const EMAIL_TEST = 'ephemer.team@gmail.com'

export async function GET(request: Request) {
  // 🔒 Sécurité : vérifier le secret du cron
  const authHeader = request.headers.get('authorization')
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`

  console.log('🔍 Header reçu:', authHeader)
  console.log('🔍 Secret attendu:', expectedSecret)
  console.log('🔍 CRON_SECRET brut:', process.env.CRON_SECRET)

  if (authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Non autorisé', received: authHeader, expected: expectedSecret }, { status: 401 })
  }

  try {
    // 📅 Date d'aujourd'hui au format YYYY-MM-DD
    const aujourdhui = new Date().toISOString().split('T')[0]
    console.log('📅 Date recherchée:', aujourdhui)

    // 🔌 Tentative de requête Supabase
    console.log('🔌 Tentative de requête Supabase...')
    
    // 🔍 Récupérer les rappels du jour, statut "programme", + infos contact
    const { data: rappels, error } = await supabase
      .from('rappels')
      .select(`
        *,
        contacts ( prenom, nom, email )
      `)
      .eq('date_envoi', aujourdhui)
      .eq('statut', 'programme')

    // 📦 Affiche ce qu'on a reçu
    console.log('📦 Réponse Supabase - Rappels:', rappels)
    console.log('📦 Réponse Supabase - Erreur:', error)

    if (error) {
      console.error('❌ Erreur Supabase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!rappels || rappels.length === 0) {
      console.log('ℹ️ Aucun rappel à traiter aujourd\'hui')
      return NextResponse.json({ message: 'Aucun rappel à envoyer aujourd\'hui' })
    }

    console.log(`✅ ${rappels.length} rappel(s) trouvé(s)`)

    // 📧 Envoi des emails
    const resultats = []
    for (const rappel of rappels) {
      console.log(`\n📬 Traitement du rappel ID: ${rappel.id}`)
      
      // ⚠️ En test, on envoie tout sur EMAIL_TEST
      // Plus tard, on utilisera rappel.email_destinataire selon `destinataire`
      const destination = EMAIL_TEST
      console.log(`📧 Email de destination: ${destination}`)

      const contact = rappel.contacts
      const nomContact = contact ? `${contact.prenom} ${contact.nom}` : 'ton contact'
      console.log(`👤 Contact: ${nomContact}`)

      const { data, error: errorEmail } = await resend.emails.send({
        from: 'nnoreply@ephemer.name',
        to: destination,
        subject: rappel.sujet_email,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2>🔔 Rappel Ephemer</h2>
            <p><strong>Concerne :</strong> ${nomContact}</p>
            <p><strong>Type :</strong> ${rappel.type_evenement} (${rappel.type_rappel})</p>
            <hr/>
            <p>${rappel.message.replace(/\n/g, '<br/>')}</p>
            <hr/>
            <p style="color: #888; font-size: 12px;">Envoyé par Ephemer 💌</p>
          </div>
        `,
      })

      if (errorEmail) {
        console.error(`❌ Erreur envoi email pour rappel ${rappel.id}:`, errorEmail)
        resultats.push({ id: rappel.id, statut: 'erreur', erreur: errorEmail.message })
      } else {
        console.log(`✅ Email envoyé avec succès (ID: ${data?.id})`)
        
        // ✅ Marquer comme envoyé
        await supabase
          .from('rappels')
          .update({
            statut: 'envoye',
            sent_at: new Date().toISOString(),
          })
          .eq('id', rappel.id)

        resultats.push({ id: rappel.id, statut: 'envoye', emailId: data?.id })
      }
    }

    return NextResponse.json({
      message: `${resultats.length} rappel(s) traité(s)`,
      resultats,
    })
  } catch (err: any) {
    console.error('❌ Erreur générale:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
