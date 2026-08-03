import { createClient } from '@supabase/supabase-js'
import FormulaireInvitation from './FormulaireInvitation'
import LienInvalide from './LienInvalide'

// Pas de mise en cache : on veut toujours l'état réel du lien
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Une invitation pour toi — Ephemer',
  description: 'Quelques secondes pour ne jamais être oublié.',
}

export default async function PageInvitation({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Client public (clé "anon") : suffisant, la fonction SQL fait les contrôles
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .rpc('verifier_invitation', { p_token: token })
    .single()

  const info = data as {
    valide: boolean
    raison: string
    prenom_hote: string | null
    places_restantes: number
  } | null

  if (error || !info || !info.valide) {
    return <LienInvalide raison={info?.raison ?? 'introuvable'} />
  }

  return (
    <FormulaireInvitation
      token={token}
      prenomHote={info.prenom_hote ?? 'Un proche'}
    />
  )
}