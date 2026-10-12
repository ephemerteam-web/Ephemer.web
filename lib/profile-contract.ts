// 👤 Une saisie commune ; les anciennes projections Univers restent compatibles.
import { monUniversCadeaux, type MonUniversCadeaux, IA_CADEAUX_VIDE } from './cadeaux-social-contract'
import { apercuUnivers, type UniversPartage } from './univers-contract'
import { uuidEtoile } from './etoiles-contract'
import { parisDay } from './calendar-day'
import { GROUPES_INTERETS } from '@/app/invitation/[token]/interets'

export type ProfilUnifie = MonUniversCadeaux & {
  prenom: string; nom: string; indicatif: string; tel: string
  partageActif: boolean; partageNom: boolean; empreinte: string
}
export type CommandeProfil = { action: 'enregistrer'; revision: number; operation: string; donnees: Omit<ProfilUnifie, 'revision'> }
const keys = ['revision','modeIdentite','identite','valeurs','partage','iaCadeaux','prenom','nom','indicatif','tel','partageActif','partageNom','empreinte']
function text(v: unknown, limit: number) {
  if (typeof v !== 'string' || Array.from(v).length > limit || /[\u0000-\u001f\u007f]/u.test(v)) throw new Error('Identité ou coordonnées invalides.')
  return v
}
export function profilUnifie(value: unknown): ProfilUnifie {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Profil invalide.')
  const row = value as Record<string, unknown>
  if (Object.keys(row).length !== keys.length || Object.keys(row).some(k => !keys.includes(k))) throw new Error('Champs du profil invalides.')
  const base = monUniversCadeaux({ revision: row.revision, modeIdentite: row.modeIdentite, identite: row.identite, valeurs: row.valeurs, partage: row.partage, iaCadeaux: row.iaCadeaux })
  const prenom = text(row.prenom,80), nom = text(row.nom,80), indicatif = text(row.indicatif,8), tel = text(row.tel,31)
  if (!/^\+[0-9]{0,7}$/u.test(indicatif) || !/^[0-9]*$/u.test(tel) || base.valeurs.telephone !== (tel ? indicatif + tel : '')) throw new Error('Vérifie le téléphone et son indicatif.')
  if (typeof row.partageActif !== 'boolean' || typeof row.partageNom !== 'boolean' || typeof row.empreinte !== 'string' || !/^[a-f0-9]{64}$/u.test(row.empreinte)) throw new Error('Permissions ou version du profil invalides.')
  if (!row.partageActif && Object.values(base.iaCadeaux).some(Boolean)) throw new Error('L’IA exige un partage actif et un accord distinct.')
  if (base.modeIdentite === 'prenom' && prenom.trim() && base.identite !== prenom.trim()) throw new Error('L’identité sociale doit reprendre ton prénom.')
  return { ...base, prenom, nom, indicatif, tel, partageActif: row.partageActif, partageNom: row.partageNom, empreinte: row.empreinte }
}
export function commandeProfil(value: CommandeProfil): CommandeProfil {
  if (Object.keys(value).sort().join(',') !== 'action,donnees,operation,revision' || value.action !== 'enregistrer') throw new Error('Commande du profil invalide.')
  const row = profilUnifie({ ...value.donnees, revision: value.revision })
  if (!row.prenom.trim()) throw new Error('Renseigne ton prénom.')
  if (row.revision === Number.MAX_SAFE_INTEGER) throw new Error('Limite de version atteinte.')
  const b = row.valeurs.anniversaire
  if (b?.annee && `${String(b.annee).padStart(4,'0')}-${String(b.mois).padStart(2,'0')}-${String(b.jour).padStart(2,'0')}` > parisDay()) throw new Error('La naissance ne peut pas être dans le futur.')
  const { revision, ...donnees } = row
  return { action: 'enregistrer', revision, operation: uuidEtoile(value.operation), donnees: { ...donnees,prenom:row.prenom.trim() } }
}
export function profilAvecPartage(value: ProfilUnifie, actif: boolean): ProfilUnifie {
  return { ...value, partageActif: actif, iaCadeaux: actif ? value.iaCadeaux : { ...IA_CADEAUX_VIDE } }
}
// Proposition de formulaire uniquement : aucune permission distante n'est changée avant l'enregistrement.
export function profilToutAutorise(value: ProfilUnifie): ProfilUnifie {
  const anniversaire = value.valeurs.anniversaire
  return { ...value, partageActif: true, partageNom: true,
    partage: { presentation: true, passions: true, plaisirs: true, eviter: true, email: true, telephone: true, avatar: true,
      anniversaire: !!anniversaire, annee: anniversaire?.annee != null },
    iaCadeaux: { identite: true, presentation: true, passions: true, plaisirs: true, eviter: true } }
}
export function apercuProfil(value: ProfilUnifie, avatar: unknown = null): UniversPartage {
  const owner = profilUnifie(value)
  const preview = apercuUnivers({ revision: owner.revision, modeIdentite: owner.modeIdentite, identite: owner.identite, valeurs: owner.valeurs,
    partage: owner.partageActif ? owner.partage : Object.fromEntries(Object.keys(owner.partage).map(k => [k,false])) as ProfilUnifie['partage'] },avatar)
  if (owner.partageActif && owner.partageNom && owner.nom.trim()) preview.champs.nom = owner.nom
  return preview
}
const interests = new Set<string>(GROUPES_INTERETS.flatMap(g => g.items))
export function passionsProfil(value: string) {
  const parts = value.split(', ').filter(Boolean)
  return { interets: parts.filter(p => interests.has(p)), libre: parts.filter(p => !interests.has(p)).join(', ') }
}
export function reunirPassions(interets: string[], libre: string) { return [...interets,libre.trim()].filter(Boolean).join(', ') }
