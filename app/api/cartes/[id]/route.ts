import { cardEndpoint } from '@/lib/card-server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) { return cardEndpoint(request, 'supprimer', (await params).id) }
