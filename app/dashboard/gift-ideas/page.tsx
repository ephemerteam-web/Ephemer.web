"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase-browser";
import AppSelect from "@/components/AppSelect";
import { TypeEvenement, calculerDateEvenement, formaterDateFR, calculerDatesJ7J1JourJ } from "@/lib/date-utils";
import {
  TYPES_RELATION,
  TYPES_EVENEMENT,
  EVENT_TYPE_MAP,
  necessiteDateManuelle,
} from "@/lib/constants";
import { useDrawer } from "@/components/DrawerContext";
import {
  CATEGORIES_CADEAU,
  marchandsPourCategorie,
  getCategorieById,
  type CategorieCadeau,
} from "@/lib/gift-config";

// ============================================================
// 📌 TYPES
// ============================================================
type Contact = {
  id: number;
  prenom: string;
  nom: string;
  relation: string;
  date_naissance: string | null;
  email?: string | null;
  note?: string | null;
  est_favori?: boolean;
  telephone_indicatif?: string | null;
  telephone_numero?: string | null;
};

type DatesPossibles = {
  jourJ: Date;
  j1: Date;
  j7: Date;
};

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
    gradient: "from-[#53257F]/40 to-[#1F2937]/20",
  },
  bien_etre: {
    borderColor: "border-[#0F766E]/70",
    gradient: "from-[#134E4A]/40 to-[#0F172A]/20",
  },
  tech: {
    borderColor: "border-[#0284C7]/70",
    gradient: "from-[#0369A1]/40 to-[#0F172A]/20",
  },
  decoration: {
    borderColor: "border-[#BE123C]/70",
    gradient: "from-[#9D174D]/40 to-[#111827]/20",
  },
  gourmand: {
    borderColor: "border-[#EA580C]/70",
    gradient: "from-[#C2410C]/40 to-[#111827]/20",
  },
};

