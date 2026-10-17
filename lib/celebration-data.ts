import { socialRequest } from './etoiles-data'
import { celebrationCommand, celebrationResult, celebrationDetail, celebrationItems, celebrationSummary, celebrationInvitation, type CelebrationCommand, type CelebrationDetail } from './celebration-contract'

export const celebrationService = {
  lire: async (owner: string, id: string, signal?: AbortSignal) => celebrationDetail(await socialRequest(owner, '/api/celebrations/detail?id=' + encodeURIComponent(id), undefined, signal, 2*1024*1024)),
  liste: async (owner: string, after: string | null, signal?: AbortSignal) => celebrationItems(await socialRequest(owner, '/api/celebrations?limite=100' + (after ? '&apres=' + after : ''), undefined, signal, 2*1024*1024), celebrationSummary),
  invitations: async (owner: string, after: string | null, signal?: AbortSignal) => celebrationItems(await socialRequest(owner, '/api/celebrations/invitations?limite=100' + (after ? '&apres=' + after : ''), undefined, signal, 2*1024*1024), celebrationInvitation),
  commander: async (owner: string, input: CelebrationCommand, signal?: AbortSignal) => celebrationResult(await socialRequest(owner, '/api/celebrations', celebrationCommand(input), signal, 2*1024*1024)),
}
export type CelebrationService = typeof celebrationService
// Reconstruire depuis la dernière lecture autorisée ; aucun objet tiers conservé.
export function ownCelebrationProjection(value:CelebrationDetail,owner:string):CelebrationDetail {
  const row=celebrationDetail(value),c=row.celebration
  const me=row.participants.find(p=>p.compte===owner&&p.etat==='active')
  if(!me||c.maintenance||c.etat==='supprimee'||c.etat==='suspendue'||c.surprise&&c.destinataire===owner)throw new Error('L’accès à une célébration a changé. Relance l’export.')
  return celebrationDetail({celebration:{...c},participants:[{...me}],
    taches:row.taches.filter(t=>t.auteur===owner&&(c.destinataire!==owner||!['cadeau','message'].includes(t.type))).map(t=>({...t,responsable:t.responsable===me.id?me.id:null})),
    commentaires:row.commentaires.filter(t=>t.auteur===owner).map(t=>({...t})),
    demandes:row.demandes.filter(t=>t.demandeur===owner).map(t=>({...t})),
    invitations:[],transferts:[],actions:[],notifications:row.notifications.map(n=>({...n}))})
}
export async function exportCelebrations(owner: string) {
  const items:CelebrationDetail[] = [], seen = new Set<string>(); let after: string | null = null
  do {
    const rows:CelebrationDetail[] = celebrationItems(await socialRequest(owner, '/api/celebrations/export?limite=1' + (after ? '&apres=' + after : ''), undefined, undefined, 2*1024*1024), celebrationDetail)
    for (const row of rows) { if (seen.has(row.celebration.id)) throw new Error('Export incohérent.'); seen.add(row.celebration.id); items.push(row) }
    if (items.length > 100000) throw new Error('Export trop volumineux.')
    after = rows.length === 1 ? rows.at(-1)!.celebration.id : null
  } while (after)
  // Une révocation durant la pagination invalide l'ensemble avant téléchargement.
  const current:CelebrationDetail[]=[]
  for(const item of items){
    const fresh=await celebrationService.lire(owner,item.celebration.id)
    if(fresh.celebration.id!==item.celebration.id)throw new Error('Export incohérent.')
    current.push(ownCelebrationProjection(fresh,owner))
  }
  return current
}
