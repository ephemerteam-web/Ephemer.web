"use client"
import { useDashboardUser } from '@/components/DashboardUserContext'
import { useRequestLifetime } from '@/lib/hooks/useRequestLifetime'
import LoadFailure from '@/components/LoadFailure'
import { createRequestScope } from '@/lib/request-scope'
import { readAllResult } from '@/lib/pagination';
import { AI_NOTICE, minimalAIInput } from "@/lib/ai-privacy";
import { usableGiftIdeas } from '@/lib/gift-ideas';
import { normalizeOccasion } from '@/lib/constants';

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AppSelect from "@/components/AppSelect";
import {
  TYPES_EVENEMENT,
} from "@/lib/constants";
import { useDrawer } from "@/components/DrawerContext";
import {
  marchandsPourCategorie,
  getCategorieById,
  type CategorieCadeau,
} from "@/lib/gift-config";

// ============================================================
// 📌 TYPES
// ============================================================
type Contact = Pick<import('@/types/database').Contact, 'id' | 'prenom' | 'nom' | 'relation' | 'date_naissance' | 'email' | 'note' | 'est_favori' | 'telephone_indicatif' | 'telephone_numero'>;


type Idea = {
  idee: string;
  raison: string;
  categorie: CategorieCadeau;
  recherche: string;
  emoji?: string;
};

const CATEGORIE_STYLES: Record<CategorieCadeau, { borderColor: string; gradient: string }> = {
  loisir: {
    borderColor: "border-[#7C3AED]/70",
    gradient: "from-[#53257F]/40 to-surface/20",
  },
  bien_etre: {
    borderColor: "border-[#0F766E]/70",
    gradient: "from-[#134E4A]/40 to-canvas/20",
  },
  tech: {
    borderColor: "border-[#0284C7]/70",
    gradient: "from-[#0369A1]/40 to-canvas/20",
  },
  decoration: {
    borderColor: "border-[#BE123C]/70",
    gradient: "from-[#9D174D]/40 to-surface/20",
  },
  gourmand: {
    borderColor: "border-[#EA580C]/70",
    gradient: "from-[#C2410C]/40 to-surface/20",
  },
};

