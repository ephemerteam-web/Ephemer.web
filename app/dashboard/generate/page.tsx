"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { programmerMessage } from "@/lib/rappels";
import AppSelect from "@/components/AppSelect";
import { TypeEvenement, calculerDateEvenement } from "@/lib/dates-evenements";
import { formaterDateFR, calculerDatesJ7J1JourJ } from "@/lib/anniversaires";
import {
  TYPES_RELATION,
  TONS_MESSAGE,
  TYPES_EVENEMENT,
  EVENT_TYPE_MAP,
  necessiteDateManuelle,
} from "@/lib/constants";
import { genererMessage } from "@/lib/api-messages";
import ProgrammerRappel from "@/components/ProgrammerRappel";



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
  jourJ: Date;
  j1: Date;
  j7: Date;
};

type ChoixDateEnvoi = "jourJ" | "j1" | "j7" | "custom";

// ============================================================
// 🔧 HELPER : prochaine occurrence annuelle d'une date
// ============================================================
// Prend une date (ex: 15/03/2015) et retourne la prochaine fois
// que ce jour/mois reviendra (ex: 15/03/2026 si on est en avril 2025)
function prochaineOccurrenceAnnuelle(dateOriginale: Date): Date {
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  const prochaine = new Date(
    aujourdhui.getFullYear(),
    dateOriginale.getMonth(),
    dateOriginale.getDate()
  );

  // Si la date est déjà passée cette année → on prend l'an prochain
  if (prochaine < aujourdhui) {
    prochaine.setFullYear(prochaine.getFullYear() + 1);
  }

  return prochaine;
}

