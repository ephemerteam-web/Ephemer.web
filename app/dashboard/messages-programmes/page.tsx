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
  email_destinataire: string | null;
  contacts: { prenom: string; nom: string } | { prenom: string; nom: string }[] | null;
};

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
  programme: "bg-blue-500/20 text-blue-300",
  envoye: "bg-green-500/20 text-green-300",
  annule: "bg-white/10 text-white/40",
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

export default function MessagesProgrammesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [annulationId, setAnnulationId] = useState<number | null>(null);
  const [reactivationId, setReactivationId] = useState<number | null>(null);
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
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white">📅 Messages programmés</h1>
            <p className="text-white/40 mt-1">Tes envois automatiques à venir et passés.</p>
          </div>
          <button
            onClick={() => router.push("/dashboard/generate")}
            className="bg-[#C8A84E] text-[#0B1120] font-bold text-sm px-4 py-2 rounded-xl hover:bg-[#D4B85C] transition shrink-0"
          >
            + Nouveau
          </button>
        </div>

        {erreur && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-xl mb-4 flex items-start justify-between gap-3">
            <p className="font-medium">⚠️ {erreur}</p>
            <button onClick={() => loadMessages()} className="text-sm font-semibold underline hover:text-red-100 shrink-0">
              Réessayer
            </button>
          </div>
        )}

        {loading && <div className="text-center py-20 text-white/40">Chargement...</div>}

        {!loading && !erreur && messages.length === 0 && (
          <div className="bg-white/5 border border-dashed border-[#C8A84E]/20 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4">💌</div>
            <p className="text-white/60 font-medium">Aucun message programmé.</p>
            <button onClick={() => router.push("/dashboard/generate")} className="mt-4 bg-[#C8A84E] text-[#0B1120] font-bold text-sm px-5 py-2 rounded-xl hover:bg-[#D4B85C] transition">
              Créer mon premier message →
            </button>
          </div>
        )}

        {aVenir.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">
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
              className="w-full flex items-center justify-between py-3 px-1 text-sm font-bold text-white/50 uppercase tracking-wider hover:text-[#C8A84E] transition group"
            >
              <span>{historiqueVisible ? "📁 Masquer" : "📂 Déplier"} l'historique ({historique.length})</span>
              <span className={`transform transition-transform duration-300 ${historiqueVisible ? "rotate-180" : ""} group-hover:text-[#C8A84E]`}>▼</span>
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
    </div>
  );
}

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
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 transition hover:bg-white/10">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-white">{contactNom}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#C8A84E]/20 text-[#C8A84E]">
              {LABELS[m.type_evenement] ?? m.type_evenement}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_STYLE[m.statut] ?? "bg-white/10 text-white/40"}`}>
              {m.statut === "programme" ? "⏳ Programmé" : m.statut === "envoye" ? "✅ Envoyé" : "❌ Annulé"}
            </span>
          </div>

          <p className="text-sm text-white/50">
            {dateFR} • <span className="text-[#C8A84E] font-medium">{joursRestants}</span>
          </p>
          {m.ton && <p className="text-xs text-white/40 mt-0.5">🎨 Ton : {m.ton}</p>}
          {m.email_destinataire && <p className="text-xs text-white/40 mt-0.5">✉️ {m.email_destinataire}</p>}
        </div>

        <div className="flex gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs border border-white/10 px-3 py-1.5 rounded-lg text-white/50 hover:border-[#C8A84E]/30 hover:text-[#C8A84E] transition"
          >
            {expanded ? "Masquer" : "Voir"}
          </button>

          {estAnnulable && (
            <button
              onClick={() => onAnnuler(m.id)}
              disabled={estEnCours}
              className="text-xs border border-red-500/30 px-3 py-1.5 rounded-lg text-red-300 hover:bg-red-500/10 transition disabled:opacity-50"
            >
              {estEnCours ? "..." : "Annuler"}
            </button>
          )}

          {estAnnule && (
            <button
              onClick={() => onReactiver(m.id)}
              disabled={estReactivationEnCours}
              className="text-xs border border-green-500/30 px-3 py-1.5 rounded-lg text-green-300 hover:bg-green-500/10 transition disabled:opacity-50"
            >
              {estReactivationEnCours ? "..." : "♻️ Réactiver"}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 bg-white/5 rounded-xl p-4 text-sm text-white/70 whitespace-pre-wrap border border-white/10">
          {m.message}
        </div>
      )}
    </div>
  );
}