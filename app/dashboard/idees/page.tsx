import { Suspense } from 'react'
import IdeasHub from '@/components/IdeasHub'
export default function Page() { return <Suspense fallback={<p className="p-4" role="status">Chargement des idées…</p>}><IdeasHub /></Suspense> }
