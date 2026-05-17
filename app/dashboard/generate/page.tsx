"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { programmerMessage } from "@/lib/rappels";
import AppSelect from "@/components/AppSelect";
import { TypeEvenement, calculerDateEvenement } from "@/lib/dates-evenements";
import {
  TYPES_RELATION,
  TONS_MESSAGE,
  TYPES_EVENEMENT,
  DESTINATAIRES_RAPPEL,
} from "@/lib/constants";

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
  note?: string | null; // ← AJOUT
};

type DatesPossibles = {
  jourj: Date;
  j1: Date;
  j7: Date;
};

type ChoixDateEnvoi = "jourj" | "j1" | "j7" | "custom";

const testType: TypeEvenement = "jour_special";


const EVENT_TYPE_MAP: Record<string, TypeEvenement> = {
  anniversaire: "anniversaire",
  fete_prenomale: "fete_prenomale",
  jour_special: "jour_special",
};


// ✅ Liste des events qui nécessitent une date manuelle
const EVENTS_AVEC_DATE_MANUELLE = ["jour_special", "mariage", "naissance", "autre"];



// ============================================================
// 🎨 COMPOSANT PRINCIPAL
// ============================================================
function GenerateForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
// ============================================================
// 🔧 FONCTIONS UTILITAIRES
// ============================================================
// ===== FONCTIONS =====
  function appliquerContact(contact: Contact) {
    setSelectedContactId(String(contact.id));
    setSelectedContact(contact);
    setFirstName(contact.prenom);
    setLastName(contact.nom);
    setRelation(contact.relation || "ami");

    if (contact.date_naissance) {
      const naissance = new Date(contact.date_naissance);
      const aujourdhui = new Date();
      let ageCalcule = aujourdhui.getFullYear() - naissance.getFullYear();
      const anniversaireCetteAnnee = new Date(
        aujourdhui.getFullYear(),
        naissance.getMonth(),
        naissance.getDate()
      );
      if (anniversaireCetteAnnee < aujourdhui) {
        ageCalcule += 1;
      }
      setAge(String(ageCalcule));
    } else {
      setAge("");
    }
  }
  function formaterDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
  // ===== STATES =====
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [relation, setRelation] = useState("ami");
  const [tone, setTone] = useState("familier");
  const [eventType, setEventType] = useState("anniversaire");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // States pour les contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // States pour la programmation
  const [destinataire, setDestinataire] = useState<"moi" | "contact" | "les_deux">("moi");
  const [programmation, setProgrammation] = useState<{
    loading: boolean;
    message: string;
    isError: boolean;
  }>({ loading: false, message: "", isError: false });
  const [choixDate, setChoixDate] = useState<ChoixDateEnvoi>("jourj");
  const [dateCustom, setDateCustom] = useState<string>("");
  const [eventDate, setEventDate] = useState<string>("");
  const [eventDescription, setEventDescription] = useState<string>("");

  // ✅ Helper : est-ce un événement avec date manuelle ?
  const needsManualDate = EVENTS_AVEC_DATE_MANUELLE.includes(eventType);

  // ===== EFFETS =====
  useEffect(() => {
    async function loadContactsAndPrefill() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("contacts")
        .select("id, prenom, nom, relation, date_naissance, email, note")
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

  

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setMessage("");
    setCopied(false);

    try {
      const response = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          age: age ? parseInt(age) : null,
          relation,
          tone,
          eventType,
          eventDate: needsManualDate ? eventDate : null,
          eventDescription: needsManualDate ? eventDescription : null,
          note: selectedContact?.note || null,
        }),
      });

      // ✅ Lecture sécurisée du JSON (même si la réponse est vide ou invalide)
      let responseData: { message?: string; error?: string } = {};
      try {
        responseData = await response.json();
      } catch (parseErr) {
        console.error("Réponse non-JSON:", parseErr);
      }

      if (!response.ok) {
        const errorMessage = responseData.error || "Erreur de l'API";
        throw new Error(String(errorMessage));
      }

      if (!responseData.message) {
        throw new Error("Aucun message reçu du serveur");
      }

      setMessage(responseData.message);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Impossible de générer le message.";
      setError(errorMessage);
      console.error("Erreur dans handleGenerate:", err);
    } finally {
      setLoading(false);
    }
  }

  // ✅ Calcul des dates possibles (typage strict)
  const datesPossibles: DatesPossibles | null = (() => {
    if (!selectedContact) return null;

    // Cas 1 : Événement avec date manuelle (jour_special, mariage, naissance, autre)
    if (needsManualDate && eventDate) {
      const dateEvenement = new Date(eventDate);
      const j1 = new Date(dateEvenement);
      j1.setDate(j1.getDate() - 1);
      const j7 = new Date(dateEvenement);
      j7.setDate(j7.getDate() - 7);
      return { jourj: dateEvenement, j1, j7 };
    }

    // Cas 2 : Événements automatiques (anniversaire, fête prénomale)
    const typeEvt = EVENT_TYPE_MAP[eventType];
    if (!typeEvt) return null;

    const dateEvenement = calculerDateEvenement(typeEvt, {
      prenom: selectedContact.prenom,
      date_naissance: selectedContact.date_naissance,
    });
    if (!dateEvenement) return null;

    const j1 = new Date(dateEvenement);
    j1.setDate(j1.getDate() - 1);
    const j7 = new Date(dateEvenement);
    j7.setDate(j7.getDate() - 7);

    return { jourj: dateEvenement, j1, j7 };
  })();

  const dateMin = new Date().toISOString().split("T")[0];

  // ✅ CORRIGÉ : Typage strict (pas d'accès dynamique problématique)
  function getDateEnvoiChoisie(): Date | null {
    if (!datesPossibles) return null;

    if (choixDate === "custom") {
      return dateCustom ? new Date(dateCustom) : null;
    }
    if (choixDate === "jourj") return datesPossibles.jourj;
    if (choixDate === "j1") return datesPossibles.j1;
    if (choixDate === "j7") return datesPossibles.j7;

    return null;
  }

  async function handleProgrammer() {
    if (!selectedContact || !getDateEnvoiChoisie()) return;

    if (needsManualDate && (!eventDate || !eventDescription)) {
      setProgrammation({
        loading: false,
        message: "Pour cet événement, la date et la description sont obligatoires.",
        isError: true,
      });
      return;
    }

    setProgrammation({ loading: true, message: "", isError: false });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("Vous devez être connecté pour programmer un message");
      }

      const dateEnvoi = getDateEnvoiChoisie()!;

      // ✅ CORRIGÉ : Mapping safe vers TypeEvenement
      // Les events "mariage", "naissance", "autre" deviennent "jour_special"
      const typeEvenementSafe: TypeEvenement = needsManualDate
        ? "jour_special"
        : (EVENT_TYPE_MAP[eventType] || "jour_special");

      await programmerMessage({
        userId: session.user.id,
        contactId: selectedContact.id.toString(),
        contact: {
          prenom: selectedContact.prenom,
          nom: selectedContact.nom,
          email: selectedContact.email || null,
          date_naissance: selectedContact.date_naissance || null,
        },
        typeEvenement: typeEvenementSafe,
        message: message || "Message généré automatiquement",
        destinataire,
        emailUtilisateur: session.user.email || "",
        dateOverride: dateEnvoi,
        ton: tone,
        eventDate: needsManualDate ? eventDate : undefined,
        eventDescription: needsManualDate ? eventDescription : undefined,
      });

      setProgrammation({
        loading: false,
        message: "✅ Rappel programmé avec succès !",
        isError: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la programmation";
      setProgrammation({
        loading: false,
        message: errorMessage,
        isError: true,
      });
      console.error("Erreur dans handleProgrammer:", err);
    }
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
    // navigator.share = fonction native du navigateur qui ouvre le menu de partage du téléphone
    if (navigator.share) {
      await navigator.share({
        title: "Message Ephemer",
        text: message,
      });
      return;
    }

    // Fallback = solution de secours si le navigateur ne supporte pas le partage natif
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    alert("Le partage direct n'est pas disponible ici. Le message a été copié.");
  } catch (err) {
    console.error("Erreur lors du partage :", err);
  }
}

  // ===== RENDU =====
  return (
    <div className="min-h-screen bg-[#0B1120] text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-8 bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] bg-clip-text text-transparent">
          Générateur de messages personnalisés
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* COLONNE GAUCHE : FORMULAIRE */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">
                👤 Contact <span className="text-red-400">*</span>
              </label>
              <AppSelect
                options={contacts.map((contact) => ({
                  value: String(contact.id),
                  label: `${contact.prenom} ${contact.nom} (${contact.relation})`,
                }))}
                value={selectedContactId}
                onChange={(id) => {
                  const contact = contacts.find((c) => String(c.id) === id);
                  if (contact) appliquerContact(contact);
                  setSelectedContactId(id);
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">
                  Prénom <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!!selectedContact}
                  className="w-full border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 bg-white/5 text-white disabled:opacity-50"
                  placeholder="Jean"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Nom</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!!selectedContact}
                  className="w-full border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 bg-white/5 text-white disabled:opacity-50"
                  placeholder="Dupont"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Âge</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="0"
                max="120"
                className="w-full border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 bg-white/5 text-white"
                placeholder="30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">
                Relation <span className="text-red-400">*</span>
              </label>
              <AppSelect
                options={TYPES_RELATION.map((type) => ({ value: type.value, label: type.label }))}
                value={relation}
                onChange={setRelation}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">
                Type d'événement <span className="text-red-400">*</span>
              </label>
              <AppSelect
                options={TYPES_EVENEMENT.map((type) => ({ value: type.value, label: type.label }))}
                value={eventType}
                onChange={(value) => {
                  setEventType(value);
                  if (!EVENTS_AVEC_DATE_MANUELLE.includes(value)) {
                    setEventDate("");
                    setEventDescription("");
                  }
                }}
              />
            </div>

            {needsManualDate && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">
                    📅 Date de l'événement <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
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

            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">
                Ton du message <span className="text-red-400">*</span>
              </label>
              <AppSelect
                options={TONS_MESSAGE.map((ton) => ({ value: ton.value, label: ton.label }))}
                value={tone}
                onChange={setTone}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={
                loading ||
                !firstName ||
                (needsManualDate && (!eventDate || !eventDescription))
              }
              className="w-full bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3 rounded-xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "⏳ Génération en cours..." : "✨ Générer le message"}
            </button>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">❌ {error}</p>
            )}
          </div>

          {/* COLONNE DROITE : RÉSULTAT */}
          <div className="space-y-6">
            {message && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-[#C8A84E]">💌 Message généré</h3>
                  </div>
                <p className="text-white/90 whitespace-pre-wrap mb-4">{message}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleCopy}
                    className="w-full bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3 rounded-xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition disabled:opacity-50"
                  >
                    {copied ? "✅ Copié !" : "Copier"}
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={!message}
                    className="w-full bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3 rounded-xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition disabled:opacity-50"
                  >
                    📤 Partager
                  </button>
                </div>
              </div>
            )}

            {message && selectedContact && datesPossibles && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                <h3 className="font-semibold text-[#C8A84E]">⏰ Programmer un rappel</h3>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">
                    Destinataire <span className="text-red-400">*</span>
                  </label>
                  <AppSelect
                    options={DESTINATAIRES_RAPPEL.map((opt) => ({ value: opt.value, label: opt.label }))}
                    value={destinataire}
                    onChange={(value) => setDestinataire(value as "moi" | "contact" | "les_deux")}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-white/60 mb-2">Date d'envoi du message</p>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/10 transition">
                      <input
                        type="radio"
                        name="choixDate"
                        checked={choixDate === "jourj"}
                        onChange={() => setChoixDate("jourj")}
                        className="mt-1 accent-[#C8A84E]"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">🎉 Jour J</p>
                        <p className="text-xs text-white/50 capitalize">{formaterDate(datesPossibles.jourj)}</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/10 transition">
                      <input
                        type="radio"
                        name="choixDate"
                        checked={choixDate === "j1"}
                        onChange={() => setChoixDate("j1")}
                        className="mt-1 accent-[#C8A84E]"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">📅 La veille (J-1)</p>
                        <p className="text-xs text-white/50 capitalize">{formaterDate(datesPossibles.j1)}</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/10 transition">
                      <input
                        type="radio"
                        name="choixDate"
                        checked={choixDate === "j7"}
                        onChange={() => setChoixDate("j7")}
                        className="mt-1 accent-[#C8A84E]"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">📆 Une semaine avant (J-7)</p>
                        <p className="text-xs text-white/50 capitalize">{formaterDate(datesPossibles.j7)}</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/10 transition">
                      <input
                        type="radio"
                        name="choixDate"
                        checked={choixDate === "custom"}
                        onChange={() => setChoixDate("custom")}
                        className="mt-1 accent-[#C8A84E]"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">🗓️ Choisir une autre date</p>
                        {choixDate === "custom" && (
                          <input
                            type="date"
                            value={dateCustom}
                            min={dateMin}
                            onChange={(e) => setDateCustom(e.target.value)}
                            className="mt-2 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 bg-white/5 text-white"
                          />
                        )}
                      </div>
                    </label>

                    {getDateEnvoiChoisie() && (
                      <div className="mt-2 bg-white/10 border border-[#C8A84E]/30 rounded-lg px-3 py-2">
                        <p className="text-xs text-[#C8A84E] font-semibold">
                          ✉️ Envoi prévu le :{" "}
                          <span className="capitalize">{formaterDate(getDateEnvoiChoisie()!)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button
    onClick={handleProgrammer}
    disabled={programmation.loading || !getDateEnvoiChoisie()}
    className="w-full bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3 rounded-xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition disabled:opacity-50"
  >
    {programmation.loading ? "Programmation..." : "✅ Programmer"}
  </button>


                {programmation.message && (
                  <p className={`text-xs font-medium rounded-lg px-3 py-2 ${
                    programmation.isError
                      ? "bg-red-500/10 text-red-300"
                      : "bg-green-500/10 text-green-300"
                  }`}>
                    {programmation.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white/50">Chargement...</p>
      </div>
    }>
      <GenerateForm />
    </Suspense>
  );
}
