// Référence métier pure et simulable. Ne remplace ni les transactions SQL ni les droits distants.
import { celebrationUuid } from './celebration-contract'
import { closedCollectiveObject, collectiveCardSnapshot, collectiveSignature, collectiveText, type CollectiveCardSnapshot, type CollectiveSignature } from './collective-card'
import { validateCivilSchedule, collectiveDue, type CivilSchedule } from './collective-card-schedule'
import { isCardTemplate, CARD_EXPIRY_DAYS, type CardTemplateId } from './cards'

export type CollectiveMember = { participation: string; account: string; generation: number; role: 'organisateur' | 'participant' }
export type CollectiveActor = { account: string; verifiedEmail: string; verified: boolean }
export type CollectiveEnvironment = { now: number; members: CollectiveMember[]; celebrationState: 'active' | 'annulee' | 'archivee' | 'supprimee' | 'suspendue'; recipientAccount: string | null; digest: (content: string) => string }
export type CollectiveContribution = { author: string; participation: string; generation: number; content: CollectiveSignature; hidden: boolean }
export type CollectivePlan = { id: string; publication: CivilSchedule | null; email: CivilSchedule | null; address: string | null; fingerprint: string; publicationState: 'programme' | 'publie' | 'annule' | 'a_reprogrammer'; emailState: 'absent' | 'programme' | 'pris_en_charge' | 'accepte' | 'livre' | 'echec' | 'annule' | 'incertain' | 'a_reprogrammer' }
export type CollectiveState = {
  id: string; revision: number; title: string; template: CardTemplateId; responsible: string; recipientEmail: string
  excludedAccounts: string[]; phase: 'ouverte' | 'fermee'; invited: string[]; contributions: CollectiveContribution[]
  validation: { fingerprint: string; snapshot: CollectiveCardSnapshot } | null
  versions: { id: string; content: CollectiveCardSnapshot; authors: string[]; revoked: boolean; expiresAt: string }[]
  plan: CollectivePlan | null; reports: { author: string; target: string; at: number }[]
  operations: { actor: string; id: string; fingerprint: string; at: number; action: string }[]
}
export type CollectiveAction =
  | { action: 'inviter'; participation: string }
  | { action: 'confirmer'; content: CollectiveSignature; consent: true }
  | { action: 'masquer' | 'retablir' | 'retirer' | 'signaler'; author: string }
  | { action: 'fermer'; confirmMissing: boolean }
  | { action: 'rouvrir' | 'valider' | 'revoquer' | 'annuler_programmation' }
  | { action: 'publier'; version: string; expiryDays: number }
  | { action: 'responsable'; participation: string }
  | { action: 'programmer'; id: string; publication: CivilSchedule | null; email: CivilSchedule | null; address: string | null; consent: true }
