import Link from 'next/link'
export default function NotFound() {
  return <main className="mx-auto max-w-xl space-y-5 px-5 py-12 text-ink">
    <p className="text-accent">404</p>
    <h1 className="text-2xl font-bold">Page introuvable</h1>
    <p>Ce lien ne correspond plus à une page disponible.</p>
    <Link href="/" className="inline-flex min-h-11 items-center rounded-xl bg-action px-5 py-3 text-on-action">Retour à l’accueil</Link>
  </main>
}
