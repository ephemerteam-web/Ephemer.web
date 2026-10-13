'use client'
import Link from 'next/link'
import { attentionRows } from '@/lib/attention-data'
import { exactTotal, personalCelebrationCosts } from '@/lib/celebration-personal'
import { useDashboardUser } from './DashboardUserContext'
import { LoadState, button, panel, useAttentionLoad } from './AttentionShared'

export default function CelebrationCosts({ preparationId, includePlanned, refresh }: { preparationId: string; includePlanned: boolean; refresh: number }) {
  const user = useDashboardUser()
  const loaded = useAttentionLoad(`${user.id}:costs:${preparationId}`, async () => {
    const [choices, gifts] = await Promise.all([attentionRows('choix_cadeaux', user.id), attentionRows('cadeaux_offerts', user.id)])
    return { choices, gifts }
  }, refresh)
  let totals: ReturnType<typeof personalCelebrationCosts> = [], error = ''
  try { if (loaded.data) totals = personalCelebrationCosts(loaded.data.choices, loaded.data.gifts, preparationId, includePlanned) }
  catch (cause) { error = cause instanceof Error ? cause.message : 'Calcul indisponible.' }
  return <section className={panel}>
    <h2 className="text-lg font-bold">Frais de ma célébration</h2>
    <p className="text-sm text-muted">Retrouve ici les estimations et achats déclarés pour les cadeaux de cette célébration. Les devises restent séparées. Le don ne compte pas une seconde dépense.</p>
    <details><summary className="min-h-11 cursor-pointer py-3 font-medium">Mon budget facultatif</summary>
      <p className="text-sm text-muted">Les estimations sont indicatives. Pour changer un montant ou déclarer un achat, ouvre le cadeau dans Idées et cadeaux.</p>
      {!loaded.data ? <LoadState error={loaded.error} retry={loaded.reload} /> : error ? <p role="alert">{error}</p> : <>
        {!totals.length && <p className="py-3 text-sm">Aucun montant à récapituler. Tu peux organiser cette célébration sans achat.</p>}
        {totals.map(total => <div key={total.currency} className="space-y-2 border-t border-line py-3">
          <h3 className="font-semibold">{total.currency === 'SANS_DEVISE' ? 'Devise inconnue' : total.currency}</h3>
          <dl className="grid gap-2 sm:grid-cols-2"><div><dt>Prévu</dt><dd>{exactTotal(total.planned, total.currency)}</dd></div><div><dt>Dépensé déclaré</dt><dd>{exactTotal(total.spent, total.currency)}</dd></div></dl>
          {total.plannedUnknown > 0 && <p>{total.plannedUnknown} estimation(s) sans montant connu, hors total.</p>}
          {total.spentUnknown > 0 && <p>{total.spentUnknown} achat(s) sans montant connu, hors total.</p>}
        </div>)}
      </>}
    </details>
    <Link href="/dashboard/budget" className={button}>Ma synthèse personnelle</Link>
  </section>
}
