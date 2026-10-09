// 🎁 Projection éligible, sous le JWT utilisateur, sans cache.
import { universEndpoint } from '@/lib/univers-server'
export async function GET(request: Request) { return universEndpoint(request, 'cadeaux') }
