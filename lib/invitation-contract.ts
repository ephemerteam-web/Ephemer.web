import { partialBirthDate, type PartialBirthDate } from './contact-quality'
import { isCalendarDay, parisDay } from './calendar-day'
import { GROUPES_INTERETS } from '@/app/invitation/[token]/interets'
export type InvitationAnswer = {
  prenom: string; nom: string; anniversaire: PartialBirthDate | null; relation: string;
  interets: string[]; noteLibre: string; email: string; indicatif: string; tel: string; conserver: boolean
}
export type InvitationRecovery = { id: string; createdAt: string; expiresAt: string; donnees: InvitationAnswer }
export type InvitationCandidate = { id: string; empreinte: string; prenom: string; nom: string; email: string; indicatif: string; tel: string; anniversaire: PartialBirthDate | null; relation: string; note: string }
export type PendingAnswer = { id: string; revision: number; donnees: InvitationAnswer; candidats: InvitationCandidate[] }
export function invitationAnswer(input: InvitationAnswer, profile = false): InvitationAnswer {
  const value = { ...input, prenom: input.prenom.trim(), nom: input.nom.trim(), email: input.email.trim().toLowerCase(), tel: input.tel.replace(/\D/g, ''), noteLibre: input.noteLibre.trim() }
  if (!value.prenom || value.prenom.length > 80 || value.nom.length > 80) throw new Error('Renseigne un prénom (80 caractères maximum).')
  if (value.email && (value.email.length > (profile ? 320 : 160) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.email))) throw new Error('Vérifie ton adresse e-mail.')
  if (value.conserver && !value.email) throw new Error('Un e-mail est nécessaire pour retrouver tes informations sur un autre appareil.')
  if (value.noteLibre.length > (profile ? 1000 : 500) || value.tel.length > (profile ? 31 : 20) || !(profile ? /^\+[0-9]{0,7}$/ : /^\+[0-9]{1,7}$/).test(value.indicatif)) throw new Error('Vérifie les coordonnées et la longueur du texte libre.')
  if (!['ami', 'famille', 'couple', 'pro', 'autre'].includes(value.relation)) throw new Error('Choisis ta relation avec ton proche.')
  const choices = new Set(GROUPES_INTERETS.flatMap(group => group.items))
  if (!Array.isArray(value.interets) || value.interets.length > choices.size || value.interets.some(item => !choices.has(item))) throw new Error('Centres d’intérêt invalides.')
  value.interets = [...new Set(value.interets)]
  if (!profile && invitationNote(value).length > 1000) throw new Error('Réduis les centres d’intérêt ou le texte libre : leur ensemble est limité à 1000 caractères.')
  if (value.anniversaire) {
    const { day, month, year } = value.anniversaire
    value.anniversaire = partialBirthDate(String(day), String(month), year === null ? '' : String(year))
    const date = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (year !== null && (!Number.isInteger(year) || year < 1 || date > parisDay() || !isCalendarDay(date))) throw new Error('Date de naissance invalide.')
  }
  return value
}
export function invitationNote(data: InvitationAnswer) { return [data.interets.join(', '), data.noteLibre].filter(Boolean).join(' — ') }
export const emptyInvitationAnswer = (): InvitationAnswer => ({ prenom: '', nom: '', anniversaire: null, relation: 'autre', interets: [], noteLibre: '', email: '', indicatif: '+33', tel: '', conserver: false })
