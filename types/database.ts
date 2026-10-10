// 📋 Types métier dérivés du schéma réel, sans duplication des colonnes.
import type { Tables } from './database.generated'
export type { Database, Json, Tables, TablesInsert, TablesUpdate } from './database.generated'
export type Profile = Tables<'profiles'>
export type Contact = Tables<'contacts'>
export type Notification = Tables<'notifications'>
export type Rappel = Tables<'rappels'>
export type PatchNote = Tables<'patch_notes'>
export type Invitation = Tables<'invitations'>
// Contrats du parcours V2 proposé : séparés des colonnes réellement installées.
export type { InvitationAnswer, InvitationRecovery, InvitationCandidate, PendingAnswer } from '@/lib/invitation-contract'
export type { ProfilUnifie, CommandeProfil } from '@/lib/profile-contract'
