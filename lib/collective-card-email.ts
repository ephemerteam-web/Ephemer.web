// Template indépendant des rappels historiques. Aucun nom ni message personnel dans l'email.
import { isCardSecret } from './card-link-crypto'
import { collectiveEmail } from './collective-card-workflow'
import type { CollectiveEmailPayload } from './collective-card-delivery'

export function collectiveEmailPayload(address: string, secret: string): CollectiveEmailPayload {
  if (!isCardSecret(secret)) throw new Error('Lien de carte invalide.')
  const url = 'https://ephemer.name/carte#' + secret
  return {
    from: 'Ephemer <noreply@ephemer.name>', to: collectiveEmail(address), subject: 'Une carte collective pour toi · Ephemer',
    html: `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Une carte collective pour toi</title></head><body style="font-family:Arial,sans-serif;background:#14233e;color:#faf0d8;padding:24px"><main><h1>Une carte pour toi</h1><p>Tes proches ont préparé une carte collective.</p><p><a href="${url}" style="color:#e5c57d">Ouvrir la carte</a></p><p>Ce lien donne uniquement accès à la carte publiée. Toute personne à qui tu le transfères pourra la consulter tant qu’il reste valide.</p><p>Ephemer · Une attention préparée par tes proches.</p></main></body></html>`,
    text: `Tes proches ont préparé une carte collective.\nOuvrir la carte : ${url}\nCe lien est transférable et peut être révoqué par les organisateurs.`,
  }
}
