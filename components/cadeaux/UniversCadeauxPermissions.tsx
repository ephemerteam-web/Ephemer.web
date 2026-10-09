'use client'
// 🎁 Accord de l'auteur enregistré avec les valeurs et le partage de son univers.
import { CHAMPS_IA_CADEAUX, type ChampIACadeaux, type MonUniversCadeaux, type PermissionsIACadeaux } from '@/lib/cadeaux-social-contract'
const labels: Record<ChampIACadeaux, string> = { identite: 'Prénom ou pseudonyme', presentation: 'Présentation', passions: 'Passions', plaisirs: 'Ce qui me fait plaisir', eviter: 'Préférences à éviter' }

export default function UniversCadeauxPermissions({ univers, onChange, disabled = false }: { univers: MonUniversCadeaux; onChange: (permissions: PermissionsIACadeaux) => void; disabled?: boolean }) {
  return <fieldset disabled={disabled} className="min-w-0 space-y-3 rounded-2xl border border-line p-4">
    <legend className="px-1 text-lg font-semibold">Suggestions cadeaux avec Mammouth AI</legend>
    <p className="break-words text-sm text-muted">Tes étoiles pourront sélectionner ces informations pour leurs suggestions cadeaux. L’autorisation couvre aussi tes prochaines modifications enregistrées.</p>
    <p className="text-sm text-muted">Visible par toutes tes étoiles actuelles et futures. Chaque génération exige aussi leur sélection explicite.</p>
    {CHAMPS_IA_CADEAUX.map(key => {
      const shared = key === 'identite' || univers.partage[key]
      return <div key={key} className="min-w-0">
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" disabled={!shared} checked={shared && univers.iaCadeaux[key]} onChange={e => onChange({ ...univers.iaCadeaux, [key]: e.target.checked })} />
          <span className="min-w-0 break-words">Autoriser : {labels[key]}</span>
        </label>
        {!shared && <p className="pl-7 text-xs text-muted">Active d’abord le partage de ce champ pour pouvoir autoriser son utilisation.</p>}
      </div>
    })}
    <p className="text-xs text-muted">Ces choix restent un brouillon jusqu’à « Enregistrer mes informations et mon partage ». Les messages IA, coordonnées, anniversaire et avatar sont exclus de ces autorisations.</p>
    <p className="text-xs text-muted">Les textes libres sont transmis tels quels : vérifie leur contenu. Retirer ton accord empêche les prochaines demandes, sans annuler les données déjà transmises au prestataire.</p>
  </fieldset>
}
