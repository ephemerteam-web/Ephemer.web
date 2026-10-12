// Seul un marqueur d'interface est conservé : aucun champ du profil ni accord n'est stocké localement.
const prefix = 'ephemer:profile-permission-proposal:v1:'
export function proposerPermissionsProfil(ownerId: string): boolean {
  try { return window.localStorage.getItem(prefix + ownerId) !== 'traite' }
  catch { return false } // Sans mémoire disponible, ne pas reproposer des accords à chaque visite.
}
export function permissionsProfilTraitees(ownerId: string): void {
  try { window.localStorage.setItem(prefix + ownerId, 'traite') }
  catch { /* La sauvegarde du profil ne dépend pas de la disponibilité du stockage navigateur. */ }
}
