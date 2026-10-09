// Transport fictif pour le vrai endpoint, les vraies validations et le vrai prompt fournisseur.
import { harness } from './ui-harness.mjs'
export const ETOILES_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Authorization' }
export const A = '10000000-0000-4000-8000-000000000001', B = '10000000-0000-4000-8000-000000000002'
export const idea = { idee: 'Livre', raison: 'Lecture', categorie: 'loisir', recherche: 'livre', emoji: '📖' }
export function giftRoute({ responseText, providerResponse, gate = { ok: true }, social, client, quota } = {}) {
  const sent = [], reads = [], counts = []
  const fallbackClient = { from: () => { throw new Error('Lecture privée inattendue') } }
  const h = harness('lib/cadeaux-server.ts', { overrides: {
    'server-only': {}, '@/lib/supabase-admin': { supabaseAdmin: client ?? fallbackClient },
    '@/lib/garde-ia': { consommerQuotaIA: async owner => { counts.push(owner); return quota ? quota(owner) : gate } },
    '@/lib/etoiles-server': { ETOILES_HEADERS, socialTransport: token => { reads.push(['token', token]); return social ?? { verify: async () => ({ id: A, email_confirmed_at: '2026-10-01' }), rpc: async () => { throw new Error('RPC sociale inattendue') } } } },
  }, globals: { Request, Response, URL, AbortSignal, TextEncoder, AbortController,
    fetch: async (url, init) => { sent.push({ url, ...init }); return providerResponse ?? Response.json({ choices: [{ message: { content: responseText ?? JSON.stringify([idea]) } }] }) },
  } })
  const endpoint = h.component.cadeauxEndpoint
  // Les anciens tests de format n'avaient pas de header ; cette session reste fictive.
  const POST = async request => { const headers = new Headers(request.headers); headers.set('authorization', 'Bearer simulation'); const response = await endpoint(new Request(request, { headers })); return { status: response.status, body: await response.json() } }
  return { POST, endpoint, sent, reads, counts, prompt: h.component.promptCadeaux }
}
