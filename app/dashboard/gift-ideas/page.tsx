'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import GiftSuggestions from '@/components/GiftSuggestions'
import { button } from '@/components/AttentionShared'
function SuggestionsPage() {
  const params = useSearchParams(), query = new URLSearchParams(params.toString())
  query.set('vue', 'idees')
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 text-ink"><header className="space-y-3"><h1 className="text-3xl font-bold">Trouver une attention</h1><p className="text-sm text-muted">Des idées à rechercher, à garder ou à préparer pour une occasion précise.</p><Link className={button} href={'/dashboard/idees?' + query.toString()}>Retrouver ma boîte à idées</Link></header><GiftSuggestions key={JSON.stringify([params.get('contactId'), params.get('etoileId'), params.get('eventType'), params.get('occurrenceId')])} initialContactId={params.get('contactId')} initialEtoileId={params.get('etoileId')} initialEventType={params.get('eventType') ?? 'anniversaire'} occurrenceId={params.get('occurrenceId')} /></main>
}
export default function Page() { return <Suspense fallback={<p role="status" className="p-4">Chargement des suggestions…</p>}><SuggestionsPage /></Suspense> }
