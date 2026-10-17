// Catalogue corrigé confirmé ; ouverture locale pour la recette des comptes pilotes.
import { isCalendarDay } from './calendar-day'

export const CELEBRATIONS_ENABLED = process.env.NODE_ENV === 'development' // Production fermée jusqu’au GO après recette réelle.
export const CELEBRATION_ACTIONS = {
  creer: ['id', 'titre', 'date', 'heure', 'lieu', 'mode', 'surprise', 'destinataire'],
  publier: ['id', 'titre', 'date', 'heure', 'lieu', 'mode', 'surprise', 'destinataire', 'preparation', 'taches', 'apercuSource', 'confirmer'],
  modifier: ['id', 'revision', 'titre', 'date', 'heure', 'lieu', 'mode', 'surprise', 'destinataire', 'revoirAcces'],
  inviter: ['id', 'invitation', 'cible'],
  accepter: ['id', 'invitation'], refuser: ['id', 'invitation'], revoquer: ['id', 'invitation'],
  quitter: ['id', 'cloturer'], retirer: ['id', 'participation'],
  proposer_transfert: ['id', 'transfert', 'cible'], accepter_transfert: ['id', 'transfert'], refuser_transfert: ['id', 'transfert'],
  ajouter_tache: ['id', 'tache', 'titre', 'type', 'responsable', 'echeance'],
  modifier_tache: ['id', 'tache', 'revision', 'titre', 'responsable', 'echeance', 'etat'],
  commenter: ['id', 'commentaire', 'texte'], modifier_commentaire: ['id', 'commentaire', 'revision', 'texte'], retirer_commentaire: ['id', 'commentaire'],
  annuler: ['id', 'revision', 'confirmer'], archiver: ['id', 'revision'],
  supprimer: ['id', 'revision', 'confirmer'], demander_suppression: ['id', 'demande', 'motif'],
  traiter_suppression: ['id', 'demande', 'revision', 'accepter', 'confirmer'],
} as const
export type CelebrationAction = keyof typeof CELEBRATION_ACTIONS
export type CelebrationCommand = { action: CelebrationAction; operation: string; donnees: Record<string, unknown> }
export type CelebrationState = 'active' | 'annulee' | 'archivee' | 'supprimee' | 'suspendue'
export type CelebrationSummary = { id: string; titre: string; date: string | null; dateCanonique: string | null; heure: string | null; lieu: string | null; mode: 'seul' | 'partage'; surprise: boolean; destinataire: string | null; etat: CelebrationState; revision: number; role: 'organisateur' | 'participant'; maintenance: boolean }
export type CelebrationParticipant = { id: string; compte: string | null; identite: string; role: 'organisateur' | 'participant'; etat: 'active' | 'partie' | 'maintenance' }
export type CelebrationTask = { id: string; titre: string; type: string; responsable: string | null; echeance: string | null; etat: 'a_faire' | 'faite' | 'abandonnee'; revision: number; auteur: string | null }
export type CelebrationComment = { id: string; texte: string; auteur: string | null; revision: number; identite: string }
export type CelebrationInvitation = { id: string; type: 'invitation' | 'transfert' | 'suppression'; celebration: string; titre: string; date: string | null; emetteur: string; expiration: string; demande: { id: string; etat: string; revision: number } | null }
export type CelebrationDetail = { celebration: CelebrationSummary; participants: CelebrationParticipant[]; taches: CelebrationTask[]; commentaires: CelebrationComment[]; invitations: { id: string; cible: string; identite: string; expiration: string }[]; transferts: { id: string; cible: string; initiateur: string; expiration: string }[]; demandes: { id: string; demandeur: string; motif: string | null; etat: string; revision: number }[]; actions: { id: string; action: string; date: string }[]; notifications: { id: string; type: string; date: string }[] }
export type CelebrationResult = { ok: true; id: string }

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Objet invalide.')
  return value as Record<string, unknown>
}
function keys(value: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(value).length !== allowed.length || Object.keys(value).some(key => !allowed.includes(key))) throw new Error('Champs invalides.')
}
export function celebrationUuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error('Identifiant invalide.')
  return value.toLowerCase()
}
export function celebrationCommand(value: unknown): CelebrationCommand {
  const body = object(value); keys(body, ['action', 'operation', 'donnees'])
  if (typeof body.action !== 'string' || !Object.hasOwn(CELEBRATION_ACTIONS, body.action)) throw new Error('Action inconnue.')
  const action = body.action as CelebrationAction, data = object(body.donnees)
  keys(data, CELEBRATION_ACTIONS[action])
  if (new TextEncoder().encode(JSON.stringify(data)).length > 16384) throw new Error('Commande trop longue.')
  for (const [key, entry] of Object.entries(data)) {
    if (['id', 'invitation', 'cible', 'participation', 'transfert', 'tache', 'commentaire', 'demande', 'preparation'].includes(key)) celebrationUuid(entry)
    if (['destinataire', 'responsable'].includes(key) && entry !== null) celebrationUuid(entry)
    if (key === 'revision' && (!Number.isSafeInteger(entry) || (entry as number) < 1)) throw new Error('Révision invalide.')
    if (['confirmer', 'cloturer', 'surprise', 'revoirAcces', 'accepter'].includes(key) && typeof entry !== 'boolean') throw new Error('Confirmation invalide.')
    if (['date', 'echeance'].includes(key) && entry !== null && (typeof entry !== 'string' || !isCalendarDay(entry))) throw new Error('Date invalide.')
    if (key === 'heure' && entry !== null && (typeof entry !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(entry))) throw new Error('Heure invalide.')
    if(typeof entry==='string'&&entry.includes('\u0000'))throw new Error('Caractère invalide.')
    if (key === 'titre' && (typeof entry !== 'string' || !entry.trim() || entry !== entry.trim() || [...entry].length > 200)) throw new Error('Titre requis, limité à 200 caractères.')
    if (key === 'texte' && (typeof entry !== 'string' || !entry.trim() || [...entry].length > 2000)) throw new Error('Commentaire requis, limité à 2 000 caractères.')
    if (['lieu', 'motif'].includes(key) && entry !== null && (typeof entry !== 'string' || [...entry].length > 500)) throw new Error('Texte limité à 500 caractères.')
    if (key === 'mode' && entry !== 'seul' && entry !== 'partage') throw new Error('Organisation invalide.')
    if (key === 'etat' && (typeof entry!=='string'||!['a_faire', 'faite', 'abandonnee'].includes(entry))) throw new Error('Progression invalide.')
    if (key === 'type' && (typeof entry!=='string'||!['cadeau', 'message', 'gateau', 'repas', 'boissons', 'decoration', 'appel', 'sortie', 'libre'].includes(entry))) throw new Error('Type de tâche invalide.')
    if (key === 'taches') {
      if (!Array.isArray(entry) || entry.length > 30 || new Set(entry).size !== entry.length) throw new Error('Sélection de tâches invalide.')
      entry.forEach(celebrationUuid)
    }
  }
  if (data.surprise && data.mode === 'partage' && data.destinataire === null) throw new Error('Un destinataire identifié est requis avant de partager une surprise.')
  if (action === 'publier') {
    if (data.confirmer !== true) throw new Error('Confirme la publication après son aperçu.')
    const snapshot = object(data.apercuSource); keys(snapshot, ['date', 'taches'])
    if (typeof snapshot.date !== 'string' || !isCalendarDay(snapshot.date) || !Array.isArray(snapshot.taches) || snapshot.taches.length !== (data.taches as unknown[]).length) throw new Error('Aperçu de source invalide.')
    const selected = (data.taches as string[]).map(celebrationUuid).sort()
    snapshot.taches.forEach((value, index) => {
      const task = object(value); keys(task, ['id', 'titre', 'type'])
      if (celebrationUuid(task.id) !== selected[index] || typeof task.titre !== 'string' || !task.titre.trim() || [...task.titre].length > 200 || task.titre.includes('\u0000') || typeof task.type !== 'string' || !['cadeau','message','gateau','repas','boissons','decoration','appel','sortie','libre'].includes(task.type)) throw new Error('Aperçu de tâche invalide.')
    })
  }
  return { action, operation: celebrationUuid(body.operation), donnees: data }
}
export function celebrationResult(value: unknown): CelebrationResult {
  const result = object(value); keys(result, ['ok', 'id'])
  if (result.ok !== true) throw new Error('Résultat invalide.')
  return { ok: true, id: celebrationUuid(result.id) }
}
export function celebrationItems<T>(value: unknown, parse: (entry: unknown) => T): T[] {
  const body = object(value); keys(body, ['items'])
  if (!Array.isArray(body.items) || body.items.length > 100) throw new Error('Liste invalide.')
  return body.items.map(parse)
}
export function celebrationSummary(value: unknown): CelebrationSummary {
  const row = object(value)
  keys(row, ['id', 'titre', 'date', 'dateCanonique', 'heure', 'lieu', 'mode', 'surprise', 'destinataire', 'etat', 'revision', 'role', 'maintenance'])
  if(row.destinataire!==null)celebrationUuid(row.destinataire)
  celebrationUuid(row.id)
  if (typeof row.titre !== 'string' || [...row.titre].length > 200 || !Number.isSafeInteger(row.revision) || (row.revision as number) < 1 || typeof row.surprise !== 'boolean' || typeof row.maintenance !== 'boolean' || typeof row.role!=='string'||!['organisateur','participant'].includes(row.role) || typeof row.mode!=='string'||!['seul','partage'].includes(row.mode) || typeof row.etat!=='string'||!['active','annulee','archivee','supprimee','suspendue'].includes(row.etat)) throw new Error('Célébration invalide.')
  for (const key of ['date', 'dateCanonique']) if (row[key] !== null && (typeof row[key] !== 'string' || !isCalendarDay(row[key] as string))) throw new Error('Date invalide.')
  for (const key of ['lieu', 'heure']) if (row[key] !== null && typeof row[key] !== 'string') throw new Error('Présentation invalide.')
  return row as CelebrationSummary
}
export function celebrationDetail(value: unknown): CelebrationDetail {
  const row = object(value); keys(row, ['celebration','participants','taches','commentaires','invitations','transferts','demandes','actions','notifications'])
  celebrationSummary(row.celebration)
  const shape: Record<string, string[]> = {
    participants: ['id','compte','identite','role','etat'], taches: ['id','titre','type','responsable','echeance','etat','revision','auteur'],
    commentaires: ['id','texte','auteur','revision','identite'], invitations: ['id','cible','identite','expiration'], transferts: ['id','cible','initiateur','expiration'],
    demandes: ['id','demandeur','motif','etat','revision'], actions: ['id','action','date'], notifications: ['id','type','date'],
  }
  for (const [name, fields] of Object.entries(shape)) {
    if (!Array.isArray(row[name]) || (row[name] as unknown[]).length > 100) throw new Error('Détail invalide.')
    for (const item of row[name] as unknown[]) {
      const entry = object(item); keys(entry, fields); celebrationUuid(entry.id)
      for (const key of ['compte','cible','initiateur','responsable','demandeur','auteur']) if (Object.hasOwn(entry, key) && entry[key] !== null) celebrationUuid(entry[key])
      if (Object.hasOwn(entry, 'revision') && (!Number.isSafeInteger(entry.revision) || (entry.revision as number) < 1)) throw new Error('Révision invalide.')
      for (const key of ['titre','texte','identite','action','type','etat']) if (Object.hasOwn(entry, key) && (typeof entry[key] !== 'string' || [...entry[key] as string].length > 2000)) throw new Error('Détail invalide.')
      if (Object.hasOwn(entry, 'motif') && entry.motif !== null && (typeof entry.motif !== 'string' || [...entry.motif].length > 500)) throw new Error('Motif invalide.')
      for (const key of ['expiration','date']) if (Object.hasOwn(entry, key) && (typeof entry[key] !== 'string' || !Number.isFinite(Date.parse(entry[key] as string)))) throw new Error('Date invalide.')
      if (Object.hasOwn(entry, 'echeance') && entry.echeance !== null && (typeof entry.echeance !== 'string' || !isCalendarDay(entry.echeance))) throw new Error('Échéance invalide.')
    }
  }
  return row as unknown as CelebrationDetail
}
export function celebrationInvitation(value: unknown): CelebrationInvitation {
  const row = object(value); keys(row, ['id','type','celebration','titre','date','emetteur','expiration','demande'])
  celebrationUuid(row.id); celebrationUuid(row.celebration)
  if (typeof row.titre !== 'string' || typeof row.emetteur !== 'string' || typeof row.expiration !== 'string' || !Number.isFinite(Date.parse(row.expiration))) throw new Error('Invitation invalide.')
  if (row.date !== null && (typeof row.date !== 'string' || !isCalendarDay(row.date))) throw new Error('Date invalide.')
  if (!['invitation','transfert','suppression'].includes(String(row.type))) throw new Error('Invitation invalide.')
  if (row.demande !== null) {
    const demand = object(row.demande); keys(demand, ['id','etat','revision']); celebrationUuid(demand.id)
    if (!['attente','acceptee','refusee','fermee'].includes(String(demand.etat)) || !Number.isSafeInteger(demand.revision) || (demand.revision as number) < 1) throw new Error('Demande invalide.')
  }
  return row as CelebrationInvitation
}
