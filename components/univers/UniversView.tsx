// 🌌 Rendu partagé et aperçu : aucune lecture du carnet ou du profil destinataire.
import { universPartage, type UniversPartage } from '@/lib/univers-contract'
import AvatarRenderer from '@/components/avatars/AvatarRenderer'

const labels = { presentation: 'Présentation', passions: 'Passions', plaisirs: 'Ce qui me fait plaisir', eviter: 'Préférences à éviter', email: 'Email', telephone: 'Téléphone' } as const
export default function UniversView({ value, title = 'Son univers partagé' }: { value: UniversPartage; title?: string }) {
  const univers = universPartage(value), anniversaire = univers.champs.anniversaire
  return <section className="min-w-0 space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-6" aria-label={title}>
    <h2 className="text-lg font-semibold text-ink">{title}</h2>
    <div className="flex min-w-0 items-center gap-3">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-line bg-canvas">
        {univers.champs.avatar ? <AvatarRenderer config={univers.champs.avatar} decorative className="h-full w-full" /> :
          <span aria-hidden="true" className="flex h-full items-center justify-center text-3xl text-accent">{Array.from(univers.identite)[0]}</span>}
      </div>
      <p className="min-w-0 break-words text-xl font-semibold text-ink [overflow-wrap:anywhere]">{univers.identite}</p>
    </div>
    {Object.entries(labels).map(([key, label]) => {
      const value = univers.champs[key as keyof typeof labels]
      return value ? <div key={key} className="space-y-1">
        <h3 className="text-sm font-medium text-muted">{label}</h3>
        <p className="whitespace-pre-wrap break-words text-ink [overflow-wrap:anywhere]">{value}</p>
      </div> : null
    })}
    {anniversaire && <div><h3 className="text-sm font-medium text-muted">Anniversaire</h3>
      <p className="text-ink">{String(anniversaire.jour).padStart(2, '0')}/{String(anniversaire.mois).padStart(2, '0')}{anniversaire.annee !== undefined ? '/' + String(anniversaire.annee).padStart(4, '0') : ''}</p></div>}
    {Object.keys(univers.champs).length === 0 && <p className="text-sm text-muted">Seule cette identité est partagée pour le moment.</p>}
  </section>
}
