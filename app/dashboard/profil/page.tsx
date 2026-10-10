'use client'
import { useDashboardUser } from '@/components/DashboardUserContext'
import { useDashboardAvatar } from '@/components/avatars/DashboardAvatarContext'
import ProfileForm from '@/components/profil/ProfileForm'
import { profileService } from '@/lib/profile-data'
export default function ProfilePage() {
  const { id } = useDashboardUser(), { savedConfig } = useDashboardAvatar()
  return <main><ProfileForm key={id} ownerId={id} api={profileService} avatarEnregistre={savedConfig}/></main>
}
