// ⭐ Entrées et projections fermées du lot 10A, indépendantes du transport.
export const ETOILES_VUES = ["actives", "recues", "envoyees", "bloquees", "liens"] as const;
export type EtoilesVue = (typeof ETOILES_VUES)[number];
export type CommandeEtoile =
  | { action: "demander"; donnees: { email: string }; operation: string }
  | { action: "demander_contact"; donnees: { contactId: string }; operation: string }
  | { action: "demander_lien"; donnees: { token: string }; operation: string }
  | { action: "accepter" | "refuser" | "annuler"; donnees: { demandeId: string }; operation: string }
  | { action: "retirer" | "bloquer" | "debloquer"; donnees: { etoileId: string }; operation: string }
  | { action: "creer_lien"; donnees: Record<string, never>; operation: string }
  | { action: "revoquer_lien"; donnees: { lienId: string }; operation: string }
  | { action: "associer_contact"; donnees: { contactId: string; etoileId: string }; operation: string };

// Projections sociales installées, distinctes des tables Supabase publiques.
export type Etoile = {
  id: string; etoile_id: string; identite: string;
  origine: "reciproque" | "demande"; created_at: string; revision: number;
};
export type DemandeEtoile =
  | { id: string; auteur_id: string; identite: string; created_at: string; expires_at: string }
  | { id: string; adresse_cible: string; etat: "en_attente" | "acceptee" | "refusee" | "annulee" | "expiree"; created_at: string; expires_at: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;

function objet(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Commande invalide.");
  return value as Record<string, unknown>;
}
function cles(value: Record<string, unknown>, wanted: string[]) {
  const actual = Object.keys(value).sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== [...wanted].sort()[index])) {
    throw new Error("Champs invalides.");
  }
}
function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new Error("Identifiant invalide.");
  return value.toLowerCase();
}
export function contactIdEtoile(value: unknown): string {
  // Les bigint restent des chaînes jusqu'à PostgreSQL, sans conversion Number.
  if (typeof value !== "string" || !/^[1-9][0-9]{0,18}$/.test(value) || BigInt(value) > BigInt("9223372036854775807")) {
    throw new Error("Identifiant de contact invalide.");
  }
  return value;
}
export function emailEtoile(value: unknown): string {
  if (typeof value !== "string") throw new Error("Adresse invalide.");
  const email = value.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, "").toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) throw new Error("Adresse invalide.");
  return email;
}
export function commandeEtoile(value: unknown): CommandeEtoile {
  const body = objet(value);
  cles(body, ["action", "donnees", "operation"]);
  const operation = uuid(body.operation), data = objet(body.donnees);
  // Le lecteur HTTP limite aussi le corps brut avant JSON.parse.
  if (new TextEncoder().encode(JSON.stringify(data)).byteLength > 2048) throw new Error("Commande trop longue.");
  const action = body.action;
  if (action === "demander") {
    cles(data, ["email"]);
    return { action, operation, donnees: { email: emailEtoile(data.email) } };
  }
  if (action === "demander_contact") {
    cles(data, ["contactId"]);
    return { action, operation, donnees: { contactId: contactIdEtoile(data.contactId) } };
  }
  if (action === "demander_lien") {
    cles(data, ["token"]);
    if (typeof data.token !== "string" || !TOKEN.test(data.token)) throw new Error("Lien indisponible.");
    return { action, operation, donnees: { token: data.token } };
  }
  if (action === "accepter" || action === "refuser" || action === "annuler") {
    cles(data, ["demandeId"]);
    return { action, operation, donnees: { demandeId: uuid(data.demandeId) } };
  }
  if (action === "retirer" || action === "bloquer" || action === "debloquer") {
    cles(data, ["etoileId"]);
    return { action, operation, donnees: { etoileId: uuid(data.etoileId) } };
  }
  if (action === "creer_lien") {
    cles(data, []);
    return { action, operation, donnees: {} };
  }
  if (action === "revoquer_lien") {
    cles(data, ["lienId"]);
    return { action, operation, donnees: { lienId: uuid(data.lienId) } };
  }
  if (action === "associer_contact") {
    cles(data, ["contactId", "etoileId"]);
    return { action, operation, donnees: { contactId: contactIdEtoile(data.contactId), etoileId: uuid(data.etoileId) } };
  }
  throw new Error("Commande inconnue.");
}

export function lectureEtoiles(value: unknown): { vue: EtoilesVue; apres: string | null; limite: number } {
  const data = objet(value);
  cles(data, ["vue", "apres", "limite"]);
  if (!ETOILES_VUES.some(view => view === data.vue) || typeof data.limite !== "number" || !Number.isInteger(data.limite)
      || data.limite < 1 || data.limite > 100) throw new Error("Lecture invalide.");
  return { vue: data.vue as EtoilesVue, apres: data.apres === null ? null : uuid(data.apres), limite: data.limite };
}

