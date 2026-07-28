// lib/garde-ia.ts
import { supabaseAdmin } from '@/lib/supabase-admin';

const QUOTA_JOUR = Number(process.env.QUOTA_IA_JOUR ?? 30);

type ResultatGarde =
  | { ok: true; userId: string }
  | { ok: false; status: number; message: string };

/**
 * Garde-fou des routes IA.
 * @param request - la requête reçue par la route API.
 *   On y lit l'en-tête "Authorization" qui contient le token de session.
 */
export async function verifierGardeIA(request: Request): Promise<ResultatGarde> {
  // ─────────────────────────────────────────────
  // 1. Récupérer le token envoyé par le navigateur
  //    Un "token" = une carte d'identité temporaire
  //    prouvant que l'utilisateur est bien connecté.
  // ─────────────────────────────────────────────
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return { ok: false, status: 401, message: 'Tu dois être connecté.' };
  }

  const token = authHeader.replace('Bearer ', '');

  // ─────────────────────────────────────────────
  // 2. Vérifier que ce token est valide
  //    (impossible à falsifier : c'est Supabase qui tranche)
  // ─────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return { ok: false, status: 401, message: 'Session expirée. Reconnecte-toi.' };
  }

  // ─────────────────────────────────────────────
  // 3. Vérifier + incrémenter le quota du jour
  //    (on utilise supabaseAdmin : l'utilisateur ne doit
  //     pas pouvoir modifier son propre compteur)
  // ─────────────────────────────────────────────
  const { data: nbAppels, error } = await supabaseAdmin.rpc(
    'incrementer_quota_ia',
    { p_user_id: user.id }
  );

  if (error) {
    console.error('[GARDE IA] Erreur quota:', error);
    return { ok: false, status: 500, message: 'Erreur serveur. Réessaie.' };
  }

  if (nbAppels > QUOTA_JOUR) {
    return {
      ok: false,
      status: 429,
      message: `Tu as atteint ta limite de ${QUOTA_JOUR} générations aujourd'hui. Reviens demain !`,
    };
  }

  return { ok: true, userId: user.id };
}