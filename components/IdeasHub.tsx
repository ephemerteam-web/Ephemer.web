'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AttentionNav } from './AttentionShared'
import { IdeaLibrary, GiftHistory } from './GiftLibrary'
import GiftSuggestions from './GiftSuggestions'
import { useContactDraft } from './ContactDraftProvider'

export default function IdeasHub() {
  const params = useSearchParams(), { hasPrivateDraft } = useContactDraft()
  const tab = params.get('vue') ?? 'idees'
  const tabs = [{ id: 'idees', label: 'Mes idées' }, { id: 'suggestions', label: 'Suggestions' }, { id: 'offerts', label: 'Cadeaux offerts' }]
  return <main className="mx-auto min-w-0 max-w-6xl space-y-6 px-4 py-6 text-ink sm:py-9">
    <header className="space-y-3"><p className="text-xs font-semibold uppercase tracking-widest text-accent">Les petites attentions</p><h1 className="text-3xl font-bold sm:text-4xl">Mes idées et cadeaux</h1><p className="max-w-xl text-sm leading-relaxed text-muted">Garde une inspiration, retrouve ce que tu as offert et prépare la prochaine attention.</p></header>
    <AttentionNav />
    <nav aria-label="Idées et cadeaux" className="flex flex-wrap gap-2 rounded-2xl border border-line bg-surface p-2">{tabs.map(t => { const query = new URLSearchParams(params.toString()); query.set('vue', t.id); return <Link key={t.id} aria-current={tab === t.id ? 'page' : undefined} href={'/dashboard/idees?' + query.toString()} onClick={e => { if (hasPrivateDraft() && !window.confirm('Changer de vue et abandonner les saisies non enregistrées ?')) e.preventDefault() }} className={'flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium ' + (tab === t.id ? 'bg-action text-on-action' : 'text-muted hover:bg-ink/5')}>{t.label}</Link> })}</nav>
    {tab === 'suggestions' ? <GiftSuggestions key={JSON.stringify([params.get('contactId'), params.get('eventType'), params.get('occurrenceId')])} initialContactId={params.get('contactId')} initialEventType={params.get('eventType') ?? 'anniversaire'} occurrenceId={params.get('occurrenceId')} /> : tab === 'offerts' ? <GiftHistory /> : <IdeaLibrary />}
  </main>
}
