'use client'
import { useEffect } from 'react'
import { purgeInvitationDrafts } from '@/lib/invitation-drafts'
export default function InvitationDraftCleanup() {
  useEffect(() => { try { purgeInvitationDrafts(localStorage) } catch { /* Stockage interdit. */ } }, [])
  return null
}
