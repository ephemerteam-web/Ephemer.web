import { cardEndpoint } from '@/lib/card-server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { return cardEndpoint(request, 'lien', (await params).id) }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { return cardEndpoint(request, 'lien', (await params).id) }
