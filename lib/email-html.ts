// 🔒 Les données d'un utilisateur restent du texte dans les emails HTML.
// À appliquer au moment de l'insertion dans le HTML, pas aux sujets ni à la DB.
export function echapperHtml(valeur: unknown): string {
  return String(valeur ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
