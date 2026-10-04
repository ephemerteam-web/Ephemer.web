import type { Diagnostic } from '@/lib/diagnostic'
export default function DiagnosticPreview({ preview, recipient }: Diagnostic) {
  return <div aria-live="polite" className="mt-4 space-y-3">
    <p>Simulation : aucun envoi ni modification de données.</p>
    <p>{preview.length} événement(s) prévu(s) aujourd’hui.</p>
    <p>Destinataire éventuel du récapitulatif : {recipient ?? 'aucun (email désactivé ou absent)'}</p>
    {preview.length ? <ul className="space-y-2">{preview.map((event, index) =>
      <li key={index}>{event.contact} — {event.date} — {event.jours === 0 ? 'Jour J' : 'J-' + event.jours}</li>)}</ul>
      : <p>Aucun anniversaire à un palier actif aujourd’hui.</p>}
  </div>
}
