'use client'
import Link from 'next/link'
export default function ErrorRecovery({ reset, dashboard = false }: { reset: () => void; dashboard?: boolean }) {
  return <main className="mx-auto max-w-xl space-y-5 px-5 py-12 text-ink">
    <h1 className="text-2xl font-bold">Cette page est indisponible</h1>
    <p role="alert">Une erreur empêche son affichage. Tu peux réessayer dans un instant.</p>
    <button onClick={reset} className="min-h-11 rounded-xl bg-action px-5 py-3 font-semibold text-on-action">Réessayer</button>
    <p><Link className="underline" href={dashboard ? '/dashboard' : '/'}>{dashboard ? 'Retour au tableau de bord' : 'Retour à l’accueil'}</Link></p>
  </main>
}
