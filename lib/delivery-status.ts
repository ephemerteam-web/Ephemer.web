// Le statut historique « envoye » constate au mieux une acceptation par le prestataire.
// Ne jamais déduire livré/refusé/expiré d'une simple date ou d'une erreur réseau.
export function deliveryStatus(status: string, delivery?: string, processing?: string): string {
  const delivered: Record<string, string> = { delivered: 'Livré au serveur destinataire', bounced: 'Refusé par le serveur destinataire', complained: 'Signalé comme indésirable', failed: 'Échec signalé par Resend', suppressed: 'Envoi bloqué par Resend', delayed: 'Livraison retardée' }
  if (delivery && delivered[delivery]) return delivered[delivery]
  if (processing === 'sending') return 'Envoi en traitement'
  if (processing === 'review' || processing === 'uncertain') return 'Envoi incertain — à vérifier'
  if (processing === 'failed') return 'Refusé par Resend — à vérifier'
  return ({ programme: 'Programmé', envoye: 'Acceptation Resend déclarée — livraison non confirmée', annule: 'Annulé' } as Record<string, string>)[status] ?? 'État inconnu — à vérifier'
}
export const deliveryLimit = 'Les messages programmés sont indépendants des préférences d’alertes personnelles. Une reprise est possible jusqu’au lendemain de la date prévue. Au-delà, ils restent enregistrés et sont affichés comme suspendus, à reprogrammer. « Acceptation Resend » ne confirme pas la livraison. Le statut de livraison dépend des retours signés du prestataire ; les anciens envois sans journal restent non confirmés.'
