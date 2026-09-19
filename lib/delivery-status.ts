// Le statut historique « envoye » constate au mieux une acceptation par le prestataire.
// Ne jamais déduire livré/refusé/expiré d'une simple date ou d'une erreur réseau.
export function deliveryStatus(status: string): string {
  return ({ programme: 'Programmé', envoye: 'Acceptation Resend déclarée — livraison non confirmée', annule: 'Annulé' } as Record<string, string>)[status] ?? 'État inconnu — à vérifier'
}
export const deliveryLimit = 'Le suivi actuel ne mesure pas « en traitement », « livré », « refusé » ou « expiré ». Ces états nécessitent un journal serveur et des retours de livraison Resend. Les anciens envois ne sont pas vérifiables auprès du prestataire depuis cet écran. Un rappel en retard reste programmé ; il n’est pas déclaré expiré.'
