import { collectiveEndpoint } from '@/lib/collective-card-server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) { return collectiveEndpoint(request) }
export async function POST(request: Request) { return collectiveEndpoint(request) }