// ============================================================
// 🎴 COMPOSANT FLIP CARD (Le cœur du design)
// ============================================================
function FlipCard({ idea, index }: { idea: Idea; index: number }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const marchands = marchandsPourCategorie(idea.categorie);
  const categorie = getCategorieById(idea.categorie);

  // Couleurs dynamiques selon la catégorie (fallback si non trouvé)
  const { borderColor, gradient } =
    CATEGORIE_STYLES[idea.categorie] ?? {
      borderColor: "border-white/10",
      gradient: "from-white/5 to-white/10",
    };

  return (
    <div
      className="group h-[250px] sm:h-[280px] cursor-pointer perspective-1000"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        className={`
          relative w-full h-full transition-all duration-700
          [transform-style:preserve-3d]
          ${isFlipped ? "[transform:rotateY(180deg)]" : ""}
        `}
      >
        {/* ─── RECTO : L'idée visuelle ─── */}
        <div
          className={`
            absolute inset-0 rounded-2xl border ${borderColor}
            bg-gradient-to-br from-[#162035] to-[#0f1524]
            backdrop-blur-md
            [backface-visibility:hidden]
            flex flex-col items-center justify-center p-6 text-center
            shadow-lg
          `}
        >
          {/* Effet de brillance interne */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C8A84E]/50 to-transparent opacity-50" />
          
          <span className="text-5xl mb-4 drop-shadow-md filter transition-transform duration-500 group-hover:scale-110">
            {idea.emoji || "🎁"}
          </span>
          
          <h3 className="text-white font-bold text-lg leading-tight mb-2 line-clamp-2">
            {idea.idee}
          </h3>
          
          {categorie && (
            <span className={`
              inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
              bg-white/5 border border-white/10 text-white/70
            `}>
              {categorie.emoji} {categorie.nom}
            </span>
          )}

          {/* Indication Tactile / Souris */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] text-white/30">
            <span className="inline-block animate-pulse">👆</span>
            <span className="hidden sm:inline">survoler</span>
            <span className="sm:hidden">tap pour voir</span>
          </div>
        </div>

        {/* ─── VERSO : Détails + Actions ─── */}
        <div
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
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/20 rounded-full blur-2xl" />

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            <p className="text-emerald-200/90 text-sm leading-relaxed italic mb-4">
              "{idea.raison}"
            </p>
            
            {/* Liste des marchands */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider">
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
            className="mt-auto w-full py-2 text-center text-xs text-white/40 hover:text-white transition"
            onClick={(e) => {
              e.stopPropagation();
              setIsFlipped(false);
            }}
          >
            ← Revenir à l'idée
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
  const searchParams = useSearchParams();
  const { ouvrirDrawer } = useDrawer();
  const supabase = getSupabaseClient();

  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [session, setSession] = useState<any | null>(null);
  const [contactListOpen, setContactListOpen] = useState(false);
  const [searchContact, setSearchContact] = useState("");

  const [eventType, setEventType] = useState("anniversaire");
  const [eventDate, setEventDate] = useState<string>("");
  const [eventDescription, setEventDescription] = useState<string>("");

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const needsManualDate = necessiteDateManuelle(eventType);

  // ---------------------------
  // FONCTIONS
  // ---------------------------
  function appliquerContact(contact: Contact) {
    setSelectedContactId(String(contact.id));
    setSelectedContact(contact);
    setEventType("anniversaire");
    setEventDate("");
    setEventDescription("");
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

  const refreshContacts = async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("contacts")
      .select("id, prenom, nom, relation, date_naissance, email, note, est_favori, telephone_indicatif, telephone_numero")
      .eq("user_id", session.user.id)
      .order("prenom");

    if (!error && data) {
      setContacts(data as Contact[]);
      if (selectedContactId) {
        const updated = data.find((c) => String(c.id) === selectedContactId);
        if (updated) appliquerContact(updated as Contact);
      }
    }
  };

  async function handleGenerate() {
    if (!selectedContact) {
      setError("Merci de sélectionner un contact.");
      return;
    }

    setLoading(true);
    setError("");
    setIdeas([]);

    try {
      const age = selectedContact.date_naissance
        ? Math.floor(
            (new Date().getTime() - new Date(selectedContact.date_naissance).getTime()) /
              31557600000
          )
        : null;

      // 👇 Récupérer le token de session AVANT l'appel
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
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
  body: JSON.stringify({
          firstName: selectedContact.prenom,
          lastName: selectedContact.nom,
          dateNaissance: selectedContact.date_naissance,
          age,
          relation: selectedContact.relation || "ami",
          email: selectedContact.email,
          estFavori: selectedContact.est_favori,
          telephoneIndicatif: selectedContact.telephone_indicatif,
          telephoneNumero: selectedContact.telephone_numero,
          note: selectedContact.note,
          eventType,
        }),
      });

      const data = await res.json();

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

      if (data.ideas && Array.isArray(data.ideas)) {
        setIdeas(data.ideas as Idea[]);
      } else {
        setIdeas([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Impossible de générer les idées.";
      setError(errorMessage);
      console.error("=== ERREUR handleGenerate ===");
      console.error("Message :", errorMessage);
      console.error("Erreur complète :", err);
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------
  // EFFETS
  // ---------------------------
  useEffect(() => {
    async function loadContactsAndPrefill() {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) return;

      const { data, error } = await supabase
        .from("contacts")
        .select("id, prenom, nom, relation, date_naissance, email, note, est_favori, telephone_indicatif, telephone_numero")
        .eq("user_id", session.user.id)
        .order("prenom");

      if (error) {
        console.warn("Erreur chargement contacts:", error);
        return;
      }

      setContacts(data as Contact[]);

      const contactIdFromUrl = searchParams.get("contactId");
      const eventTypeFromUrl = searchParams.get("eventType");

      if (eventTypeFromUrl) setEventType(eventTypeFromUrl);

      if (contactIdFromUrl && data) {
        const contactTrouve = data.find((c) => String(c.id) === contactIdFromUrl);
        if (contactTrouve) appliquerContact(contactTrouve);
      }
    }

    loadContactsAndPrefill();
  }, [searchParams]);

  const contactsFiltres = contacts.filter((contact) =>
    `${contact.prenom} ${contact.nom} ${contact.relation}`
      .toLowerCase()
      .includes(searchContact.toLowerCase())
  );

  // ---------------------------
  // RENDU
  // ---------------------------
  return (
    <div className="min-h-screen bg-[#0B1120] text-white relative overflow-hidden font-sans selection:bg-[#C8A84E] selection:text-black">
      {/* ── Arrière-plan décoratif ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#C8A84E]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 relative z-10">
        
        {/* ── Titre ── */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-[#C8A84E] via-[#E5C565] to-[#C8A84E] bg-clip-text text-transparent mb-3 drop-shadow-sm">
            🎁 Idées Cadeaux
          </h1>
          <p className="text-sm md:text-base text-white/50 max-w-lg mx-auto leading-relaxed">
            Trouve le cadeau parfait en quelques secondes pour{" "}
            <span className="text-[#C8A84E] font-medium">chaque personne</span> importante.
          </p>
        </div>

        {/* ── Layout Principal : Stack Mobile / Grid Desktop ── */}
        <div className="flex flex-col md:grid md:grid-cols-5 gap-6 md:gap-8 items-start">
          
          {/* =============================================== */}
          {/* COLONNE GAUCHE : FORMULAIRE (2/5)               */}
          {/* =============================================== */}
          <div className="w-full md:col-span-2 space-y-6 order-1">
            
            {/* Carte Formulaire */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl">
              
              {/* Étape 1 : Contact */}
              <div className="mb-6">
                <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#C8A84E]/20 border border-[#C8A84E]/40 flex items-center justify-center text-[10px] text-[#C8A84E]">1</span>
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
                    className="w-full border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-[#C8A84E]/30 transition-all"
                  />
                  {searchContact && (
                    <button
                      type="button"
                      onClick={() => { setSearchContact(""); setContactListOpen(false); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Liste déroulante */}
                {!selectedContact && contactListOpen && (
                  <div className="mt-2 max-h-[200px] overflow-y-auto rounded-xl border border-white/10 bg-[#0B1120] shadow-xl z-20 relative">
                    {contactsFiltres.length > 0 ? (
                      contactsFiltres.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => {
                            appliquerContact(contact);
                            setSearchContact("");
                            setContactListOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 active:bg-white/10 transition border-b border-white/5 last:border-0"
                        >
                          <div>
                            <div className="font-medium text-white text-sm">{contact.prenom} {contact.nom}</div>
                            <div className="text-xs text-white/40 capitalize">{contact.relation}</div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-white/30">Aucun résultat</div>
                    )}
                  </div>
                )}

                {/* Badge Contact Sélectionné */}
                {selectedContact && (
                  <div className="bg-[#C8A84E]/10 border border-[#C8A84E]/30 rounded-xl p-3 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-white text-sm truncate">
                        {selectedContact.prenom} {selectedContact.nom}
                      </div>
                      <div className="text-xs text-[#C8A84E]/80 capitalize truncate">
                        {selectedContact.relation}
                      </div>
                      {selectedContact.note && (
                        <div className="text-[10px] text-white/40 mt-1 italic truncate max-w-[180px]">
                          "{selectedContact.note}"
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-2">
                       <button
                        onClick={handleEditContact}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition"
                        title="Modifier"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => {
                          setSelectedContact(null);
                          setSearchContact("");
                        }}
                        className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition"
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
                <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] text-emerald-400">2</span>
                  Type d'événement
                </h2>
                
                <AppSelect
                  options={TYPES_EVENEMENT.map((t) => ({ value: t.value, label: t.label }))}
                  value={eventType}
                  onChange={(val) => {
                    setEventType(val);
                    if (!necessiteDateManuelle(val)) {
                      setEventDate("");
                      setEventDescription("");
                    }
                  }}
                />

                {needsManualDate && (
                  <div className="mt-4 space-y-3 p-4 bg-white/5 rounded-xl border border-white/5 animate-in fade-in">
                    <div>
                      <label className="text-[10px] uppercase text-white/50 font-bold tracking-wider">Date</label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="mt-1 w-full bg-[#0B1120] border border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C8A84E]/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-white/50 font-bold tracking-wider">Quoi ?</label>
                      <input
                        type="text"
                        placeholder="Ex: Départ à la retraite..."
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        className="mt-1 w-full bg-[#0B1120] border border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C8A84E]/50 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bouton Générer */}
              <button
                onClick={handleGenerate}
                disabled={loading || !selectedContact || (needsManualDate && (!eventDate || !eventDescription))}
                className="w-full mt-6 relative group overflow-hidden bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3.5 rounded-xl shadow-lg shadow-[#C8A84E]/20 hover:shadow-[#C8A84E]/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
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
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300 flex items-start gap-2 animate-in fade-in">
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
              <div className="flex items-end justify-between mb-6 px-1 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs text-[#C8A84E] font-bold uppercase tracking-widest mb-1">Sélection</p>
                  <h3 className="text-xl font-bold text-white">
                    {ideas.length} pépites pour {selectedContact?.prenom}
                  </h3>
                </div>
                <p className="text-xs text-white/30 hidden sm:block">
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
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-5xl mb-4 animate-[float_3s_ease-in-out_infinite]">
                  🎁
                </div>
                <p className="text-white/50 text-sm max-w-xs">
                  Remplis le formulaire à gauche pour découvrir des idées sur mesure.
                </p>
              </div>
            )}

            {/* État Chargement (Skeletons) */}
            {loading && (
              <div className="space-y-6">
                <div className="animate-pulse flex items-center gap-2 px-1 mb-4">
                  <div className="w-20 h-4 bg-white/10 rounded"></div>
                  <div className="w-32 h-4 bg-white/10 rounded"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-[250px] bg-white/5 rounded-2xl border border-white/5 animate-pulse"></div>
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
        <div className="flex items-center justify-center min-h-[60vh] bg-[#0B1120]">
          <div className="flex flex-col items-center gap-4">
            <span className="text-4xl animate-bounce">🎁</span>
            <p className="text-white/50 text-sm">Chargement de l'application...</p>
          </div>
        </div>
      }
    >
      <GiftIdeasForm />
    </Suspense>
  );
}