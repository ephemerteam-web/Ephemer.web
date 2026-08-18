// app/api/invitation-notifier/route.ts
// 🔔 Appelé quand un invité remplit le formulaire
// Crée une notification + envoie un email à l'hôte

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    }

    // 1️⃣ Retrouver l'invitation et son propriétaire
    const { data: invitation, error: errorInvitation } = await supabaseAdmin
      .from('invitations')
      .select('id, user_id, label')
      .eq('token', token)
      .single()

    if (errorInvitation || !invitation) {
      console.error('❌ Invitation introuvable pour le token:', token)
      return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })
    }

    const hoteId = invitation.user_id

    // 2️⃣ Récupérer l'email et le prénom de l'hôte
    const { data: hote } = await supabaseAdmin
      .from('profiles')
      .select('email, prenom, nom')
      .eq('id', hoteId)
      .single()

    if (!hote) {
      console.error('❌ Hôte introuvable:', hoteId)
      return NextResponse.json({ error: 'Hôte introuvable' }, { status: 404 })
    }

    // 3️⃣ Récupérer le dernier contact créé par l'hôte (celui qu'on vient d'ajouter)
    const { data: dernierContact } = await supabaseAdmin
      .from('contacts')
      .select('id, prenom, nom')
      .eq('user_id', hoteId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const prenomInvite = dernierContact?.prenom || 'Quelqu\'un'
    const nomInvite = dernierContact?.nom || ''
    const contactId = dernierContact?.id || null

    // 4️⃣ 🔔 CRÉER LA NOTIFICATION
    const messageNotif = `${prenomInvite}${nomInvite ? ' ' + nomInvite : ''} a rejoint ton calendrier ! 🎉`

    const { error: errorNotif } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: hoteId,
        contact_id: contactId,
        message: messageNotif,
        lue: false,
        type: 'invitation_remplie',
        jours_restants: null,
      })

    if (errorNotif) {
      console.error('⚠️ Erreur création notification:', errorNotif.message)
    } else {
      console.log(`✅ Notification créée pour l'hôte ${hoteId}`)
    }

    // 5️⃣ ✉️ ENVOYER L'EMAIL À L'HÔTE
    if (hote.email) {
      try {
        await resend.emails.send({
          from: `Ephemer <noreply@ephemer.name>`,
          to: hote.email,
          subject: `${prenomInvite} a rejoint ton calendrier ! 🎉`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; background: #0F1017; color: #fff; padding: 40px 24px; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <span style="font-size: 48px;">🎉</span>
              </div>
              <h1 style="font-size: 22px; font-weight: 600; text-align: center; margin-bottom: 8px;">
                Bonne nouvelle, ${hote.prenom || ''} !
              </h1>
              <p style="text-align: center; color: rgba(255,255,255,0.6); margin-bottom: 32px; line-height: 1.6;">
                <strong style="color: #C9A961;">${prenomInvite}${nomInvite ? ' ' + nomInvite : ''}</strong> a rempli ton invitation et rejoint ton calendrier Ephemer.
              </p>
              <div style="background: rgba(201,169,97,0.08); border: 1px solid rgba(201,169,97,0.2); border-radius: 12px; padding: 20px; margin-bottom: 32px; text-align: center;">
                <p style="margin: 0; color: #C9A961; font-size: 14px;">
                  Tu ne l'oublieras plus jamais ! ✨
                </p>
              </div>
              <div style="text-align: center;">
                <a href="https://ephemer.name/dashboard" style="display: inline-block; background: #C9A961; color: #0F1017; font-weight: 600; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-size: 15px;">
                  Voir mon calendrier →
                </a>
              </div>
              <div style="margin-top: 40px; text-align: center;">
                <p style="font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.25); margin-bottom: 4px;">Ephemer</p>
                <p style="font-size: 13px; color: rgba(255,255,255,0.3);">N'oublie plus jamais les dates qui comptent.</p>
              </div>
            </div>
          `,
        })
        console.log(`✅ Email envoyé à ${hote.email}`)
      } catch (emailError) {
        console.error('⚠️ Erreur envoi email:', emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('❌ Erreur générale invitation-notifier:', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}