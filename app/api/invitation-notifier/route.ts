// Un token de lien ne prouve pas une nouvelle soumission.
// Aucun appel externe : la reprise exige une preuve serveur et une
// déduplication durable (voir AUDIT-CORRECTIONS.md).
export async function POST() {
  return Response.json(
    { error: "Les alertes d’invitation sont temporairement indisponibles." },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  )
}
