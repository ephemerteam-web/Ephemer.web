'use client'
import { AI_CONTACT_FIELDS, type AIContactField } from '@/lib/ai-consent'
const labels: Record<AIContactField,string> = { firstName: 'Prénom', age: 'Âge calculé (sans date de naissance)', note: 'Note personnelle du contact' }
export default function AIConsent({ fields, onChange, disabled = false, title = 'Personnalisation facultative avec Mammouth AI', values }: { fields: AIContactField[]; onChange: (fields: AIContactField[]) => void; disabled?: boolean; title?: string; values?: Record<string, string | number> }) {
  return <fieldset disabled={disabled} className="min-w-0 text-xs text-muted"><legend className="py-1">{title}</legend>
    <p>Pour cette demande uniquement, j’autorise l’envoi des champs cochés au prestataire IA :</p>
    <div className="flex flex-wrap gap-x-4">{AI_CONTACT_FIELDS.map(field => <label key={field} className="flex min-h-11 items-center gap-2">
      <input type="checkbox" checked={fields.includes(field)} onChange={e => onChange(e.target.checked ? [...fields, field] : fields.filter(f => f !== field))} /><span>{labels[field]}{values && <span className="block whitespace-pre-wrap break-words">{values[field === 'firstName' ? 'prenom' : field] ?? 'Non renseigné'}</span>}</span>
    </label>)}</div><p>Décoché par défaut. Les champs de coordonnées, brouillons et autres notes restent privés.</p>
    {fields.includes('note') && <p className="mt-1">Le contenu de la note sera envoyé tel quel, dans la limite de 4 000 caractères. Vérifie qu’il ne contient pas d’informations que tu souhaites garder privées.</p>}
  </fieldset>
}
