"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageProgramme = {
  id: number;
  created_at: string;
  type_evenement: string;
  date_envoi: string;
  message: string;
  statut: string;
  source: string;
  ton: string | null;
  email_destinataire: string | null;
  contacts: { prenom: string; nom: string } | { prenom: string; nom: string }[] | null;
};

// ─── Utilitaires ──────────────────────────────────────────────────────────────

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

function extractContactName(contacts: MessageProgramme["contacts"]): string {
  if (!contacts) return "Contact inconnu";
  const c = Array.isArray(contacts) ? contacts[0] : contacts;
  return c ? `${c.prenom} ${c.nom}` : "Contact inconnu";
}

function getRelativeDate(dateISO: string): string {
  const target = new Date(dateISO);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return `Il y a ${Math.abs(diffDays)} jour(s)`;
  if (diffDays === 0) return "📅 Aujourd'hui";
  if (diffDays === 1) return "📅 Demain";
  return `📅 Dans ${diffDays} jours`;
}

// ─── Page Principale ──────────────────────────────────────────────────────────

export default function MessagesProgrammesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [annulationId, setAnnulationId] = useState<number | null>(null);
  const [reactivationId, setReactivationId] = useState<number | null>(null); // 🆕
  const [erreur, setErreur] = useState<string | null>(null);
  const [historiqueVisible, setHistoriqueVisible] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    setLoading(true);
    setErreur(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/connexion");
      return;
    }

    const { data, error } = await supabase
      .from("rappels")
      .select(`
        id, created_at, type_evenement, date_envoi, message, statut, source, ton, email_destinataire,
        contacts (prenom, nom)
      `)
      .eq("user_id", user.id)
      .order("date_envoi", { ascending: true });

    if (error) {
      console.error("Erreur Supabase:", error);
      setErreur("Impossible de charger tes messages. Réessaie ou vérifie ta connexion.");
      setLoading(false);
      return;
    }

    setMessages((data as MessageProgramme[]) || []);
    setLoading(false);
  }

  async function handleAnnuler(id: number) {
    const confirme = window.confirm("Es-tu sûr de vouloir annuler l'envoi de ce message ?");
    if (!confirme) return;

    setAnnulationId(id);
    const { error } = await supabase
      .from("rappels")
      .update({ statut: "annule" })
      .eq("id", id);

    if (error) {
      console.error("Erreur annulation:", error);
      setErreur("Échec de l'annulation. Réessaie.");
    } else {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, statut: "annule" } : m)));
    }
    setAnnulationId(null);
  }

  // 🆕 Fonction pour remettre un message annulé en état "programme"
  async function handleReactiver(id: number) {
    const confirme = window.confirm("Réactiver cet envoi ? Il reprendra sa date d'origine.");
    if (!confirme) return;

    setReactivationId(id);
    const { error } = await supabase
      .from("rappels")
      .update({ statut: "programme" })
      .eq("id", id);

    if (error) {
      console.error("Erreur réactivation:", error);
      setErreur("Échec de la réactivation. Réessaie.");
    } else {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, statut: "programme" } : m)));
    }
    setReactivationId(null);
  }

  const now = new Date();
  const aVenir = messages.filter((m) => m.statut === "programme" && new Date(m.date_envoi) >= now);
  const historique = messages.filter((m) => m.statut !== "programme" || new Date(m.date_envoi) < now);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📅 Messages programmés</h1>
            <p className="text-gray-500 mt-1">Tes envois automatiques à venir et passés.</p>
          </div>
          <button
            onClick={() => router.push("/dashboard/generate")}
            className="bg-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-purple-700 transition"
          >
            + Nouveau
          </button>
        </div>

        {erreur && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4 flex items-start justify-between gap-3">
            <p className="font-medium">⚠️ {erreur}</p>
            <button onClick={() => loadMessages()} className="text-sm font-semibold underline hover:text-red-900 shrink-0">
              Réessayer
            </button>
          </div>
        )}

        {loading && <div className="text-center py-20 text-gray-400">Chargement...</div>}

        {!loading && !erreur && messages.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border-2 border-dashed border-purple-100">
            <div className="text-5xl mb-4">💌</div>
            <p className="text-gray-500 font-medium">Aucun message programmé.</p>
            <button onClick={() => router.push("/dashboard/generate")} className="mt-4 bg-purple-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-purple-700 transition">
              Créer mon premier message →
            </button>
          </div>
        )}

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
                  onReactiver={handleReactiver}
                  estEnCours={annulationId === m.id}
                  estReactivationEnCours={reactivationId === m.id}
                />
              ))}
            </div>
          </section>
        )}

        {historique.length > 0 && (
          <section>
            <button
              onClick={() => setHistoriqueVisible(!historiqueVisible)}
              className="w-full flex items-center justify-between py-3 px-1 text-sm font-bold text-gray-500 uppercase tracking-wider hover:text-purple-600 transition group"
            >
              <span>{historiqueVisible ? "📁 Masquer" : "📂 Déplier"} l'historique ({historique.length})</span>
              <span className={`transform transition-transform duration-300 ${historiqueVisible ? "rotate-180" : ""} group-hover:text-purple-500`}>▼</span>
            </button>
            {historiqueVisible && (
              <div className="flex flex-col gap-3 opacity-75 mt-1">
                {historique.map((m) => (
                  <MessageCard
                    key={m.id}
                    message={m}
                    onAnnuler={handleAnnuler}
                    onReactiver={handleReactiver}
                    estEnCours={false}
                    estReactivationEnCours={false}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

// ─── Composant Carte Message ──────────────────────────────────────────────────

function MessageCard({
  message: m,
  onAnnuler,
  onReactiver,
  estEnCours,
  estReactivationEnCours,
}: {
  message: MessageProgramme;
  onAnnuler: (id: number) => void;
  onReactiver: (id: number) => void;
  estEnCours: boolean;
  estReactivationEnCours: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const dateFR = new Date(m.date_envoi).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const contactNom = extractContactName(m.contacts);
  const joursRestants = getRelativeDate(m.date_envoi);
  const estAnnulable = m.statut === "programme" && new Date(m.date_envoi) > new Date();
  const estAnnule = m.statut === "annule";

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
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
            {dateFR} • <span className="text-purple-600 font-medium">{joursRestants}</span>
          </p>
          {m.ton && <p className="text-xs text-gray-400 mt-0.5">🎨 Ton : {m.ton}</p>}
          {m.email_destinataire && <p className="text-xs text-gray-400 mt-0.5">✉️ {m.email_destinataire}</p>}
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:border-purple-300 hover:text-purple-600 transition"
          >
            {expanded ? "Masquer" : "Voir"}
          </button>

          {estAnnulable && (
            <button
              onClick={() => onAnnuler(m.id)}
              disabled={estEnCours}
              className="text-xs border border-red-200 px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition disabled:opacity-50"
            >
              {estEnCours ? "..." : "Annuler"}
            </button>
          )}

          {/* 🆕 Bouton de réactivation */}
          {estAnnule && (
            <button
              onClick={() => onReactiver(m.id)}
              disabled={estReactivationEnCours}
              className="text-xs border border-green-300 px-3 py-1.5 rounded-lg text-green-600 hover:bg-green-50 transition disabled:opacity-50"
            >
              {estReactivationEnCours ? "..." : "♻️ Réactiver"}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap border border-gray-100">
          {m.message}
        </div>
      )}
    </div>
  );
}