export type CollectiveCommand = { operation: string; revision: number; data: CollectiveAction }
const actionFields = {
  inviter: ['action', 'participation'], confirmer: ['action', 'content', 'consent'], masquer: ['action', 'author'], retablir: ['action', 'author'], retirer: ['action', 'author'], signaler: ['action', 'author'],
  fermer: ['action', 'confirmMissing'], rouvrir: ['action'], valider: ['action'], revoquer: ['action'], annuler_programmation: ['action'], publier: ['action', 'version', 'expiryDays'], responsable: ['action', 'participation'], programmer: ['action', 'id', 'publication', 'email', 'address', 'consent'],
} as const
export function collectiveCommand(value: unknown): CollectiveCommand {
  const root = closedCollectiveObject(value, ['operation', 'revision', 'data'])
  if (!Number.isSafeInteger(root.revision) || (root.revision as number) < 1 || !root.data || typeof root.data !== 'object' || !('action' in root.data) || typeof root.data.action !== 'string' || !Object.hasOwn(actionFields, root.data.action)) throw new Error('Commande de carte invalide.')
  const data = closedCollectiveObject(root.data, actionFields[root.data.action as keyof typeof actionFields])
  for (const key of ['author', 'participation', 'version', 'id']) if (key in data) celebrationUuid(data[key])
  if ('content' in data) data.content = collectiveSignature(data.content)
  if ('consent' in data && data.consent !== true) throw new Error('Confirmation explicite requise.')
  if ('confirmMissing' in data && typeof data.confirmMissing !== 'boolean') throw new Error('Confirmation invalide.')
  if ('expiryDays' in data && !(CARD_EXPIRY_DAYS as readonly unknown[]).includes(data.expiryDays)) throw new Error('Expiration invalide.')
  for (const key of ['publication', 'email']) if (key in data && data[key] !== null) {
    const civil = closedCollectiveObject(data[key], ['date', 'time', 'timeZone', 'occurrence', 'instant'])
    data[key] = validateCivilSchedule(civil as CivilSchedule)
  }
  if ('address' in data && data.address !== null) data.address = collectiveEmail(data.address)
  return { operation: celebrationUuid(root.operation), revision: root.revision as number, data: data as CollectiveAction }
}
export function collectiveEmail(value: unknown): string {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || /[\r\n\u0000]/.test(value)) throw new Error('Adresse du destinataire invalide.')
  return value.trim().toLowerCase()
}
function member(actor: CollectiveActor, env: CollectiveEnvironment) {
  if (!actor.verified) throw new Error('Connexion avec adresse vérifiée requise.')
  const row = env.members.find(entry => entry.account === actor.account)
  if (!row) throw new Error('Cette carte est indisponible.')
  return row
}
export function collectiveAllowed(state: CollectiveState, actor: CollectiveActor, env: CollectiveEnvironment): CollectiveMember {
  const row = member(actor, env)
  if (['suspendue', 'supprimee'].includes(env.celebrationState) || env.recipientAccount === actor.account || state.excludedAccounts.includes(actor.account) || collectiveEmail(actor.verifiedEmail) === state.recipientEmail) throw new Error('Cette carte est indisponible.')
  return row
}
export function createCollectiveState(id: string, actor: CollectiveActor, env: CollectiveEnvironment, title: string, template: CardTemplateId, recipientEmail: string): CollectiveState {
  const current = member(actor, env), address = collectiveEmail(recipientEmail)
  if (current.role !== 'organisateur' || env.celebrationState !== 'active' || env.recipientAccount === actor.account || collectiveEmail(actor.verifiedEmail) === address || !isCardTemplate(template)) throw new Error('Cette carte est indisponible.')
  return { id: celebrationUuid(id), revision: 1, title: collectiveText(title, 200, true), template, responsible: current.participation, recipientEmail: address, excludedAccounts: env.recipientAccount ? [env.recipientAccount] : [], phase: 'ouverte', invited: [], contributions: [], validation: null, versions: [], plan: null, reports: [], operations: [] }
}
function snapshot(state: CollectiveState) {
  return collectiveCardSnapshot({ format: 3, renderVersion: 3, templateVersion: 1, templateId: state.template, title: state.title, contributions: state.contributions.filter(entry => !entry.hidden).map(entry => entry.content) })
}
function stopPending(state: CollectiveState) {
  if (!state.plan) return
  if (state.plan.publicationState === 'programme') state.plan.publicationState = 'annule'
  if (state.plan.emailState === 'programme') state.plan.emailState = 'annule'
}
function invalidate(state: CollectiveState) { state.validation = null; stopPending(state) }
function removeAuthor(state: CollectiveState, author: string) {
  state.contributions = state.contributions.filter(entry => entry.author !== author)
  state.versions.forEach(version => { if (version.authors.includes(author)) version.revoked = true })
  state.reports = state.reports.filter(report => report.author !== author && report.target !== author)
  invalidate(state)
}
/** À exercer avant une lecture : correspondances de destinataire et générations non réutilisables. */
export function reconcileCollectiveState(input: CollectiveState, env: CollectiveEnvironment, recipientMatches: string[] = []): CollectiveState {
  const state = structuredClone(input)
  state.excludedAccounts = [...new Set([...state.excludedAccounts, ...recipientMatches, ...(env.recipientAccount ? [env.recipientAccount] : [])])]
  for (const entry of state.contributions) {
    if (state.excludedAccounts.includes(entry.author) || !env.members.some(row => row.account === entry.author && row.participation === entry.participation && row.generation === entry.generation)) removeAuthor(state, entry.author)
  }
  state.invited = state.invited.filter(id => env.members.some(row => row.participation === id && !state.excludedAccounts.includes(row.account)))
  if (env.celebrationState !== 'active') stopPending(state)
  if (['suspendue', 'supprimee'].includes(env.celebrationState)) state.versions.forEach(version => { version.revoked = true })
  if (env.celebrationState === 'supprimee') { state.contributions = []; state.versions = []; state.reports = []; state.invited = []; state.validation = null; state.recipientEmail = '' }
  return state
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key])).join(',') + '}'
  return JSON.stringify(value)
}
export function applyCollectiveCommand(input: CollectiveState, actor: CollectiveActor, command: CollectiveCommand, env: CollectiveEnvironment): CollectiveState {
  command = collectiveCommand(command)
  // Le serveur/base doit fournir les participations ACTUELLES et sérialiser l'appel.
  const state = reconcileCollectiveState(input, env), current = collectiveAllowed(state, actor, env)
  celebrationUuid(command.operation)
  const fingerprint = env.digest(canonical(command)), old = state.operations.find(op => op.actor === actor.account && op.id === command.operation)
  if (old) { if (old.fingerprint !== fingerprint) throw new Error('Identifiant de commande déjà utilisé.'); return state }
  if (command.revision !== state.revision || !Number.isSafeInteger(command.revision)) throw new Error('La carte a changé. Ta saisie est conservée ; relis puis réessaie.')
  const data = command.data, admin = current.role === 'organisateur', editable = env.celebrationState === 'active'
  if (!editable && !['retirer', 'revoquer', 'signaler', 'annuler_programmation'].includes(data.action)) throw new Error('Les préparatifs sont fermés.')
  if (state.operations.filter(op => op.actor === actor.account && op.at > env.now - 3600000).length >= 60) throw new Error('Limite d’actions atteinte. Réessaie plus tard.')
  const own = state.contributions.find(entry => entry.author === actor.account)
  if (data.action === 'confirmer') {
    if (state.phase !== 'ouverte' || !state.invited.includes(current.participation) || data.consent !== true) throw new Error('Contribution indisponible ou confirmation manquante.')
    const entry: CollectiveContribution = { author: actor.account, participation: current.participation, generation: current.generation, content: collectiveSignature(data.content), hidden: own?.hidden ?? false }
    state.contributions = [...state.contributions.filter(row => row.author !== actor.account), entry].sort((a, b) => a.participation.localeCompare(b.participation))
    invalidate(state)
  } else if (data.action === 'retirer') {
    if (!admin && data.author !== actor.account) throw new Error('Cette carte est indisponible.')
    removeAuthor(state, data.author)
  } else if (data.action === 'signaler') {
    if (!state.contributions.some(row => row.author === data.author) || state.reports.some(row => row.author === actor.account && row.target === data.author) || state.operations.filter(row => row.actor === actor.account && row.action === 'signaler' && row.at > env.now - 86400000).length >= 3) throw new Error('Signalement indisponible ou déjà enregistré.')
    state.reports.push({ author: actor.account, target: data.author, at: env.now })
  } else {
    if (!admin) throw new Error('Cette carte est indisponible.')
    if (data.action === 'inviter') {
      const target = env.members.find(row => row.participation === celebrationUuid(data.participation))
      if (state.phase !== 'ouverte' || !target || state.excludedAccounts.includes(target.account) || state.invited.includes(target.participation)) throw new Error('Contribution indisponible.')
      if (state.operations.filter(op => op.actor === actor.account && op.action === 'inviter' && op.at > env.now - 86400000).length >= 10) throw new Error('Limite d’invitations atteinte.')
      state.invited.push(target.participation)
    } else if (data.action === 'masquer' || data.action === 'retablir') {
      const entry = state.contributions.find(row => row.author === data.author)
      if (!entry) throw new Error('Contribution indisponible.')
      entry.hidden = data.action === 'masquer'; invalidate(state)
      if (entry.hidden) state.versions.forEach(version => { if (version.authors.includes(entry.author)) version.revoked = true })
    } else if (data.action === 'fermer') {
      if (state.phase !== 'ouverte' || (state.invited.some(id => !state.contributions.some(row => row.participation === id)) && data.confirmMissing !== true)) throw new Error('Confirme la fermeture avec des signatures manquantes.')
      state.phase = 'fermee'; invalidate(state)
    } else if (data.action === 'rouvrir') { state.phase = 'ouverte'; invalidate(state) }
    else if (data.action === 'valider') {
      if (state.phase !== 'fermee') throw new Error('Ferme les contributions avant validation.')
      const content = snapshot(state)
      state.validation = { snapshot: content, fingerprint: env.digest(canonical(content)) }
    } else if (data.action === 'revoquer') { state.versions.forEach(version => { version.revoked = true }); stopPending(state) }
    else if (data.action === 'responsable') {
      if (!env.members.some(row => row.participation === data.participation && row.role === 'organisateur' && !state.excludedAccounts.includes(row.account))) throw new Error('Organisateur indisponible.')
      state.responsible = data.participation
    } else if (data.action === 'annuler_programmation') {
      if (state.plan && ['pris_en_charge', 'incertain'].includes(state.plan.emailState)) throw new Error('Trop tard pour garantir l’annulation. Tu peux révoquer le lien.')
      stopPending(state)
    } else if (data.action === 'publier' || data.action === 'programmer') {
      if (state.phase !== 'fermee' || !state.validation || env.digest(canonical(snapshot(state))) !== state.validation.fingerprint) throw new Error('Une validation actuelle est requise.')
      if (data.action === 'publier') {
        celebrationUuid(data.version)
        if (!(CARD_EXPIRY_DAYS as readonly number[]).includes(data.expiryDays)) throw new Error('Expiration invalide.')
        state.versions.forEach(version => { version.revoked = true })
        state.versions.push({ id: data.version, content: structuredClone(state.validation.snapshot), authors: state.contributions.filter(row => !row.hidden).map(row => row.author), revoked: false, expiresAt: new Date(env.now + data.expiryDays * 86400000).toISOString() })
      } else {
        celebrationUuid(data.id)
        if (data.consent !== true || (!data.publication && !data.email)) throw new Error('Confirme les opérations à programmer.')
        if (state.plan && ['pris_en_charge', 'incertain'].includes(state.plan.emailState)) throw new Error('Trop tard pour garantir le report. Rapprochement requis.')
        const publication = data.publication ? validateCivilSchedule(data.publication) : null, email = data.email ? validateCivilSchedule(data.email) : null
        if ([publication, email].some(row => row && (Date.parse(row.instant) < env.now || Date.parse(row.instant) > env.now + 366 * 86400000))) throw new Error('Horaire hors fenêtre autorisée.')
        if (email && (!data.address || collectiveEmail(data.address) !== state.recipientEmail)) throw new Error('Confirme l’adresse de référence du destinataire.')
        if (email && publication && email.instant < publication.instant) throw new Error('L’envoi ne peut pas précéder la publication.')
        const active = state.versions.find(row => !row.revoked && Date.parse(row.expiresAt) > env.now)
        if (email && !publication && (!active || Date.parse(active.expiresAt) <= Date.parse(email.instant))) throw new Error('Une publication accessible est requise avant cet envoi.')
        stopPending(state)
        state.plan = { id: data.id, publication, email, address: email ? state.recipientEmail : null, fingerprint: state.validation.fingerprint, publicationState: publication ? 'programme' : 'publie', emailState: email ? 'programme' : 'absent' }
      }
    }
  }
  state.revision++
  state.operations.push({ actor: actor.account, id: command.operation, fingerprint, at: env.now, action: data.action })
  return state
}
export function collectivePublicationDue(state: CollectiveState, now: number) {
  return state.plan?.publication && state.plan.publicationState === 'programme' ? collectiveDue(state.plan.publication.instant, now) : 'attente'
}
/** Projection d'export : propre texte seulement, aucun secret ni contenu tiers. */
export function exportCollectiveOwn(state: CollectiveState, actor: CollectiveActor, env: CollectiveEnvironment) {
  collectiveAllowed(state, actor, env)
  return { id: state.id, title: state.title, contributions: state.contributions.filter(row => row.author === actor.account).map(row => collectiveSignature(row.content)) }
}