// ============================================================
// 🎴 COMPOSANT FLIP CARD (Le cœur du design)
// ============================================================
function FlipCard({ idea }: { idea: Idea; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const changed = useRef(false);
  const [isFlipped, setIsFlipped] = useState(false);
  useEffect(() => {
    if (!changed.current) return;
    cardRef.current?.querySelector<HTMLElement>('[aria-hidden="false"] button')?.focus();
  }, [isFlipped]);
  const marchands = marchandsPourCategorie(idea.categorie);
  const categorie = getCategorieById(idea.categorie);

  // Couleurs dynamiques selon la catégorie (fallback si non trouvé)
  const { borderColor, gradient } =
    CATEGORIE_STYLES[idea.categorie] ?? {
      borderColor: "border-line",
      gradient: "from-ink/5 to-ink/10",
    };

  return (
    <div
      ref={cardRef} className="group h-[250px] sm:h-[280px] cursor-pointer perspective-1000"
    >
      <div
        className={`
          relative w-full h-full transition-all duration-700
          [transform-style:preserve-3d]
          ${isFlipped ? "[transform:rotateY(180deg)]" : ""}
        `}
      >
        {/* ─── RECTO : L'idée visuelle ─── */}
        <div aria-hidden={isFlipped} inert={isFlipped}
          className={`
            absolute inset-0 rounded-2xl border ${borderColor}
            bg-gradient-to-br from-surface to-canvas
            backdrop-blur-md
            [backface-visibility:hidden]
            flex flex-col items-center justify-center p-6 text-center
            shadow-lg
          `}
        >
          {/* Effet de brillance interne */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-action/50 to-transparent opacity-50" />
          
          <span className="text-5xl mb-4 drop-shadow-md filter transition-transform duration-500 group-hover:scale-110">
            {idea.emoji || "🎁"}
          </span>
          
          <h3 className="text-ink font-bold text-lg leading-tight mb-2 line-clamp-2">
            {idea.idee}
          </h3>
          
          {categorie && (
            <span className={`
              inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
              bg-ink/5 border border-line text-muted
            `}>
              {categorie.emoji} {categorie.nom}
            </span>
          )}

          <button type="button" onClick={() => { changed.current = true; setIsFlipped(true) }} aria-expanded={isFlipped} className="mt-3 p-2 rounded-lg border border-line text-sm">Voir les détails de {idea.idee}</button>
        </div>

        {/* ─── VERSO : Détails + Actions ─── */}
        <div aria-hidden={!isFlipped} inert={!isFlipped}
          className={`
            absolute inset-0 rounded-2xl border ${borderColor}
            bg-gradient-to-br ${gradient}
            backdrop-blur-xl
            [backface-visibility:hidden]
            [transform:rotateY(180deg)]
            flex flex-col p-4
            shadow-2xl
            overflow-hidden
          `}
        >
          {/* Lumière décorative d'ambiance */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-ink/5 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/20 rounded-full blur-2xl" />

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            <p className="text-success text-sm leading-relaxed italic mb-4">
              &quot;{idea.raison}&quot;
            </p>
            
            {/* Liste des marchands */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted uppercase tracking-wider">
                Où trouver ça ?
              </p>
              <div className="flex flex-wrap gap-2">
                {marchands.slice(0, 3).map((m) => (
                  <a
                    key={m.id}
                    href={m.url(idea.recherche)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()} // Empêche la carte de se retourner au clic sur le lien
                    className={`
                      inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition
                      hover:scale-105 active:scale-95 shadow-md
                      ${m.couleur}
                    `}
                  >
                    <span>{m.emoji}</span>
                    {m.nom}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Bouton retour (optionnel pour UX mobile) */}
          <button 
            className="mt-auto w-full py-2 text-center text-xs text-muted hover:text-ink transition"
            onClick={(e) => {
              e.stopPropagation();
              changed.current = true; setIsFlipped(false);
            }}
          >
            ← Revenir à l&apos;idée
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 🎨 COMPOSANT PRINCIPAL
// ============================================================
function GiftIdeasForm() {
  // ---------------------------
  // HOOKS & STATES
  // ---------------------------
  const lifetime = useRequestLifetime();
  const searchParams = useSearchParams();
  const { ouvrirDrawer } = useDrawer();

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const user = useDashboardUser();
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [contactListOpen, setContactListOpen] = useState(false);
  const [searchContact, setSearchContact] = useState("");

  const [eventType, setEventType] = useState("anniversaire");

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  // ---------------------------
  // FONCTIONS
  // ---------------------------
  function appliquerContact(contact: Contact) {
    setSelectedContact(contact);
    setEventType("anniversaire");
  }

  const handleEditContact = () => {
    if (selectedContact) {
      ouvrirDrawer({
        id: String(selectedContact.id),
        prenom: selectedContact.prenom,
        nom: selectedContact.nom,
        date_naissance: selectedContact.date_naissance,
        relation: selectedContact.relation,
        email: selectedContact.email ?? null,
        note: selectedContact.note ?? null,
        est_favori: selectedContact.est_favori ?? null,
        telephone_indicatif: selectedContact.telephone_indicatif ?? null,
        telephone_numero: selectedContact.telephone_numero ?? null,
      });
    }
  };


  async function handleGenerate() {
    const scope = lifetime.current;
    if (loading) return;
    if (!selectedContact) {
      setError("Merci de sélectionner un contact.");
      return;
    }

    setLoading(true);
    setError("");
    setIdeas([]);

    try {


      // 👇 Récupérer le token de session AVANT l'appel
const { data: { session } } = await supabase.auth.getSession();

if (!scope.current()) return;
if (!session || session.user.id !== user.id) {
  setError("Ta session a expiré. Reconnecte-toi pour continuer.");
  setLoading(false);
  return;
}

const res = await fetch("/api/generate-gift-ideas", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.access_token}`, // 👈 AJOUT CRITIQUE
  },
  credentials: "include",
  body: JSON.stringify(minimalAIInput({ relation: selectedContact.relation || 'ami', eventType })),
      });

      const data = await res.json();
      if (!scope.current()) return;

      if (!res.ok) {
        console.error("=== RÉPONSE API EN ERREUR ===");
        console.error("Status HTTP :", res.status);
        console.error("Données reçues :", JSON.stringify(data, null, 2));
        throw new Error(
          data.error || 
          data.message || 
          `Erreur serveur (${res.status})`
        );
      }

      const usable = usableGiftIdeas(data.ideas);
      if (!usable.length) throw new Error('Aucune idée utilisable reçue. Réessaie.');
      setIdeas(usable as Idea[]);
    } catch (err) {
      if (!scope.current()) return;
      const errorMessage = err instanceof Error ? err.message : "Impossible de générer les idées.";
      setError(errorMessage);
      console.error("=== ERREUR handleGenerate ===");
      console.error("Message :", errorMessage);
      console.error("Erreur complète :", err);
    } finally {
      if (scope.current()) setLoading(false);
    }
  }

  // ---------------------------
  // EFFETS
  // ---------------------------
  useEffect(() => {
    const scope = createRequestScope();
    async function loadContactsAndPrefill() {

      const { data, error } = await readAllResult(() => supabase
        .from("contacts")
        .select("id, prenom, nom, relation, date_naissance, email, note, est_favori, telephone_indicatif, telephone_numero")
        .eq("user_id", user.id));

      if (!scope.current()) return;
      if (error) {
        setContactsError("Impossible de charger tes contacts. Réessaie.");
        console.warn("Erreur chargement contacts:", error);
        return;
      }

      setContacts((data ?? []).sort((a,b) => (a.prenom || "").localeCompare(b.prenom || "", "fr")));

      const contactIdFromUrl = searchParams.get("contactId");
      const eventTypeFromUrl = searchParams.get("eventType");

      if (contactIdFromUrl && data) {
        const contactTrouve = data.find((c) => String(c.id) === contactIdFromUrl);
        if (contactTrouve) appliquerContact(contactTrouve);
      }
      if (eventTypeFromUrl) setEventType(normalizeOccasion(eventTypeFromUrl));
    }

    void loadContactsAndPrefill().catch(() => {
      if (scope.current()) setContactsError('Impossible de charger tes contacts. Réessaie.');
    }).finally(() => { if (scope.current()) setContactsLoading(false); });
    return scope.cancel;
  }, [searchParams, user.id, attempt]);

  const contactsFiltres = contacts.filter((contact) =>
    `${contact.prenom} ${contact.nom} ${contact.relation}`
      .toLowerCase()
      .includes(searchContact.toLowerCase())
  );

  // ---------------------------
  // RENDU
  // ---------------------------
  if (contactsError) return <LoadFailure message={contactsError} retry={() => { setContactsError(''); setContactsLoading(true); setAttempt(value => value + 1); }} />;
  if (contactsLoading) return <p className="p-6" role="status">Chargement des contacts…</p>;
  return (
    <div className="min-h-screen bg-canvas text-ink relative overflow-hidden font-sans selection:bg-action selection:text-on-action">
      {/* ── Arrière-plan décoratif ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-action/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 relative z-10">
        
        {/* ── Titre ── */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-action via-action to-action bg-clip-text text-transparent mb-3 drop-shadow-sm">
            🎁 Idées Cadeaux
          </h1>
          <p className="text-sm md:text-base text-muted max-w-lg mx-auto leading-relaxed">
            Trouve le cadeau parfait en quelques secondes pour{" "}
            <span className="text-accent font-medium">chaque personne</span> importante.
          </p>
        </div>

        {/* ── Layout Principal : Stack Mobile / Grid Desktop ── */}
        <div className="flex flex-col md:grid md:grid-cols-5 gap-6 md:gap-8 items-start">
          
          {/* =============================================== */}
          {/* COLONNE GAUCHE : FORMULAIRE (2/5)               */}
          {/* =============================================== */}
          <div className="w-full md:col-span-2 space-y-6 order-1">
            
            {/* Carte Formulaire */}
            <div className="bg-ink/[0.03] backdrop-blur-xl border border-line rounded-3xl p-5 md:p-6 shadow-2xl">
              
              {/* Étape 1 : Contact */}
              <div className="mb-6">
                <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-action/20 border border-accent/40 flex items-center justify-center text-[10px] text-accent">1</span>
                  Sélectionner un contact
                </h2>

                {/* Barre de recherche */}
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Rechercher un prénom..."
                    value={searchContact}
                    onChange={(e) => {
                      setSearchContact(e.target.value);
                      if (e.target.value.trim() !== "") setContactListOpen(true);
                    }}
                    className="w-full border border-line rounded-xl pl-4 pr-10 py-3 text-sm bg-ink/5 text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/30 transition-all"
                  />
                  {searchContact && (
                    <button
                      type="button"
                      onClick={() => { setSearchContact(""); setContactListOpen(false); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink w-6 h-6 flex items-center justify-center rounded-full hover:bg-ink/10"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Liste déroulante */}
                {!selectedContact && contactListOpen && (
                  <div className="mt-2 max-h-[200px] overflow-y-auto rounded-xl border border-line bg-canvas shadow-xl z-20 relative">
                    {contactsFiltres.length > 0 ? (
                      contactsFiltres.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => {
                            appliquerContact(contact);
                            setSearchContact("");
                            setContactListOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-ink/5 active:bg-ink/10 transition border-b border-line last:border-0"
                        >
                          <div>
                            <div className="font-medium text-ink text-sm">{contact.prenom} {contact.nom}</div>
                            <div className="text-xs text-muted capitalize">{contact.relation}</div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-muted">Aucun résultat</div>
                    )}
                  </div>
                )}

                {/* Badge Contact Sélectionné */}
                {selectedContact && (
                  <div className="bg-action/10 border border-accent/30 rounded-xl p-3 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-sm truncate">
                        {selectedContact.prenom} {selectedContact.nom}
                      </div>
                      <div className="text-xs text-accent/80 capitalize truncate">
                        {selectedContact.relation}
                      </div>
                      {selectedContact.note && (
                        <div className="text-[10px] text-muted mt-1 italic truncate max-w-[180px]">
                          &quot;{selectedContact.note}&quot;
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-2">
                       <button
                        onClick={handleEditContact}
                        className="p-1.5 rounded-lg bg-ink/10 hover:bg-ink/20 text-muted transition"
                        title="Modifier"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => {
                          setSelectedContact(null);
                          setSearchContact("");
                        }}
                        className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-danger transition"
                        title="Changer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Étape 2 : Occasion */}
              <div>
                <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] text-success">2</span>
                  Type d&apos;événement
                </h2>
                
                <AppSelect
                  options={TYPES_EVENEMENT.map((t) => ({ value: t.value, label: t.label }))}
                  value={eventType}
                  onChange={setEventType}
                />


              </div>

              {/* Bouton Générer */}
              <p className="text-sm text-muted mb-3">{AI_NOTICE}</p>
              <button
                onClick={handleGenerate}
                disabled={loading || !selectedContact}
                className="w-full mt-6 relative group overflow-hidden bg-gradient-to-r from-action to-action text-on-action font-bold py-3.5 rounded-xl shadow-lg shadow-[#C8A84E]/20 hover:shadow-[#C8A84E]/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-ink/30 to-transparent" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="animate-spin text-lg">✨</span>
                      Recherche en cours...
                    </>
                  ) : (
                    <>
                      🎁 Trouver des idées
                    </>
                  )}
                </span>
              </button>

              {error && (
                <div role="alert" className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-danger flex items-start gap-2 animate-in fade-in">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* =============================================== */}
          {/* COLONNE DROITE : RÉSULTATS (3/5)                */}
          {/* =============================================== */}
          <div className="w-full md:col-span-3 min-h-[400px] order-2">
            
            {/* Header Résultats */}
            {ideas.length > 0 && (
              <div className="flex items-end justify-between mb-6 px-1 border-b border-line pb-4">
                <div>
                  <p className="text-xs text-accent font-bold uppercase tracking-widest mb-1">Sélection</p>
                  <h3 className="text-xl font-bold text-ink">
                    {ideas.length} pépites pour {selectedContact?.prenom}
                  </h3>
                </div>
                <p className="text-xs text-muted hidden sm:block">
                  Tap pour retourner la carte
                </p>
              </div>
            )}

            {/* Grille de Cartes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
              {ideas.map((idea, index) => (
                <FlipCard key={index} idea={idea} index={index} />
              ))}
            </div>

            {/* État Vide (Initial) */}
            {!loading && ideas.length === 0 && !error && (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-60">
                <div className="w-24 h-24 bg-ink/5 rounded-full flex items-center justify-center text-5xl mb-4 animate-[float_3s_ease-in-out_infinite]">
                  🎁
                </div>
                <p className="text-muted text-sm max-w-xs">
                  Remplis le formulaire à gauche pour découvrir des idées sur mesure.
                </p>
              </div>
            )}

            {/* État Chargement (Skeletons) */}
            {loading && (
              <div className="space-y-6">
                <div className="animate-pulse flex items-center gap-2 px-1 mb-4">
                  <div className="w-20 h-4 bg-ink/10 rounded"></div>
                  <div className="w-32 h-4 bg-ink/10 rounded"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-[250px] bg-ink/5 rounded-2xl border border-line animate-pulse"></div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 📦 EXPORT
// ============================================================
export default function GiftIdeasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] bg-canvas">
          <div className="flex flex-col items-center gap-4">
            <span className="text-4xl animate-bounce">🎁</span>
            <p className="text-muted text-sm">Chargement de l&apos;application...</p>
          </div>
        </div>
      }
    >
      <GiftIdeasForm />
    </Suspense>
  );
}
