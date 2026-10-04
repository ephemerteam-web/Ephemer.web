'use client'
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Le layout et ses styles peuvent eux-mêmes être indisponibles.
  return <html lang="fr"><body style={{ margin: 0, background: '#0b1425', color: '#f4f0e8', fontFamily: 'Arial, sans-serif' }}>
    <main style={{ maxWidth: 560, margin: 'auto', padding: '48px 20px' }}>
      <h1>Ephemer est momentanément indisponible</h1>
      <p role="alert">Réessaie dans un instant.</p>
      <button onClick={reset} style={{ minHeight: 44, padding: '12px 20px' }}>Réessayer</button>
      <p><button onClick={() => window.location.assign('/')} style={{ color: '#dfbc61', minHeight: 44 }}>Retour à l’accueil</button></p>
    </main>
  </body></html>
}
