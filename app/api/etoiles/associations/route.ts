import { etoilesEndpoint } from '@/lib/etoiles-server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) { return etoilesEndpoint(request, 'associations') }