// ============================================================
// 🎨 COMPOSANT PRINCIPAL
// ============================================================
function GenerateForm() {
  const searchParams = useSearchParams();
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
  const [session, setSession] = useState<any | null>(null);
  const [choixDate, setChoixDate] = useState<ChoixDateEnvoi>("jourJ");
  const [dateCustom, setDateCustom] = useState<string>("");
  const [eventDate, setEventDate] = useState<string>("");
  const [eventDescription, setEventDescription] = useState<string>("");
  const [searchContact, setSearchContact] = useState("");


  // ✅ Helper : est-ce un événement avec date manuelle ?
  const needsManualDate = necessiteDateManuelle(eventType);

  // ===== EFFETS =====
  useEffect(() => {
    async function loadContactsAndPrefill() {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
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
    // ✅ On calcule la date réelle de l'événement pour l'envoyer à l'IA
    let dateEvenementPourIA: string | null = null;

    if (needsManualDate && eventDate) {
      // Événement manuel (jour_special) : on prend la date saisie
      dateEvenementPourIA = eventDate;
    } else if (datesPossibles) {
      // Événement automatique (anniversaire, fête...) : on prend le jour J calculé
      dateEvenementPourIA = datesPossibles.jourJ.toISOString().split("T")[0];
    }

    const messageGenere = await genererMessage({
      firstName,
      lastName,
      age: age ? parseInt(age) : null,
      relation,
      tone,
      eventType,
      eventDate: dateEvenementPourIA,           // ✅ toujours renseigné si possible
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



  // ✅ Calcul des dates possibles (typage strict)
  const datesPossibles: DatesPossibles | null = (() => {
  if (!selectedContact) return null;

  // Cas 1 : Événement avec date manuelle
// → On calcule la prochaine occurrence annuelle (même si date passée)
if (needsManualDate && eventDate) {
  const dateSaisie = new Date(eventDate);
  const prochaineDate = prochaineOccurrenceAnnuelle(dateSaisie);
  return calculerDatesJ7J1JourJ(prochaineDate);
}


  // Cas 2 : Événements automatiques
  const typeEvt = EVENT_TYPE_MAP[eventType];
  if (!typeEvt) return null;

  const dateEvenement = calculerDateEvenement(typeEvt, {
    prenom: selectedContact.prenom,
    date_naissance: selectedContact.date_naissance,
  });
  if (!dateEvenement) return null;

  return calculerDatesJ7J1JourJ(dateEvenement);
})();

// Liste des contacts filtrés par la barre de recherche
const contactsFiltres = contacts.filter((contact) =>
  `${contact.prenom} ${contact.nom} ${contact.relation}`
    .toLowerCase()
    .includes(searchContact.toLowerCase())
);
  const dateMin = new Date().toISOString().split("T")[0];

  // ✅ CORRIGÉ : Typage strict (pas d'accès dynamique problématique)
  function getDateEnvoiChoisie(): Date | null {
    if (!datesPossibles) return null;

    if (choixDate === "custom") {
      return dateCustom ? new Date(dateCustom) : null;
    }
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
  <label className="block text-sm font-medium text-white/60 mb-2">
    👤 Contact <span className="text-red-400">*</span>
  </label>

  {/* Barre de recherche intégrée */}
  <div className="relative mb-3">
    <input
      type="text"
      placeholder="Tape le prénom, nom ou relation..."
      value={searchContact}
      onChange={(e) => setSearchContact(e.target.value)}
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

  {/* Liste des contacts filtrés (style contacts page) */}
  {!selectedContact && (
    <div className="max-h-[280px] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/10">
      {contactsFiltres.length > 0 ? (
        contactsFiltres.map((contact) => (
          <button
            key={contact.id}
            type="button"
            onClick={() => {
              appliquerContact(contact);
              setSelectedContactId(String(contact.id));
              setSearchContact("");
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

  {/* Contact sélectionné (joli badge) */}
  {selectedContact && (
    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
      <div>
        <div className="font-semibold text-white">
          {selectedContact.prenom} {selectedContact.nom}
        </div>
        <div className="text-xs text-white/60 capitalize">{selectedContact.relation}</div>
      </div>

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
        className="text-xs px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 active:bg-red-500/30 transition flex items-center gap-1.5"
      >
        <span>Changer</span>
      </button>
    </div>
  )}
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
                  if (!necessiteDateManuelle(value)) {
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
      <h3 className="font-semibold text-[#C8A84E]">💌 Message généré (modifiable)</h3>
    </div>

    <textarea
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      className="w-full min-h-[140px] bg-white/5 border border-white/10 rounded-xl p-4 text-white/90 resize-y focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 text-sm leading-relaxed"
      placeholder="Votre message personnalisé..."
    />

    <div className="grid grid-cols-2 gap-3 mt-4">
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


{/* 🔍 DEBUG TEMPORAIRE - à supprimer après */}
<div className="bg-yellow-500/10 border border-yellow-500/40 rounded-lg p-3 text-xs text-yellow-200 space-y-1">
  <p>🔍 Debug affichage ProgrammerRappel :</p>
  <p>• message : {message ? "✅ OK" : "❌ vide"}</p>
  <p>• selectedContact : {selectedContact ? `✅ ${selectedContact.prenom}` : "❌ null"}</p>
  <p>• datesPossibles : {datesPossibles ? "✅ OK" : "❌ null"}</p>
  <p>• session : {session ? "✅ OK" : "❌ null"}</p>
  <p>• eventType : {eventType}</p>
</div>

            {message && selectedContact && session && (
  <>
    <>
  <ProgrammerRappel
    session={session}
    selectedContact={selectedContact}
    message={message}
    tone={tone}
    eventType={eventType}
    datesPossibles={datesPossibles ?? undefined}
  />

  {!datesPossibles && (
    <div className="bg-orange-500/10 border border-orange-500/40 rounded-lg p-3 text-xs text-orange-200">
      ℹ️ Pas de date automatique pour cet événement.
      {eventType === "fete_prenomale" && (
        <p className="mt-1">
          Le prénom <strong>{selectedContact.prenom}</strong> n'a pas été trouvé
          dans notre calendrier des saints.
        </p>
      )}
      {eventType === "anniversaire" && !selectedContact.date_naissance && (
        <p className="mt-1">
          Ce contact n'a pas de <strong>date de naissance</strong> renseignée.
        </p>
      )}
      <p className="mt-2">
        👉 Utilise <strong>📆 Date personnalisée</strong> ci-dessus pour choisir manuellement.
      </p>
    </div>
  )}
</>

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
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white/50">Chargement...</p>
      </div>
    }>
      <GenerateForm />
    </Suspense>
  );
}
