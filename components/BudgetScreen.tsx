'use client'
import { useState } from 'react'
import { useDashboardUser } from './DashboardUserContext'
import { AttentionNav, LoadState, field, panel, useAttentionLoad } from './AttentionShared'
import { supabase } from '@/lib/supabase-browser'
import { parisDay } from '@/lib/calendar-day'
import { decimalMoney } from '@/lib/attention-utils'
import { requireOwner } from '@/lib/attention-data'

export function budgetWindow(period: string, mode: string) {
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error('Mois invalide.')
  const [year, month] = period.split('-').map(Number)
  if (year < 1 || year > 9998 || month < 1 || month > 12) throw new Error('Période invalide.')
  const pad = (n: number) => String(n).padStart(2, '0')
  return mode === 'year' ? { start: String(year).padStart(4, '0') + '-01-01', end: String(year + 1).padStart(4, '0') + '-01-01' }
    : { start: period + '-01', end: String(month === 12 ? year + 1 : year).padStart(4, '0') + '-' + pad(month === 12 ? 1 : month + 1) + '-01' }
}
export default function BudgetScreen() {
  const user = useDashboardUser()
  const [period, setPeriod] = useState(parisDay().slice(0,7)), [mode, setMode] = useState('month')
  const loaded = useAttentionLoad(user.id + ':' + period + ':' + mode, async () => {
    const { start, end } = budgetWindow(period, mode)
    await requireOwner(user.id)
    const result = await supabase.rpc('budget_cadeaux_lot05', { p_debut: start, p_fin: end })
    if (result.error) throw result.error
    return result.data
  })
  return <main className="mx-auto max-w-4xl space-y-4 p-4 text-ink"><h1 className="text-2xl font-bold">Budget cadeaux</h1><AttentionNav />
    <div className="grid gap-3 sm:grid-cols-2"><label>Période<input className={field} type="month" value={period} onChange={e => setPeriod(e.target.value)} /></label>
      <label>Vue<select className={field} value={mode} onChange={e => setMode(e.target.value)}><option value="month">Mensuelle</option><option value="year">Annuelle</option></select></label></div>
    <p className="text-sm text-muted">Prévu : choix encore prévus, à la date actuelle de l’événement. Dépensé : achats déclarés, à leur date d’achat. Les devises sont séparées, sans conversion. Un montant inconnu reste différent de zéro.</p>
    {!loaded.data ? <LoadState error={loaded.error} retry={loaded.reload} /> : <div className="grid gap-4 sm:grid-cols-2">
      {loaded.data.map(row => <section key={row.devise} className={panel}><h2 className="font-bold">{row.devise === 'SANS_DEVISE' ? 'Devise non connue' : row.devise}</h2>
        <dl className="space-y-2"><div><dt>Prévu</dt><dd className="text-xl">{decimalMoney(row.prevu, row.devise)}</dd></div>
          <div><dt>Dépensé</dt><dd className="text-xl">{decimalMoney(row.depense, row.devise)}</dd></div>
          <div><dt>Choix prévus sans montant connu</dt><dd>{row.nb_prevu_inconnu}</dd></div>
          <div><dt>Achats datés sans montant connu</dt><dd>{row.nb_depense_inconnu}</dd></div>
        </dl>
        {row.nb_depense_sans_date > 0 && <div className="border-t border-line pt-2"><h3 className="font-semibold">Dépenses sans date · toutes périodes</h3>
          <p>{row.nb_depense_sans_date} achat(s) · {decimalMoney(row.depense_sans_date, row.devise)}</p>
          <p>{row.nb_depense_sans_date_inconnu} sans montant connu</p><p className="text-xs text-muted">Ces dépenses ne sont pas incluses dans le total mensuel ou annuel.</p></div>}
      </section>)}
    </div>}
  </main>
}

