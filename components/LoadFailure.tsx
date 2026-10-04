'use client'
export default function LoadFailure({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className="mx-auto my-6 max-w-2xl rounded-xl border border-danger/30 bg-surface p-4 text-ink">
    <p>{message}</p>
    <button onClick={retry} className="mt-3 min-h-11 rounded-lg border border-line px-4 py-2 font-semibold">Réessayer</button>
  </div>
}
