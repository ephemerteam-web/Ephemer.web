import { celebrationUuid } from './celebration-contract'
import { isCardTemplate, type CardTemplateId } from './cards'
import { closedCollectiveObject, collectiveCardSnapshot, collectiveSignature, collectiveText, type CollectiveCardSnapshot, type CollectiveSignature } from './collective-card'
import { collectiveEmail, type CollectiveCommand } from './collective-card-workflow'
import { COLLECTIVE_EMAIL_LABELS } from './collective-card-delivery'

export type CollectiveCreate = { operation: string; revision: 0; data: { action: 'creer'; id: string; title: string; templateId: CardTemplateId; recipientEmail: string } }
export type CollectiveCardView = {
  id: string; revision: number; title: string; templateId: CardTemplateId; phase: 'ouverte' | 'fermee'; validated: boolean
  isOrganizer: boolean; mine: CollectiveSignature | null; invited: boolean; responsible: string; responsibleParticipation: string | null; nextAction: string
  members: { participation: string; account: string; name: string; invited: boolean; signed: boolean; organizer: boolean }[]
  contributions: { author: string; name: string; own: boolean; hidden: boolean; content: CollectiveSignature }[]
  published: { version: string; content: CollectiveCardSnapshot; expiresAt: string } | null
  publicationState: string; emailState: keyof typeof COLLECTIVE_EMAIL_LABELS; reports: { author: string; target: string }[]
}
export type CollectiveRead = { absente: true } | CollectiveCardView
const bool = (v: unknown): boolean => { if (typeof v !== 'boolean') throw new Error('État collectif invalide.'); return v }
export function collectiveCreation(value: unknown): CollectiveCreate {
  const root = closedCollectiveObject(value, ['operation', 'revision', 'data']), d = closedCollectiveObject(root.data, ['action', 'id', 'title', 'templateId', 'recipientEmail'])
  if (root.revision !== 0 || d.action !== 'creer' || !isCardTemplate(d.templateId)) throw new Error('Création invalide.')
  return { operation: celebrationUuid(root.operation), revision: 0, data: { action: 'creer', id: celebrationUuid(d.id), title: collectiveText(d.title, 200, true), templateId: d.templateId, recipientEmail: collectiveEmail(d.recipientEmail) } }
}
export function collectiveView(value: unknown): CollectiveRead {
  if (value && typeof value === 'object' && 'absente' in value) { const row = closedCollectiveObject(value, ['absente']); if (row.absente === true) return { absente: true }; throw new Error('État collectif invalide.') }
  const row = closedCollectiveObject(value, ['id', 'revision', 'title', 'templateId', 'phase', 'validated', 'isOrganizer', 'mine', 'invited', 'responsible', 'responsibleParticipation', 'nextAction', 'members', 'contributions', 'published', 'publicationState', 'emailState', 'reports'])
  if (!Number.isSafeInteger(row.revision) || Number(row.revision) < 1 || !isCardTemplate(row.templateId) || !['ouverte', 'fermee'].includes(String(row.phase)) || !Object.hasOwn(COLLECTIVE_EMAIL_LABELS, String(row.emailState))) throw new Error('État collectif invalide.')
  const rows = (v: unknown, limit = 30): unknown[] => { if (!Array.isArray(v) || v.length > limit) throw new Error('Liste collective invalide.'); return v }
  let published: CollectiveCardView['published'] = null
  if (row.published !== null) {
    const p = closedCollectiveObject(row.published, ['version', 'content', 'expiresAt'])
    if (typeof p.expiresAt !== 'string' || !Number.isFinite(Date.parse(p.expiresAt))) throw new Error('Expiration invalide.')
    published = { version: celebrationUuid(p.version), content: collectiveCardSnapshot(p.content), expiresAt: p.expiresAt }
  }
  return {
    id: celebrationUuid(row.id), revision: Number(row.revision), title: collectiveText(row.title, 200, true), templateId: row.templateId, phase: row.phase as CollectiveCardView['phase'], validated: bool(row.validated), isOrganizer: bool(row.isOrganizer), mine: row.mine === null ? null : collectiveSignature(row.mine), invited: bool(row.invited), responsible: collectiveText(row.responsible, 500), responsibleParticipation: row.responsibleParticipation === null ? null : celebrationUuid(row.responsibleParticipation), nextAction: collectiveText(row.nextAction, 500),
    members: rows(row.members).map(value => { const r = closedCollectiveObject(value, ['participation', 'account', 'name', 'invited', 'signed', 'organizer']); return { participation: celebrationUuid(r.participation), account: celebrationUuid(r.account), name: collectiveText(r.name, 500), invited: bool(r.invited), signed: bool(r.signed), organizer: bool(r.organizer) } }),
    contributions: rows(row.contributions).map(value => { const r = closedCollectiveObject(value, ['author', 'name', 'own', 'hidden', 'content']); return { author: celebrationUuid(r.author), name: collectiveText(r.name, 500), own: bool(r.own), hidden: bool(r.hidden), content: collectiveSignature(r.content) } }),
    published, publicationState: collectiveText(row.publicationState, 100), emailState: row.emailState as CollectiveCardView['emailState'], reports: rows(row.reports, 900).map(value => { const r = closedCollectiveObject(value, ['author', 'target']); return { author: celebrationUuid(r.author), target: celebrationUuid(r.target) } }),
  }
}
export type CollectiveMutation = CollectiveCreate | CollectiveCommand
export function ownCollectiveExport(value: unknown) {
  const r = closedCollectiveObject(value, ['id', 'title', 'contributions'])
  if (!Array.isArray(r.contributions) || r.contributions.length > 1) throw new Error('Export collectif invalide.')
  return { id: celebrationUuid(r.id), title: collectiveText(r.title, 200, true), contributions: r.contributions.map(collectiveSignature) }
}
