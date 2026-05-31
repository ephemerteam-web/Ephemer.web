// Ce fichier tourne sur le SERVEUR (jamais visible par l'utilisateur)
// C'est lui qui a le droit de supprimer un compte

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'




export async function DELETE(request: Request) {
  try {
    // 1. Récupérer le token d'authentification envoyé par le navigateur
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // 2. Vérifier que le token est valide et récupérer l'utilisateur
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // 3. Supprimer les données du profil (table "profiles")
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (profileError) {
      console.error('Erreur suppression profil:', profileError)
      // On continue quand même pour supprimer le compte auth
    }

    // 4. Supprimer les contacts liés à cet utilisateur
    const { error: contactsError } = await supabaseAdmin
      .from('contacts')
      .delete()
      .eq('user_id', user.id)

    if (contactsError) {
      console.error('Erreur suppression contacts:', contactsError)
    }

    // 5. Enfin, supprimer le compte d'authentification
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du compte' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur inattendue:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
