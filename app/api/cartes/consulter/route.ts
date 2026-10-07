import { cardEndpoint } from '@/lib/card-server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) { return cardEndpoint(request, 'consulter') }
