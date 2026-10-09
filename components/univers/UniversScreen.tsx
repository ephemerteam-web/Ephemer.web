'use client'
import { useDashboardUser } from '@/components/DashboardUserContext'
import { useDashboardAvatar } from '@/components/avatars/DashboardAvatarContext'
import { universService } from '@/lib/univers-data'
import UniversForm from './UniversForm'
export default function UniversScreen() {
  const { id } = useDashboardUser(), { savedConfig } = useDashboardAvatar()
  return <main><UniversForm key={id} ownerId={id} api={universService} avatarEnregistre={savedConfig} /></main>
}