export type DemandeRecue = Extract<DemandeEtoile, { auteur_id: string }>;
export type DemandeEnvoyee = Extract<DemandeEtoile, { adresse_cible: string }>;
export type EtoileBloquee = { id: string; created_at: string };
export type LienEtoile = { id: string; created_at: string; expires_at: string; revoque: boolean };
export type AssociationEtoile = { contact_id: string; etoile_id: string; relation_id: string };
export type EtoilesRows = { actives: Etoile; recues: DemandeRecue; envoyees: DemandeEnvoyee; bloquees: EtoileBloquee; liens: LienEtoile; associations: AssociationEtoile };
export type ResultatEtoile = { ok: true; message?: string; relationId?: string; lienId?: string; expiresAt?: string; token?: string };
export const ETOILES_EXPORT_VUES = ['relations', 'demandes', 'blocages', 'liens', 'associations'] as const;
export type EtoilesExportVue = (typeof ETOILES_EXPORT_VUES)[number];
export function uuidEtoile(value: unknown) { return uuid(value); }
export function tokenEtoile(value: unknown): string {
  if (typeof value !== 'string' || !TOKEN.test(value)) throw new Error('Lien indisponible.');
  return value;
}
function texte(value: unknown, max = 320): string {
  if (typeof value !== 'string' || Array.from(value).length > max) throw new Error('Réponse indisponible.');
  return value;
}
function date(value: unknown): string {
  const result = texte(value, 64);
  if (!Number.isFinite(Date.parse(result))) throw new Error('Date indisponible.');
  return result;
}
function choix<T extends string>(value: unknown, values: readonly T[]): T {
  if (!values.includes(value as T)) throw new Error('État indisponible.');
  return value as T;
}
function booleen(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Réponse indisponible.');
  return value;
}
function items(value: unknown): Record<string, unknown>[] {
  const data = objet(value);
  if (!Array.isArray(data.items) || data.items.length > 100) throw new Error('Lecture indisponible.');
  return data.items.map(objet);
}
// Ne jamais transmettre un résultat RPC brut : seules ces colonnes sont projetées.
export function etoilesItems<V extends keyof EtoilesRows>(value: unknown, vue: V): EtoilesRows[V][] {
  return items(value).map(row => {
    if (vue === 'associations') return { contact_id: contactIdEtoile(row.contact_id), etoile_id: uuid(row.etoile_id), relation_id: uuid(row.relation_id) };
    const base = { id: uuid(row.id), created_at: date(row.created_at) };
    if (vue === 'actives') {
      if (!Number.isSafeInteger(row.revision) || (row.revision as number) < 1) throw new Error('Révision indisponible.');
      return { ...base, etoile_id: uuid(row.etoile_id), identite: texte(row.identite, 80), origine: choix(row.origine, ['reciproque', 'demande']), revision: row.revision as number };
    }
    if (vue === 'recues') return { ...base, auteur_id: uuid(row.auteur_id), identite: texte(row.identite, 80), expires_at: date(row.expires_at) };
    if (vue === 'envoyees') return { ...base, adresse_cible: texte(row.adresse_cible), etat: choix(row.etat, ['en_attente', 'acceptee', 'refusee', 'annulee', 'expiree']), expires_at: date(row.expires_at) };
    if (vue === 'liens') return { ...base, expires_at: date(row.expires_at), revoque: booleen(row.revoque) };
    return base;
  }) as EtoilesRows[V][];
}
export function resultatEtoile(value: unknown, action: CommandeEtoile['action']): ResultatEtoile {
  const data = objet(value);
  if (data.ok !== true) throw new Error('Opération indisponible.');
  if (action.startsWith('demander')) return { ok: true, message: 'Demande enregistrée.' };
  if (action === 'accepter') return { ok: true, relationId: uuid(data.relationId) };
  if (action === 'creer_lien') return { ok: true, lienId: uuid(data.lienId), expiresAt: date(data.expiresAt), ...(data.token === undefined ? {} : { token: tokenEtoile(data.token) }) };
  return { ok: true };
}
export function reconnaissanceEtoiles(value: unknown): { ok: true; nouvelles: number; apres: string | null } {
  const data = objet(value);
  if (data.ok !== true || !Number.isInteger(data.nouvelles) || (data.nouvelles as number) < 0) throw new Error('Reconnaissance indisponible.');
  return { ok: true, nouvelles: data.nouvelles as number, apres: data.apres === null ? null : contactIdEtoile(data.apres) };
}
export function exportEtoilesItems(value: unknown, vue: EtoilesExportVue): Record<string, unknown>[] {
  return items(value).map(row => {
    if (vue === 'associations') return { contact_id: contactIdEtoile(row.contact_id), etoile_id: uuid(row.etoile_id) };
    const base = { id: uuid(row.id), created_at: date(row.created_at) };
    if (vue === 'relations') return { ...base, etoile_id: uuid(row.etoile_id), etat: choix(row.etat, ['active', 'retiree']), origine: choix(row.origine, ['reciproque', 'demande']), updated_at: date(row.updated_at) };
    if (vue === 'demandes') {
      const direction = choix(row.direction, ['envoyee', 'recue']);
      return { ...base, direction, adresse_cible: direction === 'envoyee' ? texte(row.adresse_cible) : null,
        auteur_id: direction === 'recue' ? uuid(row.auteur_id) : null, etat: choix(row.etat, ['en_attente', 'acceptee', 'refusee', 'annulee', 'expiree']), expires_at: date(row.expires_at) };
    }
    if (vue === 'liens') return { ...base, expires_at: date(row.expires_at), revoque: booleen(row.revoque) };
    return base;
  });
}
