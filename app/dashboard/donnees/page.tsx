'use client'

import { Button, Card, Notice, PageHeading } from '@/components/ui'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-browser'
import { exportOwnData, readOwnRows } from '@/lib/user-data'
import { parisDay } from '@/lib/calendar-day'
import { deliveryLimit } from '@/lib/delivery-status'

type Preview = { contact: string; date: string; jours: number }
export default function DataPage() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<{ checked: string; late: number; recipient: string | null; events: Preview[] } | null>(null)
  async function run(action: 'export' | 'diagnostic') {
    setBusy(true); setError(''); setReport(null)
    try {
      if (action === 'export') {
        const payload = await exportOwnData()
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
        const link = document.createElement('a'); link.href = url; link.download = `ephemer-${parisDay()}.json`
        link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: { session } } = await supabase.auth.getSession()
        if (!user || !session || session.user.id !== user.id) throw new Error('Reconnecte-toi pour continuer.')
        const reminders = await readOwnRows('rappels', user.id)
        const response = await fetch('/api/cron/test-notifications', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Diagnostic indisponible')
        setReport({ checked: new Date().toLocaleString('fr-FR'), late: reminders.filter(r => r.statut === 'programme' && typeof r.date_envoi === 'string' && r.date_envoi < parisDay()).length, recipient: data.recipient ?? null, events: data.preview ?? [] })
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Opération impossible') }
    finally { setBusy(false) }
  }
  return <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
    <PageHeading title="Mes données et diagnostic">Comprendre les rappels et récupérer une copie personnelle.</PageHeading>
    {error && <Notice error>{error}</Notice>}
    <Card><h2 className="text-xl font-semibold">Exporter mes données</h2>
      <p>Profil, contacts, rappels, notifications, préférences et métadonnées des invitations au format JSON. Les liens secrets et clés push sont exclus. Conserve ce fichier personnel dans un endroit sûr.</p>
      <Button disabled={busy} onClick={() => run('export')}>{busy ? 'Opération en cours…' : 'Télécharger mon export'}</Button>
    </Card>
    <Card><h2 className="text-xl font-semibold">Diagnostic sans envoi</h2>
      <p>Lecture des anniversaires aux paliers du jour et des rappels en retard. Aucune notification créée, aucun email envoyé. Ce contrôle manuel ne surveille pas les crons en arrière-plan.</p>
      <Button variant="secondary" disabled={busy} onClick={() => run('diagnostic')}>Actualiser le diagnostic</Button>
      {report && <div aria-live="polite" className="space-y-3"><p>Vérifié le {report.checked} (jour de référence : Europe/Paris).</p>
        <p role={report.late ? 'alert' : 'status'}>{report.late} rappel(s) programmé(s) avant aujourd’hui, encore en attente.</p>
        <p>Destinataire du récapitulatif : {report.recipient ?? 'aucun (email désactivé ou absent)'}</p>
        <ul className="space-y-2">{report.events.map((e, i) => <li key={i}>{e.contact} — {e.date} — J-{e.jours}</li>)}</ul>
        {!report.events.length && <p>Aucun anniversaire à un palier actif aujourd’hui.</p>}
      </div>}
      <p className="text-sm text-muted">Absence de cron, échecs répétés et variations de volume : non mesurables sans historique serveur. Les push ne disposent pas encore d’un expéditeur identifié.</p>
    </Card>
    <p className="text-sm text-muted">{deliveryLimit}</p>
    <Link href="/dashboard/profil" className="underline">Retour au profil</Link>
  </div>
}
