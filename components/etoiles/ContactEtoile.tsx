'use client'
import Link from 'next/link'
import { useEtoiles } from './EtoilesContext'
import EtoileAction from './EtoileAction'
import UniversPartagePanel from '@/components/univers/UniversPartagePanel'

// L’association concerne uniquement la fiche privée de ce compte.
export default function ContactEtoile({ contactId, email }: { contactId: string; email: string | null }) {
  const social = useEtoiles()
  const association = !social.error && social.associations.find(link => link.contact_id === contactId && social.actives.some(star => star.id === link.relation_id && star.etoile_id === link.etoile_id))
  const linked = !!association
  return <div className="space-y-2 rounded-xl border border-line p-3">
    {linked && association ? <><Link className="text-accent" href="/dashboard/etoiles">✦ Étoile · gérer la relation</Link><UniversPartagePanel etoileId={association.etoile_id} contactId={contactId} initialOpen /></> : <>
      <EtoileAction action="demander_contact" donnees={{ contactId }} disabled={!email || !!social.error || !Number.isSafeInteger(Number(contactId))}>Proposer de devenir une étoile</EtoileAction>
      <p className="text-xs text-muted">{email ? 'Une demande privée, à accepter dans Ephemer. Ta fiche reste personnelle.' : 'Renseigne une adresse email pour proposer une relation, ou partage un lien depuis Mes étoiles.'}</p>
    </>}
  </div>
}
