"use client";
import { AI_NOTICE } from '@/lib/ai-privacy';
import { ageKnown } from '@/lib/contact-quality';
import { nameDays, chosenNameDay } from '@/lib/name-days';

import { useState, useEffect, Suspense } from "react";
import type { Session } from '@supabase/supabase-js';
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AppSelect from "@/components/AppSelect";
import { TypeEvenement, calculerDateEvenement, formaterDateFR, calculerDatesJ7J1JourJ } from "@/lib/date-utils";
import {
  TYPES_RELATION,
  TONS_MESSAGE,
  TYPES_EVENEMENT,
  EVENT_TYPE_MAP,
  necessiteDateManuelle,
} from "@/lib/constants";
import { genererMessage } from "@/lib/api-messages";
import { parseLocalDay, isCalendarDay } from '@/lib/calendar-day';
import { formatDateLocale } from '@/lib/date-utils';
import ProgrammerRappel from "@/components/ProgrammerRappel";
import { useDrawer } from "@/components/DrawerContext"; // ← On importe le contexte !

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

type ChoixDateEnvoi = "jourJ" | "j1" | "j7" | "custom";

// ============================================================
// 🔧 HELPER (hors composant)
// ============================================================
function prochaineOccurrenceAnnuelle(dateOriginale: Date): Date {
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  const prochaine = new Date(
    aujourdhui.getFullYear(),
    dateOriginale.getMonth(),
    dateOriginale.getDate()
  );

  if (prochaine < aujourdhui) {
    prochaine.setFullYear(prochaine.getFullYear() + 1);
  }

  return prochaine;
}

