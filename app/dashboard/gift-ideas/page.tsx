"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AppSelect from "@/components/AppSelect";
import { TypeEvenement, calculerDateEvenement } from "@/lib/dates-evenements";
import { calculerDatesJ7J1JourJ } from "@/lib/anniversaires";
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

// ============================================================
// 🎴 COMPOSANT FLIP CARD (carte qui se retourne)
// ============================================================
function FlipCard({ idea, index }: { idea: Idea; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const categorie = getCategorieById(idea.categorie);
  const marchands = marchandsPourCategorie(idea.categorie);
  const lienDefaut = marchands[0]?.url(idea.recherche);

  // Couleurs de dégradé qui changent selon l'index (chaque carte est unique)
  const gradients = [
    "from-[#C8A84E]/30 via-[#D4B85C]/15 to-[#0B1120]/80",
    "from-emerald-500/25 via-emerald-400/10 to-[#0B1120]/80",
    "from-rose-500/25 via-rose-400/10 to-[#0B1120]/80",
    "from-blue-500/25 via-blue-400/10 to-[#0B1120]/80",
    "from-purple-500/25 via-purple-400/10 to-[#0B1120]/80",
    "from-amber-500/25 via-amber-400/10 to-[#0B1120]/80",
  ];
  const gradient = gradients[index % gradients.length];

  // Couleur du bord de carte selon l'index
  const borderColors = [
    "border-[#C8A84E]/40",
    "border-emerald-500/40",
    "border-rose-500/40",
    "border-blue-500/40",
    "border-purple-500/40",
    "border-amber-500/40",
  ];
  const borderColor = borderColors[index % borderColors.length];

  return (
    <div
      className="gift-flip-card w-full h-[200px] md:h-[220px] [perspective:1200px] cursor-pointer group"
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className={`gift-flip-inner relative w-full h-full transition-transform duration-700 ease-in-out [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* ─── RECTO : L'idée ─── */}
        <div
          className={`
            absolute inset-0 rounded-2xl border ${borderColor}
            bg-gradient-to-br ${gradient}
            backdrop-blur-xl
            [backface-visibility:hidden]
            flex flex-col items-center justify-center p-5
            shadow-lg hover:shadow-2xl transition-shadow duration-300
            overflow-hidden
          `}
        >
          {/* Lumière décorative en haut à droite */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

          <span className="text-5xl mb-3 drop-shadow-lg">{idea.emoji || "🎁"}</span>
          <h3 className="text-white font-bold text-center text-base md:text-lg leading-tight mb-2">
            {idea.idee}
          </h3>
          {categorie && (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-white/10 text-white/70 backdrop-blur-sm border border-white/10">
              {categorie.emoji} {categorie.nom}
            </span>
          )}

          {/* Indication pour retourner (desktop uniquement) */}
          <div className="absolute bottom-3 right-3 text-[10px] text-white/30 hidden md:flex items-center gap-1">
            <span className="inline-block animate-[wiggle_2s_ease-in-out_infinite]">↻</span>
            survoler
          </div>
          {/* Indication mobile */}
          <div className="absolute bottom-3 right-3 text-[10px] text-white/30 md:hidden">
            tap pour voir →
          </div>
        </div>

        {/* ─── VERSO : Détails + marchands ─── */}
        <div
          className={`
            absolute inset-0 rounded-2xl border ${borderColor}
            bg-gradient-to-br ${gradient}
            backdrop-blur-xl
            [backface-visibility:hidden]
            [transform:rotateY(180deg)]
            flex flex-col p-4
            shadow-lg
            overflow-hidden
          `}
        >
          {/* Lumière décorative */}
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-white/5 rounded-full blur-2xl" />

          {/* Raison du cadeau */}
          <div className="flex-1 overflow-y-auto pr-1">
            <p className="text-emerald-200/90 text-sm leading-snug mb-3">
              💡 {idea.raison}
            </p>
          </div>

          {/* Boutons marchands */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {marchands.slice(0, 3).map((marchand) => (
              <a
                key={marchand.id}
                href={marchand.url(idea.recherche)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`
                  inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium
                  transition-all duration-200 hover:scale-105 active:scale-95
                  ${marchand.couleur}
                `}
                title={`Voir "${idea.idee}" sur ${marchand.nom}`}
              >
                <span>{marchand.emoji}</span>
                <span>{marchand.nom}</span>
              </a>
            ))}
          </div>

          {/* Lien principal */}
          {lienDefaut && (
            <a
              href={lienDefaut}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center gap-2 w-full bg-emerald-600/80 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-xl transition border border-emerald-500/30"
            >
              🔍 Voir les résultats
            </a>
          )}
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
  // HOOKS
  // ---------------------------
  const searchParams = useSearchParams();
  const { ouvrirDrawer } = useDrawer();

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
        if (updated) {
          appliquerContact(updated as Contact);
        }
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

      const res = await fetch("/api/generate-gift-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        throw new Error(data.error || "Erreur lors de la génération.");
      }

      if (data.ideas && Array.isArray(data.ideas)) {
        setIdeas(data.ideas as Idea[]);
      } else {
        setIdeas([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Impossible de générer les idées.";
      setError(errorMessage);
      console.error("Erreur handleGenerate:", err);
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

      if (eventTypeFromUrl) {
        setEventType(eventTypeFromUrl);
      }

      if (contactIdFromUrl && data) {
        const contactTrouve = data.find(
          (c) => String(c.id) === contactIdFromUrl
        );
        if (contactTrouve) {
          appliquerContact(contactTrouve);
        }
      }
    }

    loadContactsAndPrefill();
  }, [searchParams]);

  // ---------------------------
  // VARIABLES DÉRIVÉES
  // ---------------------------
  const datesPossibles: DatesPossibles | null = (() => {
    if (!selectedContact) return null;

    if (needsManualDate && eventDate) {
      return calculerDatesJ7J1JourJ(new Date(eventDate));
    }

    const typeEvt = EVENT_TYPE_MAP[eventType];
    if (!typeEvt) return null;

    const dateEvenement = calculerDateEvenement(typeEvt, {
      prenom: selectedContact.prenom,
      date_naissance: selectedContact.date_naissance,
    });
    if (!dateEvenement) return null;

    return calculerDatesJ7J1JourJ(dateEvenement);
  })();

  const contactsFiltres = contacts.filter((contact) =>
    `${contact.prenom} ${contact.nom} ${contact.relation}`
      .toLowerCase()
      .includes(searchContact.toLowerCase())
  );

  // ---------------------------
  // RENDU
  // ---------------------------
  return (
    <div className="min-h-screen bg-[#0B1120] text-white p-4 md:p-8 relative overflow-hidden">
      {/* ── Arrière-plan décoratif : halos lumineux ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#C8A84E]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* ── Titre ── */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-[#C8A84E] via-[#D4B85C] to-[#C8A84E] bg-clip-text text-transparent mb-2">
            🎁 Idées cadeaux
          </h1>
          <p className="text-sm text-white/50 max-w-md mx-auto">
            Trouve le cadeau parfait en quelques secondes, pensé sur mesure pour{" "}
            <span className="text-[#C8A84E]">chaque personne</span> de ton entourage.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-6 md:gap-8">
          {/* ============================================================ */}
          {/* COLONNE GAUCHE : FORMULAIRE (2/5 de la largeur)             */}
          {/* ============================================================ */}
          <div className="md:col-span-2 space-y-5">
            {/* ── Carte formulaire globale ── */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl">
              <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#C8A84E]/10 border border-[#C8A84E]/30 flex items-center justify-center text-sm">1</span>
                Pour qui ?
              </h2>

              {/* ── Sélection de contact ── */}
              <div className="relative mb-3">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</div>
                <input
                  type="text"
                  placeholder="Rechercher un contact..."
                  value={searchContact}
                  onChange={(e) => {
                    setSearchContact(e.target.value);
                    if (e.target.value.trim() !== "") {
                      setContactListOpen(true);
                    }
                  }}
                  className="w-full border border-white/10 rounded-2xl pl-11 pr-10 py-3 text-sm bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-[#C8A84E]/30 transition"
                />
                {searchContact && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchContact("");
                      setContactListOpen(false);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Liste déroulante */}
              {!selectedContact && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setContactListOpen((ouvert) => !ouvert)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] text-white/70 hover:bg-white/5 hover:border-white/30 active:bg-white/10 transition group"
                  >
                    <span className="text-sm font-medium flex items-center gap-2">
                      <span className="text-[#C8A84E]">📇</span>
                      Voir tous mes contacts
                      <span className="text-xs text-white/40">({contacts.length})</span>
                    </span>
                    <span
                      className={`text-[#C8A84E] transition-transform duration-200 ${
                        contactListOpen ? "rotate-180" : ""
                      }`}
                    >
                      ▾
                    </span>
                  </button>

                  {contactListOpen && (
                    <div className="max-h-[260px] overflow-y-auto rounded-2xl border border-white/10 bg-[#0B1120]/60 backdrop-blur-xl divide-y divide-white/5 scrollbar-thin">
                      {contactsFiltres.length > 0 ? (
                        contactsFiltres.map((contact) => (
                          <button
                            key={contact.id}
                            type="button"
                            onClick={() => {
                              appliquerContact(contact);
                              setSearchContact("");
                              setContactListOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 active:bg-white/10 transition"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-white text-sm truncate">
                                {contact.prenom} {contact.nom}
                              </div>
                              <div className="text-xs text-white/50 capitalize truncate">
                                {contact.relation}
                              </div>
                            </div>
                            <div className="text-[#C8A84E] text-sm ml-2 flex-shrink-0">→</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-sm text-white/40">
                          Aucun contact trouvé
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Badge contact sélectionné (élégant) */}
              {selectedContact && (
                <div className="mt-3 bg-gradient-to-r from-[#C8A84E]/10 to-transparent border border-[#C8A84E]/20 rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#C8A84E]/20 border border-[#C8A84E]/30 flex items-center justify-center text-lg flex-shrink-0">
                        {selectedContact.prenom.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-sm truncate">
                          {selectedContact.prenom} {selectedContact.nom}
                        </div>
                        <div className="text-xs text-white/50 capitalize">{selectedContact.relation}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleEditContact}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 active:bg-white/30 transition"
                        title="Modifier le contact"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedContact(null);
                          setSelectedContactId("");
                          setSearchContact("");
                          setIdeas([]);
                        }}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 active:bg-red-500/30 transition"
                        title="Retirer le contact"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {selectedContact.note && (
                    <div className="mt-2 text-xs text-[#C8A84E]/80 italic truncate">
                      📝 {selectedContact.note}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Section Type d'événement ── */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl">
              <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-sm">2</span>
                Quelle occasion ?
              </h2>
              <AppSelect
                options={TYPES_EVENEMENT.map((type) => ({
                  value: type.value,
                  label: type.label,
                }))}
                value={eventType}
                onChange={(value) => {
                  setEventType(value);
                  if (!necessiteDateManuelle(value)) {
                    setEventDate("");
                    setEventDescription("");
                  }
                }}
              />

              {/* Champs date manuelle */}
              {needsManualDate && (
                <div className="space-y-4 pt-4 mt-4 border-t border-white/10">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                      📅 Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-[#C8A84E]/30 bg-white/5 text-white transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                      📝 Description <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      placeholder="Ex: Rencontre au café"
                      className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 focus:border-[#C8A84E]/30 bg-white/5 text-white placeholder-white/30 transition"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Bouton Générer ── */}
            <button
              onClick={handleGenerate}
              disabled={
                loading ||
                !selectedContact ||
                (needsManualDate && (!eventDate || !eventDescription))
              }
              className="w-full relative group overflow-hidden bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-4 rounded-2xl hover:shadow-[0_0_40px_rgba(200,168,78,0.4)] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              {/* Effet de brillance au survol */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="animate-spin">✨</span>
                    Génération en cours...
                  </>
                ) : (
                  <>
                    🎁 Trouver des idées cadeaux
                  </>
                )}
              </span>
            </button>

            {/* Erreur */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300 flex items-start gap-2">
                <span className="flex-shrink-0">❌</span>
                <span>{error}</span>
              </div>
            )}

            
          </div>

          {/* ============================================================ */}
          {/* COLONNE DROITE : CARTES FLIP (3/5 de la largeur)            */}
          {/* ============================================================ */}
          <div className="md:col-span-3">
            {ideas.length > 0 ? (
              <>
                {/* En-tête des résultats */}
                <div className="flex items-center justify-between mb-5 px-1">
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider">Résultats</p>
                    <p className="text-lg font-bold text-white">
                      <span className="text-[#C8A84E]">{ideas.length}</span> idées pour{" "}
                      <span className="text-[#C8A84E]">{selectedContact?.prenom}</span>
                    </p>
                  </div>
                  <div className="text-xs text-white/40 hidden md:block">
                    💡 Tap sur une carte pour voir les détails
                  </div>
                </div>

                {/* Grille de flip-cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ideas.map((idea, index) => (
                    <FlipCard key={index} idea={idea} index={index} />
                  ))}
                </div>
              </>
            ) : !loading ? (
              /* ── État vide : illustration élégante ── */
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center text-center min-h-[400px] md:min-h-[500px]">
                {/* Animation de cadeau flottant */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-[#C8A84E]/20 blur-3xl rounded-full" />
                  <div className="relative text-7xl md:text-8xl animate-[float_3s_ease-in-out_infinite]">
                    🎁
                  </div>
                </div>
                <h3 className="text-white/80 font-semibold text-lg mb-2">
                  Prêt à trouver l'idée parfaite ?
                </h3>
                <p className="text-white/40 text-sm max-w-sm leading-relaxed">
                  Sélectionne un contact à gauche, choisis l'occasion, puis laisse{" "}
                  <span className="text-[#C8A84E] font-medium">l'IA</span> faire sa magie ✨
                </p>

                {/* Indicateur d'étapes */}
                <div className="flex items-center gap-2 mt-6 text-xs text-white/30">
                  <span className="flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-[#C8A84E]/20 border border-[#C8A84E]/40 flex items-center justify-center text-[10px]">1</span>
                    Contact
                  </span>
                  <span className="w-6 h-px bg-white/20" />
                  <span className="flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px]">2</span>
                    Occasion
                  </span>
                  <span className="w-6 h-px bg-white/20" />
                  <span className="flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[10px]">3</span>
                    Magie ✨
                  </span>
                </div>
              </div>
            ) : null}

            {/* ── État de chargement ── */}
            {loading && (
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center min-h-[400px] md:min-h-[500px]">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-[#C8A84E]/30 blur-3xl rounded-full animate-pulse" />
                  <div className="relative text-6xl md:text-7xl animate-bounce">🤖</div>
                </div>
                <p className="text-white/80 font-semibold text-lg mb-2">
                  L'IA réfléchit...
                </p>
                <p className="text-white/40 text-sm">
                  Des idées sur mesure pour{" "}
                  <span className="text-[#C8A84E] font-medium">{selectedContact?.prenom}</span>
                </p>

                {/* Skeleton cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 w-full">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-[200px] rounded-2xl bg-white/5 border border-white/10 animate-pulse"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
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
          <p className="text-white/50">Chargement...</p>
        </div>
      }
    >
      <GiftIdeasForm />
    </Suspense>
  );
}