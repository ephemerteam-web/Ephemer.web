'use client'
// 🎁 Sélection contrôlée par le générateur, sans sauvegarde ni réseau implicite.
import { CHAMPS_IA_CADEAUX, type ChampIACadeaux, type UniversPourCadeaux } from '@/lib/cadeaux-social-contract'
const labels: Record<ChampIACadeaux, string> = { identite: 'Prénom ou pseudonyme', presentation: 'Présentation', passions: 'Passions', plaisirs: 'Ce qui lui fait plaisir', eviter: 'Préférences à éviter' }

export default function UniversCadeauxSelection({ projection, fields, onChange, disabled = false, loading = false }: { projection: UniversPourCadeaux | null; fields: ChampIACadeaux[]; onChange: (fields: ChampIACadeaux[]) => void; disabled?: boolean; loading?: boolean }) {
  const available = projection ? CHAMPS_IA_CADEAUX.filter(k => k in projection.champs) : []
  return <fieldset disabled={disabled || loading || !projection} className="min-w-0 space-y-3 rounded-2xl border border-line p-4">
    <legend className="px-1 font-semibold">Informations partagées par cette étoile</legend>
    <p className="text-sm text-muted">Pour cette génération uniquement, choisis les champs que tu autorises à transmettre à Mammouth AI.</p>
    {available.map(key => <div key={key} className="min-w-0">
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={fields.includes(key)} onChange={e => onChange(e.target.checked ? [...fields, key] : fields.filter(k => k !== key))} /><span>{labels[key]}</span></label>
      <p className="whitespace-pre-wrap break-words pl-7 text-sm [overflow-wrap:anywhere]">{projection!.champs[key]}</p>
    </div>)}
    {loading ? <p role="status" className="text-sm">Actualisation des informations autorisées…</p> : !available.length ? <p className="text-sm text-muted">{projection ? 'Cette étoile n’a autorisé aucun champ pour les cadeaux. Tu peux chercher des idées générales.' : 'Les informations de cette étoile sont indisponibles. Tu peux chercher des idées générales.'}</p> : null}
    <p className="text-xs text-muted">Décoché par défaut. La sélection est effacée après chaque tentative ou changement de destinataire. Aucune copie dans ton carnet.</p>
    <p className="text-xs text-muted">Vérifie ces textes libres avant de les transmettre. Les réglages de partage des coordonnées, de l’anniversaire et de l’avatar ne les envoient jamais à l’IA.</p>
  </fieldset>
}