// ============================================================
// 🎨 COMPOSANT PRINCIPAL
// ============================================================
function GenerateForm() {
  // ---------------------------
  // 2. HOOKS
  // ---------------------------
  const searchParams = useSearchParams();
  const { ouvrirDrawer } = useDrawer(); // ← Récupère la fonction du contexte

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [relation, setRelation] = useState("ami");
  const [tone, setTone] = useState("familier");
  const [preferredFeast, setPreferredFeast] = useState('');
  const [eventType, setEventType] = useState("anniversaire");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // States pour les contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [choixDate, setChoixDate] = useState<ChoixDateEnvoi>("jourJ");
  const [dateCustom, setDateCustom] = useState<string>("");
  const [eventDate, setEventDate] = useState<string>("");
  const [eventDescription, setEventDescription] = useState<string>("");
  const [searchContact, setSearchContact] = useState("");
  const [contactListOpen, setContactListOpen] = useState(false); // ← ICI, pas dans useEffect

  const needsManualDate = necessiteDateManuelle(eventType);

  // ---------------------------
  // 3. FONCTIONS
  // ---------------------------
  function appliquerContact(contact: Contact) {
    setSelectedContactId(String(contact.id));
    setSelectedContact(contact);
    setFirstName(contact.prenom);
    setLastName(contact.nom);
    setRelation(contact.relation || "ami");

    const knownAge = ageKnown(contact.date_naissance);
    setAge(knownAge === null ? '' : String(knownAge));
    setPreferredFeast('');
  }

  // Fonction pour ouvrir le drawer d'édition avec le contact actuel
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

  // Fonction pour rafraîchir les contacts après modification
  const refreshContacts = async () => {
    if (!session) return;

    const { data, error } = await supabase
      .from("contacts")
      .select("id, prenom, nom, relation, date_naissance, email, note, est_favori, telephone_indicatif, telephone_numero")
      .eq("user_id", session.user.id)
      .order("prenom");

    if (!error && data) {
      setContacts(data as Contact[]);

      // Met à jour le contact sélectionné si l'ID correspond toujours
      if (selectedContactId) {
        const updated = data.find((c) => String(c.id) === selectedContactId);
        if (updated) {
          appliquerContact(updated as Contact);
        }
      }
    }
  };

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setMessage("");
    setCopied(false);

    try {
      let dateEvenementPourIA: string | null = null;

      if (needsManualDate && eventDate) {
        dateEvenementPourIA = eventDate;
      } else if (datesPossibles) {
        dateEvenementPourIA = formatDateLocale(datesPossibles.jourJ);
      }

      const messageGenere = await genererMessage({
        firstName,
        lastName,
        age: age ? parseInt(age) : null,
        relation,
        tone,
        eventType,
        eventDate: dateEvenementPourIA,
        eventDescription: needsManualDate ? eventDescription : null,
        note: selectedContact?.note || null,
        eventDateOrigin: selectedContact?.date_naissance ?? null,
      });

      setMessage(messageGenere);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Impossible de générer le message.";
      setError(errorMessage);
      console.error("Erreur dans handleGenerate:", err);
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------
  // 4. EFFETS
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
        console.warn("Erreur chargement contacts :", error);
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
      if (!isCalendarDay(eventDate)) return null;
      return calculerDatesJ7J1JourJ(parseLocalDay(eventDate));
    }

    if (eventType === 'fete_prenomale') {
      const chosen = chosenNameDay(firstName, preferredFeast, formatDateLocale(new Date()));
      return chosen ? calculerDatesJ7J1JourJ(parseLocalDay(chosen)) : null;
    }
    const typeEvt = EVENT_TYPE_MAP[eventType];
    if (!typeEvt) return null;

    const dateEvenement = calculerDateEvenement(typeEvt, {
      prenom: firstName || selectedContact.prenom,
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

  function getDateEnvoiChoisie(): Date | null {
    if (!datesPossibles) return null;
    if (choixDate === "custom") return dateCustom ? new Date(dateCustom) : null;
    if (choixDate === "jourJ") return datesPossibles.jourJ;
    if (choixDate === "j1") return datesPossibles.j1;
    if (choixDate === "j7") return datesPossibles.j7;
    return null;
  }

  function handleCopy() {
    if (!message) return;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!message) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Message Ephemer",
          text: message,
        });
        return;
      }
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      alert("Le partage direct n'est pas disponible ici. Le message a été copié.");
    } catch (err) {
      console.error("Erreur lors du partage :", err);
    }
  }

  // ---------------------------
  // 5. RENDU
  // ---------------------------
  return (
    <div className="min-h-screen bg-canvas text-ink p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-8 bg-gradient-to-r from-action to-action bg-clip-text text-transparent">
          Générateur de messages personnalisés
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* COLONNE GAUCHE : FORMULAIRE */}
          <div className="space-y-6">
            {/* Sélection de contact */}
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                👤 Contact <span className="text-danger">*</span>
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
                  className="w-full border border-line rounded-2xl px-5 py-3 text-sm bg-ink/5 text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                {searchContact && (
                  <button
                    type="button"
                    onClick={() => setSearchContact("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-muted"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Liste déroulante des contacts */}
              {!selectedContact && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setContactListOpen((ouvert) => !ouvert)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-line bg-ink/5 text-ink hover:bg-ink/10 active:bg-ink/15 transition"
                  >
                    <span className="font-medium">
                      {contactListOpen ? "Masquer mes contacts" : "📇 Choisir un contact existant"}
                    </span>
                    <span
                      className={`text-accent transition-transform duration-200 ${
                        contactListOpen ? "rotate-180" : ""
                      }`}
                    >
                      ▾
                    </span>
                  </button>

                  {contactListOpen && (
                    <div className="max-h-[280px] overflow-y-auto rounded-2xl border border-line bg-ink/5 divide-y divide-line">
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
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-ink/10 active:bg-ink/15 transition"
                          >
                            <div>
                              <div className="font-medium text-ink">
                                {contact.prenom} {contact.nom}
                              </div>
                              <div className="text-xs text-muted capitalize">{contact.relation}</div>
                            </div>
                            <div className="text-accent text-sm">→</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-sm text-muted">
                          Aucun contact trouvé
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Badge du contact sélectionné */}
              {selectedContact && (
                <div className="flex items-center justify-between bg-ink/5 border border-line rounded-2xl px-4 py-3">
                  <div>
                    <div className="font-semibold text-ink">
                      {selectedContact.prenom} {selectedContact.nom}
                    </div>
                    <div className="text-xs text-muted capitalize">{selectedContact.relation}</div>
                    {!selectedContact.email && (
                      <div className="text-xs text-warning mt-1">
                        ⚠️ Email manquant
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* ✅ Bouton Modifier qui utilise le contexte DrawerContext */}
                    <button
                      type="button"
                      onClick={handleEditContact}
                      className="text-xs px-3 py-1.5 rounded-full bg-ink/10 text-muted hover:bg-ink/20 active:bg-ink/30 transition"
                    >
                      ✏️ Détails du contact
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedContact(null);
                        setSelectedContactId("");
                        setFirstName("");
                        setLastName("");
                        setAge("");
                        setRelation("ami");
                        setSearchContact("");
                      }}
                      className="text-xs px-4 py-1.5 rounded-full bg-red-500/10 text-danger hover:bg-red-500/20 active:bg-red-500/30 transition"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Prénom et Nom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Prénom <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-line rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 bg-ink/5 text-ink"
                  placeholder="Jean"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Nom</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-line rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 bg-ink/5 text-ink"
                  placeholder="Dupont"
                />
              </div>
            </div>

            {/* Âge */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Âge</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="0"
                max="120"
                className="w-full border border-line rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 bg-ink/5 text-ink"
                placeholder="30"
              />
            </div>

            {/* Relation */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Relation <span className="text-danger">*</span>
              </label>
              <AppSelect
                options={TYPES_RELATION.map((type) => ({ value: type.value, label: type.label }))}
                value={relation}
                onChange={setRelation}
              />
            </div>

            {/* Type d'événement */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Type d&apos;événement <span className="text-danger">*</span>
              </label>
              <AppSelect
                options={TYPES_EVENEMENT.map((type) => ({ value: type.value, label: type.label }))}
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

            {/* Champs pour date manuelle */}
            {needsManualDate && (
              <div className="space-y-4 pt-4 border-t border-line">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">
                    📅 Date de l&apos;événement <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full border border-line rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 bg-ink/5 text-ink"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">
                    📝 Description <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder="Ex: Rencontre au café"
                    className="w-full border border-line rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 bg-ink/5 text-ink placeholder-muted"
                    required
                  />
                </div>
              </div>
            )}

            <p className="text-sm text-muted">{AI_NOTICE}</p>
            <p className="text-sm text-muted">Chaque message programmé correspond à un envoi unique. Les anniversaires proposent la prochaine occurrence annuelle ; une date personnalisée reste ponctuelle et ne se renouvelle pas automatiquement.</p>
            {eventType === 'fete_prenomale' && <label className="block text-sm text-muted">Fête retenue pour ce message
              <select value={preferredFeast} onChange={e => setPreferredFeast(e.target.value)} className="mt-2 w-full bg-surface border border-line rounded-xl p-3">
                <option value="">Choisir une date</option>
                {nameDays(firstName).map(day => <option key={day} value={day}>{day.split('-').reverse().join('/')}</option>)}
              </select>
              <span className="block mt-2">Ce choix est propre au message en cours ; il ne change pas le calendrier du contact. Si aucune date ne convient, utilise un jour spécial.</span>
            </label>}
            {/* Ton du message */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Ton du message <span className="text-danger">*</span>
              </label>
              <AppSelect
                options={TONS_MESSAGE.map((ton) => ({ value: ton.value, label: ton.label }))}
                value={tone}
                onChange={setTone}
              />
            </div>

            {/* Bouton Générer */}
            <button
              onClick={handleGenerate}
              disabled={
                loading ||
                !firstName ||
                (needsManualDate && (!eventDate || !eventDescription))
              }
              className="w-full bg-gradient-to-r from-action to-action text-on-action font-bold py-3 rounded-xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "⏳ Génération en cours..." : "✨ Générer le message"}
            </button>

            {error && (
              <p className="text-sm text-danger bg-red-500/10 rounded-lg px-3 py-2">❌ {error}</p>
            )}
          </div>

          {/* COLONNE DROITE : RÉSULTAT */}
          <div className="space-y-6">
            {message && (
              <div className="bg-ink/5 rounded-xl p-4 border border-line">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-accent">💌 Message généré (modifiable)</h3>
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full min-h-[140px] bg-ink/5 border border-line rounded-xl p-4 text-muted resize-y focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm leading-relaxed"
                  placeholder="Votre message personnalisé..."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={handleCopy}
                    className="w-full bg-gradient-to-r from-action to-action text-on-action font-bold py-3 rounded-xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition disabled:opacity-50"
                  >
                    {copied ? "✅ Copié !" : "Copier"}
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={!message}
                    className="w-full bg-gradient-to-r from-action to-action text-on-action font-bold py-3 rounded-xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition disabled:opacity-50"
                  >
                    📤 Partager
                  </button>
                </div>
              </div>
            )}

            {message && selectedContact && session && (
              <>
                <ProgrammerRappel
                  key={String(selectedContact.id) + eventType + eventDate + preferredFeast + message}
                  session={session}
                  selectedContact={selectedContact}
                  message={message}
                  tone={tone}
                  eventType={eventType}
                  datesPossibles={datesPossibles ?? undefined}
                />

                {/* Avertissements */}
                {!datesPossibles && (
                  <div className="bg-orange-500/10 border border-orange-500/40 rounded-lg p-3 text-xs text-warning">
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
                      👉 Utilise <strong>📆 Date personnalisée</strong> ci-dessus pour choisir manuellement.
                    </p>
                  </div>
                )}

                {/* ✅ Avertissement email manquant */}
                {!selectedContact.email && (
                  <div className="bg-orange-500/10 border border-orange-500/40 rounded-lg p-3 text-xs text-warning">
                    ℹ️ Ce contact n&apos;a pas d&apos;<strong>adresse email</strong> renseignée.
                    <p className="mt-2">
                      👉 Clique sur <strong>✏️ Modifier</strong> pour ajouter un email 
                      et pouvoir envoyer des messages par email.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted">Chargement...</p>
        </div>
      }
    >
      <GenerateForm />
    </Suspense>
  );
}