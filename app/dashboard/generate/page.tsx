"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Type corrigé avec les vrais noms de colonnes
type Contact = {
  id: number;
  prenom: string;
  nom: string;
  relation: string;
  date_naissance: string | null;
};

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

  // Charger les contacts avec les bons noms de colonnes
  useEffect(() => {
    async function loadContacts() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("contacts")
        .select("id, prenom, nom, relation, date_naissance")
        .eq("user_id", session.user.id)
        .order("prenom");

      if (error) console.error("Erreur chargement contacts:", error);
      if (data) setContacts(data);
    }
    loadContacts();
  }, []);

  // Quand un contact est sélectionné
  function handleContactSelect(contactId: string) {
    setSelectedContactId(contactId);

    if (!contactId) {
      setFirstName("");
      setLastName("");
      setRelation("ami");
      setAge("");
      return;
    }

    const contact = contacts.find((c) => c.id === Number(contactId));
    if (!contact) return;

    setFirstName(contact.prenom);
    setLastName(contact.nom || "");
    setRelation(contact.relation || "ami");

    if (contact.date_naissance) {
      const birthYear = new Date(contact.date_naissance).getFullYear();
      const currentYear = new Date().getFullYear();
      setAge(String(currentYear - birthYear));
    } else {
      setAge("");
    }
  }

  // Préremplir depuis les paramètres URL
  useEffect(() => {
    const prenom = searchParams.get("prenom");
    const nom = searchParams.get("nom");
    const rel = searchParams.get("relation");
    const ageParam = searchParams.get("age");

    if (prenom) setFirstName(prenom);
    if (nom) setLastName(nom);
    if (rel) setRelation(rel);
    if (ageParam) setAge(ageParam);
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 md:p-8">

      <div className="max-w-2xl mx-auto mb-6 flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 transition"
        >
          ← Retour au dashboard
        </button>
      </div>

      <div className="max-w-2xl mx-auto">

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">✨ Générateur de messages</h1>
          <p className="text-gray-500 mt-1">Crée un message personnalisé grâce à l'IA en quelques secondes.</p>
        </div>

        {/* Menu déroulant de sélection de contact */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 border-2 border-purple-100">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            👥 Sélectionner un contact existant
          </label>
          <select
            value={selectedContactId}
            onChange={(e) => handleContactSelect(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
          >
            <option value="">-- Saisir manuellement ou choisir un contact --</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.prenom} {contact.nom} ({contact.relation})
              </option>
            ))}
          </select>
          {contacts.length === 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Aucun contact trouvé.{" "}
              <span
                className="text-purple-500 cursor-pointer hover:underline"
                onClick={() => router.push("/contacts")}
              >
                Ajouter des contacts →
              </span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5">
            <h2 className="font-semibold text-gray-700 text-lg">👤 La personne</h2>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Prénom *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Marie"
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nom</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dupont"
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Âge</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="30"
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Relation</label>
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              >
                <option value="famille">Famille</option>
                <option value="ami">Ami(e)</option>
                <option value="collegue">Collègue / Pro</option>
                <option value="connaissance">Connaissance</option>
              </select>
            </div>

            <h2 className="font-semibold text-gray-700 text-lg pt-2 border-t border-gray-100">🎨 Le message</h2>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Type d'événement</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              >
                <option value="anniversaire">🎂 Anniversaire</option>
                <option value="fete-prenomale">🌸 Fête prénomale</option>
                <option value="nouvelle-annee">🎆 Nouvelle année</option>
                <option value="noel">🎄 Noël</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Ton du message</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "formel", label: "🎩 Formel" },
                  { value: "familier", label: "😊 Familier" },
                  { value: "humoristique", label: "😄 Humour" },
                  { value: "poetique", label: "🌹 Poétique" },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition ${
                      tone === t.value
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-gray-200 text-gray-500 hover:border-purple-300"
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
              className={`w-full py-3 rounded-xl font-semibold text-white transition ${
                loading || !firstName
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 cursor-pointer"
              }`}
            >
              {loading ? "✨ L'IA réfléchit..." : "Générer le message →"}
            </button>
          </div>

          <div className="flex flex-col gap-4">

            {!message && !error && !loading && (
              <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center text-center h-full min-h-48 border-2 border-dashed border-purple-100">
                <div className="text-4xl mb-3">💌</div>
                <p className="text-gray-400 text-sm">Ton message apparaîtra ici après génération.</p>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center text-center h-full min-h-48">
                <div className="text-4xl mb-3 animate-bounce">✨</div>
                <p className="text-gray-500 text-sm">L'IA compose ton message...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-600 text-sm">
                ⚠️ {error}
              </div>
            )}

            {message && (
              <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700">💌 Message généré</h3>
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">Prêt ✓</span>
                </div>

                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4">
                  {message}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                      copied
                        ? "bg-green-500 text-white"
                        : "bg-gray-800 text-white hover:bg-gray-700"
                    }`}
                  >
                    {copied ? "✅ Copié !" : "📋 Copier le message"}
                  </button>
                  <button
                    onClick={() => { setMessage(""); setError(""); }}
                    className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:border-gray-400 transition"
                  >
                    🔄 Refaire
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <p className="text-gray-400">Chargement...</p>
      </div>
    }>
      <GenerateForm />
    </Suspense>
  );
}
