// État du formulaire : un changement de destinataire ou de réglage efface l'ancien résultat.
import { TYPES_EVENEMENT, TYPES_RELATION, TONS_MESSAGE, normalizeRelation } from '@/lib/constants'
import type { Contact } from '@/types/database'
import type { StyleSettings } from './message-styles'

export type GeneratorContact = Pick<Contact, 'id' | 'prenom' | 'nom' | 'relation' | 'date_naissance' | 'email' | 'est_favori'>

export type GeneratorState = {
  contact: GeneratorContact | null
  manual: boolean
  firstName: string
  relation: string
  tone: string
  length: 'short' | 'medium' | 'long'
  addressing: 'tu' | 'vous'
  emojis: boolean
  signature: string
  eventType: string
  message: string
  hasResult: boolean
  error: string
  loading: boolean
}

export type GeneratorAction =
  | { type: 'style'; settings: StyleSettings }
  | { type: 'contact'; contact: GeneratorContact }
  | { type: 'manual' | 'clear' | 'begin' }
  | { type: 'name' | 'relation' | 'tone' | 'occasion' | 'success' | 'failure' | 'edit' | 'length' | 'addressing' | 'emojis' | 'signature'; value: string }

export function validOccasion(value: string | null) {
  return TYPES_EVENEMENT.some(event => event.value === value) ? value! : 'anniversaire'
}

export function initialGeneratorState(eventType: string | null = null): GeneratorState {
  return { contact: null, manual: false, firstName: '', relation: 'ami', tone: 'familier', length: 'short', addressing: 'tu', emojis: false, signature: '', eventType: validOccasion(eventType), message: '', hasResult: false, error: '', loading: false }
}

export function contactDisplayName(contact: GeneratorContact) {
  return [contact.prenom?.trim(), contact.nom?.trim()].filter(Boolean).join(' ') || 'Contact sans nom'
}

export function canGenerate(state: GeneratorState) {
  return !state.loading && (state.contact !== null || (state.manual && state.firstName.trim().length > 0))
}

export function generatorReducer(state: GeneratorState, action: GeneratorAction): GeneratorState {
  // Pendant la requête, le destinataire et les réglages restent ceux du message demandé.
  if (state.loading && action.type !== 'success' && action.type !== 'failure') return state
  const resetResult = { message: '', hasResult: false, error: '' }
  switch (action.type) {
    case 'style':
      return { ...state, ...resetResult, ...action.settings }
    case 'contact': {
      const relation = normalizeRelation(action.contact.relation)
      return { ...initialGeneratorState(state.eventType), contact: action.contact, firstName: action.contact.prenom?.trim() ?? '', relation, tone: relation === 'pro' ? 'formel' : 'familier', addressing: relation === 'pro' ? 'vous' : 'tu' }
    }
    case 'manual':
    case 'clear':
      return { ...initialGeneratorState(state.eventType), manual: action.type === 'manual' }
    case 'name':
      return state.manual && action.value !== state.firstName ? { ...state, ...resetResult, firstName: action.value } : state
    case 'relation':
      if (action.value === state.relation || !TYPES_RELATION.some(item => item.value === action.value)) return state
      return { ...state, ...resetResult, relation: action.value, tone: action.value === 'pro' ? 'formel' : 'familier', addressing: action.value === 'pro' ? 'vous' : 'tu' }
    case 'length':
      return ['short', 'medium', 'long'].includes(action.value) ? { ...state, ...resetResult, length: action.value as GeneratorState['length'] } : state
    case 'addressing':
      return action.value === 'tu' || action.value === 'vous' ? { ...state, ...resetResult, addressing: action.value } : state
    case 'emojis':
      return action.value === 'true' || action.value === 'false' ? { ...state, ...resetResult, emojis: action.value === 'true' } : state
    case 'signature':
      return { ...state, ...resetResult, signature: action.value.slice(0, 200) }
    case 'tone':
      return action.value !== state.tone && TONS_MESSAGE.some(item => item.value === action.value) ? { ...state, ...resetResult, tone: action.value } : state
    case 'occasion': {
      const eventType = validOccasion(action.value)
      return eventType === state.eventType ? state : { ...state, ...resetResult, eventType }
    }
    case 'begin':
      return canGenerate(state) ? { ...state, loading: true, error: '' } : state
    case 'success':
      return state.loading ? { ...state, loading: false, message: action.value, hasResult: true, error: '' } : state
    case 'failure':
      return state.loading ? { ...state, loading: false, error: action.value } : state
    case 'edit':
      return { ...state, message: action.value }
  }
}

const searchableText = (value: string) => value.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export function searchGeneratorContacts(contacts: GeneratorContact[], query: string) {
  const key = searchableText(query)
  return contacts.filter(contact => searchableText(`${contact.prenom ?? ''} ${contact.nom ?? ''} ${contact.relation ?? ''}`).includes(key))
    .sort((a, b) => Number(Boolean(b.est_favori)) - Number(Boolean(a.est_favori))
      || (a.prenom?.trim() || a.nom?.trim() || '').localeCompare(b.prenom?.trim() || b.nom?.trim() || '', 'fr', { sensitivity: 'base' })
      || (a.nom ?? '').localeCompare(b.nom ?? '', 'fr', { sensitivity: 'base' }))
}
