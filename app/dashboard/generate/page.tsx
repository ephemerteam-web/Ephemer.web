"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { programmerMessage } from "@/lib/rappels";
import { TypeEvenement, calculerDateEvenement } from "@/lib/dates-evenements";
import {
  TYPES_RELATION,
  TONS_MESSAGE,
  TYPES_EVENEMENT,
  DESTINATAIRES_RAPPEL,
} from "@/lib/constants";

type Contact = {
  id: number;
  prenom: string;
  nom: string;
  relation: string;
  date_naissance: string | null;
  email?: string | null;
};

const EVENT_TYPE_MAP: Record<string, TypeEvenement> = {
  anniversaire: "anniversaire",
  fete_prenomale: "fete_prenomale",
};

type ChoixDateEnvoi = "jourj" | "j1" | "j7" | "custom";

function formaterDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function GenerateForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

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

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const [destinataire, setDestinataire] = useState<"moi" | "contact" | "les_deux">("moi");
  const [programmation, setProgrammation] = useState<{
    loading: boolean;
    message: string;
    isError: boolean;
  }>({ loading: false, message: "", isError: false });

  const [choixDate, setChoixDate] = useState<ChoixDateEnvoi>("jourj");
  const [dateCustom, setDateCustom] = useState<string>("");

  useEffect(() => {
    async function loadContactsAndPrefill() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("contacts")
        .select("id, prenom, nom, relation, date_naissance, email")
        .eq("user_id", session.user.id)
        .order("prenom");

      if (error || !data) {
        console.error("Erreur chargement contacts :", error);
        return;
      }

      setContacts(data as Contact[]);

      const contactIdFromUrl = searchParams.get("contactId");
      const eventTypeFromUrl = searchParams.get("eventType");

      if (eventTypeFromUrl) {
        setEventType(eventTypeFromUrl);
      }

      if (contactIdFromUrl) {
        const contactTrouve = (data as Contact[]).find(
          (c) => String(c.id) === contactIdFromUrl
        );
        if (contactTrouve) {
          appliquerContact(contactTrouve);
        }
      }
    }

    loadContactsAndPrefill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        ageCalcule = ageCalcule + 1;
      }
      setAge(String(ageCalcule));
    } else {
      setAge("");
    }
  }

  function handleContactSelect(contactId: string) {
    if (!contactId) {
      setSelectedContactId("");
      setSelectedContact(null);
      setFirstName("");
      setLastName("");
      setAge("");
      setRelation("ami");
      return;
    }

    const contact = contacts.find((c) => String(c.id) === contactId);
    if (contact) appliquerContact(contact);
  }

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setMessage("");
    setCopied(false);
    setProgrammation({ loading: false, message: "", isError: false });

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
        }),
      });

      if (!response.ok) throw new Error("Erreur de l'API");
      const data = await response.json();
      setMessage(data.message);
    } catch (err) {
      setError("Impossible de générer le message. Réessaie.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const datesPossibles = (() => {
    if (!selectedContact) return null;
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

  function getDateEnvoiChoisie(): Date | null {
    if (!datesPossibles) return null;
    if (choixDate === "jourj") return datesPossibles.jourj;
    if (choixDate === "j1") return datesPossibles.j1;
    if (choixDate === "j7") return datesPossibles.j7;
    if (choixDate === "custom" && dateCustom) return new Date(dateCustom);
    return null;
  }

  async function handleProgrammer() {
    setProgrammation({ loading: true, message: "", isError: false });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Tu dois être connecté.");

      if (!selectedContact) {
        throw new Error("Sélectionne un contact dans la liste pour programmer l'envoi.");
      }
      if (!message) {
        throw new Error("Génère d'abord un message.");
      }

      const typeEvenement = EVENT_TYPE_MAP[eventType];
      if (!typeEvenement) {
        throw new Error("Type d'événement non reconnu.");
      }

      if ((destinataire === "contact" || destinataire === "les_deux") && !selectedContact.email) {
        throw new Error(
          `${selectedContact.prenom} n'a pas d'email enregistré. Ajoute-le dans sa fiche contact.`
        );
      }

      const dateEnvoiChoisie = getDateEnvoiChoisie();
      if (!dateEnvoiChoisie) {
        throw new Error("Sélectionne une date d'envoi (ou saisis-en une personnalisée).");
      }

      const maintenant = new Date();
      maintenant.setHours(0, 0, 0, 0);
      if (dateEnvoiChoisie < maintenant) {
        throw new Error("La date d'envoi ne peut pas être dans le passé.");
      }

      const emailUtilisateur = user.email;
      if (!emailUtilisateur) {
        throw new Error("Impossible de récupérer ton email. Reconnecte-toi.");
      }

      await programmerMessage({
        userId: user.id,
        contactId: String(selectedContact.id),
        contact: {
          prenom: selectedContact.prenom,
          nom: selectedContact.nom,
          email: selectedContact.email,
          date_naissance: selectedContact.date_naissance,
        },
        typeEvenement,
        message,
        ton: tone,
        destinataire,
        emailUtilisateur,
        dateOverride: dateEnvoiChoisie,
      });

      setProgrammation({
        loading: false,
        message: "✅ Envoi programmé avec succès !",
        isError: false,
      });
    } catch (err: any) {
      setProgrammation({
        loading: false,
        message: err.message || "Erreur inconnue.",
        isError: true,
      });
    }
  }

  return (
    <div className="p-6">

      <div className="max-w-2xl mx-auto">

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">✨ Générateur de messages</h1>
          <p className="text-white/40 mt-1">Crée un message personnalisé grâce à l'IA en quelques secondes.</p>
        </div>

        <div className="bg-white/5 border border-[#C8A84E]/20 rounded-2xl p-5 mb-6">
          <label className="block text-sm font-semibold text-white/70 mb-2">
            👥 Sélectionner un contact existant
          </label>
          <select
            value={selectedContactId}
            onChange={(e) => handleContactSelect(e.target.value)}
            className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 bg-white/5 text-white"
          >
            <option value="" className="bg-[#0B1120]">-- Saisir manuellement ou choisir un contact --</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id} className="bg-[#0B1120]">
                {contact.prenom} {contact.nom} ({contact.relation})
              </option>
            ))}
          </select>
          {contacts.length === 0 && (
            <p className="text-xs text-white/40 mt-2">
              Aucun contact trouvé.{" "}
              <span
                className="text-[#C8A84E] cursor-pointer hover:underline"
                onClick={() => router.push("/dashboard/contacts")}
              >
                Ajouter des contacts →
              </span>
            </p>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">

          <h2 className="font-semibold text-white/80 text-lg">👤 La personne</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Prénom</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Marie"
                className="w-full border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 bg-white/5 text-white placeholder-white/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Nom</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dupont"
                className="w-full border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 bg-white/5 text-white placeholder-white/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-1">Âge</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="30"
              className="w-full border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 bg-white/5 text-white placeholder-white/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-1">Relation</label>
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="w-full border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 bg-white/5 text-white"
            >
              {TYPES_RELATION.map((r) => (
                <option key={r.value} value={r.value} className="bg-[#0B1120]">
                  {r.emoji} {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-1">Type d'événement</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 bg-white/5 text-white"
            >
              {TYPES_EVENEMENT.map((t) => (
                <option key={t.value} value={t.value} className="bg-[#0B1120]">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <h2 className="font-semibold text-white/80 text-lg pt-2 border-t border-white/10">🎨 Le message</h2>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Ton du message</label>
            <div className="grid grid-cols-2 gap-2">
              {TONS_MESSAGE.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition ${
                    tone === t.value
                      ? "border-[#C8A84E] bg-[#C8A84E]/20 text-[#C8A84E]"
                      : "border-white/10 text-white/50 hover:border-[#C8A84E]/30"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !firstName}
            className="w-full bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3 rounded-xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition disabled:opacity-50"
          >
            {loading ? "Génération..." : "✨ Générer le message"}
          </button>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {message && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Message généré</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 bg-white/5 text-white resize-none"
                />
              </div>

              <button
                onClick={handleCopy}
                className="w-full bg-white/10 text-white/70 font-medium py-2 rounded-xl hover:bg-white/20 transition text-sm"
              >
                {copied ? "✅ Copié !" : "📋 Copier le message"}
              </button>

              {selectedContact && (
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <h3 className="font-semibold text-white/80">📤 Programmer l'envoi</h3>

                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">À qui envoyer ?</label>
                    <div className="grid gap-2">
                      {DESTINATAIRES_RAPPEL.map((d) => {
                        const needsEmail = d.value === "contact" || d.value === "les_deux";
                        const disabled = needsEmail && !selectedContact.email;

                        return (
                          <button
                            key={d.value}
                            onClick={() => !disabled && setDestinataire(d.value as any)}
                            disabled={disabled}
                            className={`text-left py-2 px-3 rounded-xl text-sm border-2 transition ${
                              destinataire === d.value
                                ? "border-[#C8A84E] bg-[#C8A84E]/20 text-[#C8A84E]"
                                : "border-white/10 text-white/60 hover:border-[#C8A84E]/30"
                            } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                          >
                            <p className="font-medium">{d.label}</p>
                            {disabled && <p className="text-xs text-red-400">Pas d'email enregistré</p>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {datesPossibles && (
                    <div className="bg-[#C8A84E]/10 rounded-xl p-4 space-y-2 border border-[#C8A84E]/20">
                      <label className="block text-sm font-semibold text-white/70 mb-1">
                        📅 Quand envoyer ce message ?
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/10 transition">
                        <input
                          type="radio"
                          name="choixDate"
                          checked={choixDate === "jourj"}
                          onChange={() => setChoixDate("jourj")}
                          className="mt-1 accent-[#C8A84E]"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">🎯 Le jour J</p>
                          <p className="text-xs text-white/50 capitalize">
                            {formaterDate(datesPossibles.jourj)}
                          </p>
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
                          <p className="text-sm font-medium text-white">⏰ La veille (J-1)</p>
                          <p className="text-xs text-white/50 capitalize">
                            {formaterDate(datesPossibles.j1)}
                          </p>
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
                          <p className="text-xs text-white/50 capitalize">
                            {formaterDate(datesPossibles.j7)}
                          </p>
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
                  )}

                  <button
                    onClick={handleProgrammer}
                    disabled={programmation.loading}
                    className="w-full bg-gradient-to-r from-[#C8A84E] to-[#D4B85C] text-[#0B1120] font-bold py-3 rounded-xl hover:shadow-[0_0_30px_rgba(200,168,78,0.3)] transition disabled:opacity-50"
                  >
                    {programmation.loading ? "Programmation..." : "✅ Programmer cet envoi"}
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
          )}

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