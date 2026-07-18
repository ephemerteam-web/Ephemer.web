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
    <div className="min-h-screen bg-[#0B1120] text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Titre */}
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-8 bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] bg-clip-text text-transparent">
          🎁 Générateur d&apos;idées cadeaux
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* COLONNE GAUCHE : FORMULAIRE */}
          <div className="space-y-6">
            {/* ── Sélection de contact ── */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                👤 Contact <span className="text-red-400">*</span>
              </label>

              {/* Barre de recherche */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Tape le prénom, nom ou relation..."
                  value={searchContact}
                  onChange={(e) => {
                    setSearchContact(e.target.value);
                    if (e.target.value.trim() !== "") {
                      setContactListOpen(true);
                    }
                  }}
                  className="w-full border border-white/10 rounded-2xl px-5 py-3 text-sm bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50"
                />
                {searchContact && (
                  <button
                    type="button"
                    onClick={() => setSearchContact("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
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
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10 active:bg-white/15 transition"
                  >
                    <span className="font-medium">
                      {contactListOpen ? "Masquer mes contacts" : "📇 Choisir un contact existant"}
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
                    <div className="max-h-[280px] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/10">
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
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/10 active:bg-white/15 transition"
                          >
                            <div>
                              <div className="font-medium text-white">
                                {contact.prenom} {contact.nom}
                              </div>
                              <div className="text-xs text-white/60 capitalize">{contact.relation}</div>
                            </div>
                            <div className="text-[#C8A84E] text-sm">→</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-sm text-white/50">
                          Aucun contact trouvé
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Badge contact sélectionné */}
              {selectedContact && (
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <div>
                    <div className="font-semibold text-white">
                      {selectedContact.prenom} {selectedContact.nom}
                    </div>
                    <div className="text-xs text-white/60 capitalize">{selectedContact.relation}</div>
                    {selectedContact.note && (
                      <div className="text-xs text-[#C8A84E] mt-1 truncate max-w-[200px]">
                        📝 {selectedContact.note}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleEditContact}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-white/80 hover:bg-white/20 active:bg-white/30 transition"
                    >
                      ✏️ Détails
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedContact(null);
                        setSelectedContactId("");
                        setSearchContact("");
                        setIdeas([]);
                      }}
                      className="text-xs px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 active:bg-red-500/30 transition"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Type d'événement ── */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">
                🎯 Type d&apos;événement
              </label>
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
            </div>

            {/* ── Champs date manuelle ── */}
            {needsManualDate && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">
                    📅 Date de l&apos;événement <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 bg-white/5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">
                    📝 Description <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder="Ex: Rencontre au café"
                    className="w-full border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 bg-white/5 text-white placeholder-white/30"
                    required
                  />
                </div>
              </div>
            )}

            {/* ── Bouton Générer ── */}
            <button
              onClick={handleGenerate}
              disabled={
                loading ||
                !selectedContact ||
                (needsManualDate && (!eventDate || !eventDescription))
              }
              className="w-full bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3 rounded-xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "🤖 Génération en cours..." : "🎁 Trouver des idées cadeaux"}
            </button>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                ❌ {error}
              </p>
            )}

            {/* ── Avertissements ── */}
            {selectedContact && !datesPossibles && (
              <div className="bg-orange-500/10 border border-orange-500/40 rounded-lg p-3 text-xs text-orange-200">
                ℹ️ Pas de date automatique pour cet événement.
                {eventType === "fete_prenomale" && (
                  <p className="mt-1">
                    Le prénom <strong>{selectedContact.prenom}</strong> n&apos;a pas été trouvé
                    dans notre calendrier des saints.
                  </p>
                )}
                {eventType === "anniversaire" && !selectedContact.date_naissance && (
                  <p className="mt-1">
                    Ce contact n&apos;a pas de <strong>date de naissance</strong> renseignée.
                  </p>
                )}
                <p className="mt-2">
                  👉 Utilise <strong>📆 Date personnalisée</strong> ci-dessus.
                </p>
              </div>
            )}
          </div>

          {/* COLONNE DROITE : CARTES CADEAUX */}
          <div className="space-y-4">
            {ideas.length > 0 ? (
              <>
                {/* En-tête des résultats */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#C8A84E] font-medium">
                    ✨ {ideas.length} idées pour {selectedContact?.prenom}
                  </p>
                </div>

                {/* Liste des cartes */}
                <div className="space-y-4">
                  {ideas.map((idea, index) => {
                    const categorie = getCategorieById(idea.categorie);
                    const marchands = marchandsPourCategorie(idea.categorie);
                    const lienDefaut = marchands[0]?.url(idea.recherche);

                    return (
                      <div
                        key={index}
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-4"
                      >
                        {/* Header : emoji + idée + catégorie */}
                        <div className="flex items-start gap-3">
                          <span className="text-3xl flex-shrink-0 mt-0.5">
                            {idea.emoji || "🎁"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-[15px] leading-tight">
                              {idea.idee}
                            </p>
                            {categorie && (
                              <span className="inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                                {categorie.emoji} {categorie.nom}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Raison */}
                        <p className="text-emerald-200/80 text-sm leading-snug pl-1">
                          💡 {idea.raison}
                        </p>

                        {/* Boutons marchands */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {marchands.slice(0, 3).map((marchand) => (
                            <a
                              key={marchand.id}
                              href={marchand.url(idea.recherche)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`
                                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition
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
                            className="mt-1 inline-flex items-center justify-center gap-2 w-full bg-emerald-600/80 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-medium py-2 rounded-xl transition border border-emerald-500/30"
                          >
                            🔍 Voir les résultats →
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : !loading && (
              /* État vide */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4">🎁</div>
                <p className="text-white/40 text-sm max-w-[280px]">
                  Sélectionne un contact et clique sur{" "}
                  <span className="text-[#C8A84E] font-medium">Trouver des idées cadeau</span>{" "}
                  pour découvrir des suggestions personnalisées.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="text-4xl mb-4 animate-pulse">🤖</div>
                <p className="text-white/50 text-sm">
                  L&apos;IA réfléchit à des idées pour{" "}
                  <span className="text-white font-medium">{selectedContact?.prenom}</span>...
                </p>
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-white/50">Chargement...</p>
        </div>
      }
    >
      <GiftIdeasForm />
    </Suspense>
  );
}