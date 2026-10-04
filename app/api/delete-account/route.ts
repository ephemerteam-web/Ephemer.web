// 🔐 Suppression du compte, côté serveur uniquement.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function DELETE(request: Request) {
  // Un appel peut échouer après avoir été exécuté : ne jamais promettre un retour arrière.
  let nettoyageCommence = false

  try {
    // 1. Seul l'utilisateur identifié par Supabase peut supprimer son propre compte.
    const token = request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // 2. Ces deux tables n'ont pas de cascade vers Auth dans le schéma actuel.
    // Garder le profil jusqu'à ce que les contacts soient supprimés.
    // En cas d'erreur, arrêter ici pour conserver le compte et permettre une nouvelle tentative.
    nettoyageCommence = true
    const { error: contactsError } = await supabaseAdmin
      .from('contacts')
      .delete()
      .eq('user_id', user.id)

    if (contactsError) {
      console.error('Erreur suppression contacts:', contactsError.code)
      return NextResponse.json(
        { error: 'Impossible de confirmer la suppression de tes contacts. Ton compte n’a pas été supprimé. Réessaie.' },
        { status: 500 }
      )
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (profileError) {
      console.error('Erreur suppression profil:', profileError.code)
      return NextResponse.json(
        { error: 'La suppression est incomplète : tes contacts ont été supprimés, mais la suppression du profil n’a pas pu être confirmée. Ton compte reste actif. Réessaie pour terminer.' },
        { status: 500 }
      )
    }

    // 3. Auth n'est supprimé qu'après les deux nettoyages réussis.
    // Les autres tables liées à Auth sont nettoyées par leurs cascades existantes.
    // Ces appels séparés ne forment pas une transaction : un échec Auth doit être annoncé.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error('Erreur suppression Auth:', deleteError.code)
      return NextResponse.json(
        { error: 'Ton profil et tes contacts ont été supprimés, mais la suppression du compte n’a pas pu être confirmée. Réessaie pour terminer.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    console.error('Erreur inattendue lors de la suppression du compte')
    return NextResponse.json(
      { error: nettoyageCommence
        ? 'La suppression n’a pas pu être confirmée. Certaines données peuvent déjà avoir été supprimées. Réessaie pour terminer.'
        : 'Impossible de vérifier ta session. Réessaie.' },
      { status: 500 }
    )
  }
}
