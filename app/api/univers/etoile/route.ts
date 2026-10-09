import { universEndpoint } from '@/lib/univers-server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) { return universEndpoint(request, 'etoile') }
