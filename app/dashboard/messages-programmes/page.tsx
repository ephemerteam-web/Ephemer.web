"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type MessageProgramme = {
  id: number;
  created_at: string;
  type_evenement: string;
  date_envoi: string;
  message: string;
  statut: string;
  source: string;
  ton: string | null;
  destinataire_email: string | null;
  contacts: {
    prenom: string;
    nom: string;
  } | null;
};

// Jolis labels pour les événements
const LABELS: Record<string, string> = {
  anniversaire: "🎂 Anniversaire",
  fete_prenomale: "🌸 Fête prénomale",
  nouvel_an: "🎊 Nouvel An",
  noel: "🎄 Noël",
  saint_valentin: "💝 Saint-Valentin",
  fete_des_meres: "💐 Fête des Mères",
  fete_des_peres: "👔 Fête des Pères",
  paques: "🐰 Pâques",
};

const STATUT_STYLE: Record<string, string> = {
  programme: "bg-blue-100 text-blue-700",
  envoye: "bg-green-100 text-green-700",
  annule: "bg-gray-100 text-gray-500",
};

export default function MessagesProgrammesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [annulation, setAnnulation] = useState<number | null>(null); // id en cours d'annulation

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("rappels")
      .select(`
        id,
        created_at,
        type_evenement,
        date_envoi,
        message,
        statut,
        source,
        ton,
        destinataire_email,
        contacts (prenom, nom)
      `)
      .eq("user_id", user.id)
      .eq("source", "message_programme") // uniquement les messages programmés manuellement
      .order("date_envoi", { ascending: true });

    if (error) console.error(error);
    if (data) setMessages(data as MessageProgramme[]);
    setLoading(false);
  }

  async function handleAnnuler(id: number) {
    setAnnulation(id);
    const { error } = await supabase
      .from("rappels")
      .update({ statut: "annule" })
      .eq("id", id);

    if (error) {
      console.error(error);
    } else {
      // Mise à jour locale sans recharger toute la page
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, statut: "annule" } : m))
      );
    }
    setAnnulation(null);
  }

  // Séparer les messages à venir des passés
  const now = new Date();
  const aVenir = messages.filter(
    (m) => m.statut === "programme" && new Date(m.date_envoi) >= now
  );
  const passes = messages.filter(
    (m) => m.statut !== "programme" || new Date(m.date_envoi) < now
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 md:p-8">

      {/* Header */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-gray-500 hover:text-purple-600 transition"
        >
          ← Retour au dashboard
        </button>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📅 Messages programmés</h1>
            <p className="text-gray-500 mt-1">Tes messages qui seront envoyés automatiquement.</p>
          </div>
          <button
            onClick={() => router.push("/dashboard/generate")}
            className="bg-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-purple-700 transition"
          >
            + Nouveau
          </button>
        </div>

        {loading && (
          <div className="text-center py-20 text-gray-400">Chargement...</div>
        )}

        {!loading && messages.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border-2 border-dashed border-purple-100">
            <div className="text-5xl mb-4">💌</div>
            <p className="text-gray-500 font-medium">Aucun message programmé pour l'instant.</p>
            <p className="text-gray-400 text-sm mt-1">
              Génère un message et clique sur "📅 Programmer ce message".
            </p>
            <button
              onClick={() => router.push("/dashboard/generate")}
              className="mt-4 bg-purple-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-purple-700 transition"
            >
              Créer mon premier message →
            </button>
          </div>
        )}

        {/* Messages à venir */}
        {aVenir.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
              🔜 À envoyer ({aVenir.length})
            </h2>
            <div className="flex flex-col gap-3">
              {aVenir.map((m) => (
                <MessageCard
                  key={m.id}
                  message={m}
                  onAnnuler={handleAnnuler}
                  annulationEnCours={annulation === m.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* Messages passés / annulés */}
        {passes.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
              ✅ Historique ({passes.length})
            </h2>
            <div className="flex flex-col gap-3 opacity-70">
              {passes.map((m) => (
                <MessageCard
                  key={m.id}
                  message={m}
                  onAnnuler={handleAnnuler}
                  annulationEnCours={annulation === m.id}
                />
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}

// ─── Composant carte d'un message ───────────────────────────────────────────
function MessageCard({
  message: m,
  onAnnuler,
  annulationEnCours,
}: {
  message: MessageProgramme;
  onAnnuler: (id: number) => void;
  annulationEnCours: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const dateFR = new Date(m.date_envoi).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const contactNom = m.contacts
    ? `${m.contacts.prenom} ${m.contacts.nom}`
    : "Contact inconnu";

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
      <div className="flex items-start justify-between gap-3">

        {/* Infos principales */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-gray-800">{contactNom}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              {LABELS[m.type_evenement] ?? m.type_evenement}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_STYLE[m.statut] ?? "bg-gray-100 text-gray-500"}`}>
              {m.statut === "programme" ? "⏳ Programmé" : m.statut === "envoye" ? "✅ Envoyé" : "❌ Annulé"}
            </span>
          </div>

          <p className="text-sm text-gray-500">
            📅 {dateFR}
            {m.ton && <span className="ml-2 text-gray-400">· Ton : {m.ton}</span>}
          </p>

          {m.destinataire_email && (
            <p className="text-xs text-gray-400 mt-0.5">
              ✉️ {m.destinataire_email}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:border-purple-300 hover:text-purple-600 transition"
          >
            {expanded ? "Masquer" : "Voir le message"}
          </button>

          {m.statut === "programme" && (
            <button
              onClick={() => onAnnuler(m.id)}
              disabled={annulationEnCours}
              className="text-xs border border-red-200 px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition disabled:opacity-50"
            >
              {annulationEnCours ? "..." : "Annuler"}
            </button>
          )}
        </div>
      </div>

      {/* Message déroulant */}
      {expanded && (
        <div className="mt-4 bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap border border-gray-100">
          {m.message}
        </div>
      )}
    </div>
  );
}
