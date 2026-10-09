// 🔐 Contrats distincts propriétaire/étoile ; client et JWT propres à la requête.
import 'server-only'
import { ETOILES_HEADERS, socialTransport, type EtoilesTransport } from './etoiles-server'
import { limitedJSON } from './ai-transport'
import { uuidEtoile } from './etoiles-contract'
import { resultatUnivers, universPartage, UNIVERS_LIMITES } from './univers-contract'
import { commandeUniversCadeaux as commandeUnivers, monUniversCadeaux as monUnivers, universPourCadeaux } from './cadeaux-social-contract'

class UniversHTTPError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}
export async function universEndpoint(request: Request, mode: 'proprietaire' | 'commande' | 'etoile' | 'cadeaux', factory: (token: string) => EtoilesTransport = socialTransport): Promise<Response> {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: ETOILES_HEADERS })
  try {
    if (request.method !== (mode === 'commande' ? 'POST' : 'GET')) throw new UniversHTTPError(405, 'Méthode refusée.')
    const url = new URL(request.url), origin = request.headers.get('origin')
    if (origin && origin !== url.origin) throw new UniversHTTPError(403, 'Origine refusée.')
    const header = request.headers.get('authorization')
    if (!header || !/^Bearer [^\s]+$/.test(header) || header.length > 16384) throw new UniversHTTPError(401, 'Reconnecte-toi pour accéder aux univers.')
    const api = factory(header.slice(7)), user = await api.verify()
    if (!user) throw new UniversHTTPError(401, 'Reconnecte-toi pour accéder aux univers.')
    if (!user.email_confirmed_at || user.is_anonymous) throw new UniversHTTPError(403, 'Une adresse de connexion vérifiée est nécessaire.')
    const params = url.searchParams
    if ([...params.keys()].some(key => !['etoile', 'cadeaux'].includes(mode) || key !== 'etoileId' || params.getAll(key).length !== 1)) throw new UniversHTTPError(400, 'Paramètres invalides.')
    if (mode === 'proprietaire') return reply(monUnivers(await api.rpc('lire_mon_univers', {})))
    if (mode === 'etoile' || mode === 'cadeaux') {
      let etoileId: string
      try { etoileId = uuidEtoile(params.get('etoileId')) } catch { throw new UniversHTTPError(400, 'Étoile invalide.') }
      if (etoileId === user.id) throw new UniversHTTPError(403, 'Univers indisponible.')
      return reply(mode === 'cadeaux' ? universPourCadeaux(await api.rpc('consulter_univers_cadeaux', { p_etoile: etoileId })) : universPartage(await api.rpc('consulter_univers_etoile', { p_etoile: etoileId })))
    }
    let command
    try { command = commandeUnivers(await limitedJSON(request, UNIVERS_LIMITES.corps, 400)) }
    catch (error) { throw new UniversHTTPError((error as { status?: number }).status === 413 ? 413 : 400, 'Commande univers invalide.') }
    return reply(resultatUnivers(await api.rpc('commander_mon_univers', { p_action: command.action, p_donnees: command.donnees, p_revision: command.revision, p_operation: command.operation })))
  } catch (error) {
    const status = error instanceof UniversHTTPError ? error.status : (error as { status?: number })?.status
    const safeStatus = [400, 401, 403, 405, 409, 413, 503].includes(status ?? 0) ? status! : 503
    const message = error instanceof UniversHTTPError ? error.message : safeStatus === 409 ? 'Ton univers a changé. Relis avant de continuer.' : safeStatus === 403 ? 'Univers indisponible.' : safeStatus === 400 ? 'Requête invalide.' : 'Service momentanément indisponible. Réessaie.'
    return reply({ error: message }, safeStatus)
  }
}
