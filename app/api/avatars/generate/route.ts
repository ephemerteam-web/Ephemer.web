import { generateSelfieAvatar } from '@/lib/selfie-avatar-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Marge pour l’authentification et la préparation ; l’appel Cloudflare est limité à 60 s.
export const maxDuration = 90

export async function POST(request: Request) { return generateSelfieAvatar(request) }
