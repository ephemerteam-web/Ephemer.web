// 🎁 Double accord contrôlé avant et après Mammouth AI, sans cache ni relance.
import { cadeauxEndpoint } from '@/lib/cadeaux-server'
export async function POST(request: Request) { return cadeauxEndpoint(request) }
