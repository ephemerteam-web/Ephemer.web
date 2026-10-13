import { celebrationEndpoint } from '@/lib/celebration-server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) { return celebrationEndpoint(request, 'liste') }
export async function POST(request: Request) { return celebrationEndpoint(request, 'liste') }
