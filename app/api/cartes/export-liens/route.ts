import { cardEndpoint } from '@/lib/card-server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) { return cardEndpoint(request, 'export') }
