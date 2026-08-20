"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase-browser";
import AccordionGroup from "@/components/AccordionGroup";

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
  contacts:
    | { prenom: string; nom: string }
    | { prenom: string; nom: string }[]
    | null;
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

function groupByEventType(messages: MessageProgramme[]) {
  return messages.reduce((acc, message) => {
    const key = message.type_evenement || "autre";
    if (!acc[key]) acc[key] = [];
    acc[key].push(message);
    return acc;
  }, {} as Record<string, MessageProgramme[]>);
}

function formatDateFR(dateISO: string) {
  return new Date(dateISO).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function keyAvenir(type: string) {
  return `avenir:${type}`;
}
function keyHistorique(type: string) {
  return `hist:${type}`;
}

export default function MessagesProgrammesPage() {
  const router = useRouter();
  const supabase = getSupabaseClient()

  const [messages, setMessages] = useState<MessageProgramme[]>([]);
  const [loading, setLoading] = useState(true);

  const [annulationId, setAnnulationId] = useState<number | null>(null);
  const [reactivationId, setReactivationId] = useState<number | null>(null);
  const [suppressionId, setSuppressionId] = useState<number | null>(null);
  const [sauvegardeId, setSauvegardeId] = useState<number | null>(null);

  const [erreur, setErreur] = useState<string | null>(null);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const list = (data as MessageProgramme[]) || [];
    setMessages(list);

    const now = new Date();
    const aVenir = list.filter(
      (m) => m.statut === "programme" && new Date(m.date_envoi) >= now
    );
    const groupedAVenir = groupByEventType(aVenir);

    const firstType = Object.keys(groupedAVenir)[0];
    if (firstType) {
      setOpenGroups((prev) => ({
        ...prev,
        [keyAvenir(firstType)]: true,
      }));
    }

    setLoading(false);
  }

  function toggleGroup(groupKey: string) {
    setOpenGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
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

  async function handleSupprimer(id: number) {
    const confirme = window.confirm(
      "⚠️ Supprimer définitivement ce message ? Cette action est irréversible."
    );
    if (!confirme) return;

    setSuppressionId(id);

    const { error } = await supabase.from("rappels").delete().eq("id", id);

    if (error) {
      console.error("Erreur suppression:", error);
      setErreur("Échec de la suppression. Réessaie.");
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }

    setSuppressionId(null);
  }

  async function handleModifier(id: number, nouveauTexte: string) {
    setSauvegardeId(id);

    const { error } = await supabase
      .from("rappels")
      .update({ message: nouveauTexte })
      .eq("id", id);

    if (error) {
      console.error("Erreur modification:", error);
      setErreur("Échec de l'enregistrement. Réessaie.");
      setSauvegardeId(null);
      return false;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, message: nouveauTexte } : m))
    );
    setSauvegardeId(null);
    return true;
  }

  const now = new Date();

  const aVenir = useMemo(() => {
    return messages.filter((m) => m.statut === "programme" && new Date(m.date_envoi) >= now);
  }, [messages, now]);

  const historique = useMemo(() => {
    return messages.filter((m) => m.statut !== "programme" || new Date(m.date_envoi) < now);
  }, [messages, now]);

  const groupedAVenir = useMemo(() => groupByEventType(aVenir), [aVenir]);
  const groupedHistorique = useMemo(() => groupByEventType(historique), [historique]);

  const allMessagesCount = messages.length;

  return (
    // 🔧 MOBILE FIX : padding réduit sur mobile
    <div className="p-3 sm:p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* 🔧 MOBILE FIX : espacement et taille de titre adaptés mobile */}
        <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">📅 Messages programmés</h1>
            <p className="text-white/40 mt-1 text-xs sm:text-sm">Regroupés par événement. À venir + historique.</p>
          </div>

          <button
            onClick={() => router.push("/dashboard/generate")}
            className="bg-[#C8A84E] text-[#0B1120] font-bold text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-xl hover:bg-[#D4B85C] transition shrink-0"
          >
            + Nouveau
          </button>
        </div>

        {erreur && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 sm:p-4 rounded-xl mb-4 flex items-start justify-between gap-3">
            <p className="font-medium text-sm">⚠️ {erreur}</p>
            <button
              onClick={() => loadMessages()}
              className="text-sm font-semibold underline hover:text-red-100 shrink-0"
            >
              Réessayer
            </button>
          </div>
        )}

        {loading && <div className="text-center py-20 text-white/40">Chargement...</div>}

        {!loading && !erreur && allMessagesCount === 0 && (
          <div className="bg-white/5 border border-dashed border-[#C8A84E]/20 rounded-2xl p-8 sm:p-12 text-center">
            <div className="text-5xl mb-4">💌</div>
            <p className="text-white/60 font-medium">Aucun message programmé.</p>
            <button
              onClick={() => router.push("/dashboard/generate")}
              className="mt-4 bg-[#C8A84E] text-[#0B1120] font-bold text-sm px-5 py-2 rounded-xl hover:bg-[#D4B85C] transition"
            >
              Créer mon premier message →
            </button>
          </div>
        )}

        {/* ✅ À VENIR */}
        {aVenir.length > 0 && (
          <section className="mb-6 sm:mb-8">
            <h2 className="text-xs sm:text-sm font-bold text-white/50 uppercase tracking-wider mb-3">
              🔜 À envoyer ({aVenir.length})
            </h2>

            {/* 🔧 MOBILE FIX : gap réduit sur mobile */}
            <div className="flex flex-col gap-3 sm:gap-4">
              {Object.entries(groupedAVenir).map(([type, msgs]) => {
                const groupKey = keyAvenir(type);
                const open = !!openGroups[groupKey];
                const label = LABELS[type] ?? type;

                return (
                  <AccordionGroup
                    key={groupKey}
                    title={label}
                    count={msgs.length}
                    open={open}
                    onToggle={() => toggleGroup(groupKey)}
                  >
                    {msgs
                      .slice()
                      .sort(
                        (x, y) =>
                          new Date(x.date_envoi).getTime() - new Date(y.date_envoi).getTime()
                      )
                      .map((m) => (
                        <MessageCard
                          key={m.id}
                          message={m}
                          onAnnuler={handleAnnuler}
                          onReactiver={handleReactiver}
                          onSupprimer={handleSupprimer}
                          onModifier={handleModifier}
                          estEnCours={annulationId === m.id}
                          estReactivationEnCours={reactivationId === m.id}
                          estSuppressionEnCours={suppressionId === m.id}
                          estSauvegardeEnCours={sauvegardeId === m.id}
                        />
                      ))}
                  </AccordionGroup>
                );
              })}
            </div>
          </section>
        )}

        {/* ✅ HISTORIQUE */}
        {historique.length > 0 && (
          <section>
            <h2 className="text-xs sm:text-sm font-bold text-white/50 uppercase tracking-wider mb-3">
              📁 Historique ({historique.length})
            </h2>

            {/* 🔧 MOBILE FIX : gap réduit sur mobile */}
            <div className="flex flex-col gap-3 sm:gap-4">
              {Object.entries(groupedHistorique).map(([type, msgs]) => {
                const groupKey = keyHistorique(type);
                const open = !!openGroups[groupKey];
                const label = LABELS[type] ?? type;

                return (
                  <AccordionGroup
                    key={groupKey}
                    title={label}
                    count={msgs.length}
                    open={open}
                    onToggle={() => toggleGroup(groupKey)}
                  >
                    {msgs
                      .slice()
                      .sort(
                        (x, y) =>
                          new Date(y.date_envoi).getTime() - new Date(x.date_envoi).getTime()
                      )
                      .map((m) => (
                        <MessageCard
                          key={m.id}
                          message={m}
                          onAnnuler={handleAnnuler}
                          onReactiver={handleReactiver}
                          onSupprimer={handleSupprimer}
                          onModifier={handleModifier}
                          estEnCours={false}
                          estReactivationEnCours={false}
                          estSuppressionEnCours={suppressionId === m.id}
                          estSauvegardeEnCours={sauvegardeId === m.id}
                        />
                      ))}
                  </AccordionGroup>
                );
              })}
            </div>
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
  onSupprimer,
  onModifier,
  estEnCours,
  estReactivationEnCours,
  estSuppressionEnCours,
  estSauvegardeEnCours,
}: {
  message: MessageProgramme;
  onAnnuler: (id: number) => void;
  onReactiver: (id: number) => void;
  onSupprimer: (id: number) => void;
  onModifier: (id: number, nouveauTexte: string) => Promise<boolean>;
  estEnCours: boolean;
  estReactivationEnCours: boolean;
  estSuppressionEnCours: boolean;
  estSauvegardeEnCours: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [enEdition, setEnEdition] = useState(false);
  const [texteEdite, setTexteEdite] = useState(m.message);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [partageMsg, setPartageMsg] = useState<string | null>(null);

  const contactNom = extractContactName(m.contacts);
  const joursRestants = getRelativeDate(m.date_envoi);

  const estAnnulable = m.statut === "programme" && new Date(m.date_envoi) > new Date();
  const estAnnule = m.statut === "annule";
  const estModifiable = m.statut === "programme";
  const dateFR = formatDateFR(m.date_envoi);

  function handleCarteClick() {
    if (expanded && !enEdition) {
      setExpanded(false);
    }
  }

  async function handlePartager() {
    const texte = m.message;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Message pour ${contactNom}`,
          text: texte,
        });
      } else {
        await navigator.clipboard.writeText(texte);
        setPartageMsg("📋 Message copié !");
        setTimeout(() => setPartageMsg(null), 2000);
      }
    } catch (err) {
      console.log("Partage annulé ou échoué", err);
    }
  }

  async function handleCopierTexte(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(m.message);
      setPartageMsg("📋 Copié !");
      setTimeout(() => setPartageMsg(null), 2000);
    } catch (err) {
      console.log("Copie échouée", err);
      setPartageMsg("❌ Impossible de copier");
      setTimeout(() => setPartageMsg(null), 2000);
    }
  }

  function annulerEdition() {
    setTexteEdite(m.message);
    setEnEdition(false);
  }

  async function sauvegarder() {
    const ok = await onModifier(m.id, texteEdite.trim());
    if (ok) setEnEdition(false);
  }

  return (
    // 🔧 MOBILE FIX : overflow-hidden empêche la carte de déborder + padding adapté mobile
    <div
      onClick={handleCarteClick}
      className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 md:p-5 transition hover:bg-white/10 overflow-hidden"
    >
      {/* 🔧 MOBILE FIX : layout en colonne sur très petit écran si nécessaire */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        {/* 🔧 MOBILE FIX : min-w-0 essentiel pour que le texte puisse se tronquer/casser */}
        <div className="flex-1 min-w-0">
          {/* 🔧 MOBILE FIX : gap réduit, badges avec truncate sur le nom */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
            <span className="font-semibold text-white text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">
              {contactNom}
            </span>

            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-[#C8A84E]/20 text-[#C8A84E] shrink-0">
              {LABELS[m.type_evenement] ?? m.type_evenement}
            </span>

            <span
              className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium shrink-0 ${
                STATUT_STYLE[m.statut] ?? "bg-white/10 text-white/40"
              }`}
            >
              {m.statut === "programme" ? "⏳ Programmé" : m.statut === "envoye" ? "✅ Envoyé" : "❌ Annulé"}
            </span>
          </div>

          {/* 🔧 MOBILE FIX : break-words pour casser les dates longues + texte plus petit sur mobile */}
          <p className="text-xs sm:text-sm text-white/50 break-words">
            {dateFR} • <span className="text-[#C8A84E] font-medium">{joursRestants}</span>
          </p>

          {m.ton && <p className="text-[10px] sm:text-xs text-white/40 mt-0.5 break-words">🎨 Ton : {m.ton}</p>}
          {m.email_destinataire && (
            <p className="text-[10px] sm:text-xs text-white/40 mt-0.5 break-words truncate">✉️ {m.email_destinataire}</p>
          )}
        </div>

        {/* 🔧 MOBILE FIX : boutons plus compacts sur mobile, pas de flex-wrap qui pousse */}
        <div className="flex gap-1.5 sm:gap-2 shrink-0 items-center">
          {!expanded ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
              className="text-[10px] sm:text-xs border border-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-white/50 hover:border-[#C8A84E]/30 hover:text-[#C8A84E] transition whitespace-nowrap"
            >
              👁️ <span className="hidden sm:inline">Voir</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePartager();
              }}
              className="text-[10px] sm:text-xs border border-[#C8A84E]/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[#C8A84E] hover:bg-[#C8A84E]/10 transition whitespace-nowrap"
            >
              📤 <span className="hidden sm:inline">Partager</span>
            </button>
          )}

          {estModifiable && !enEdition && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
                setEnEdition(true);
              }}
              className="text-[10px] sm:text-xs border border-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-white/50 hover:border-[#C8A84E]/30 hover:text-[#C8A84E] transition whitespace-nowrap"
            >
              ✏️ <span className="hidden sm:inline">Modifier</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOuvert((v) => !v);
              }}
              className="text-base sm:text-lg leading-none border border-white/10 px-2 sm:px-3 py-1 rounded-lg text-white/50 hover:border-white/30 hover:text-white transition"
            >
              ⋯
            </button>

            {menuOuvert && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOuvert(false);
                  }}
                />

                {/* 🔧 MOBILE FIX : menu positionné pour ne pas déborder à droite sur mobile */}
                <div className="absolute right-0 mt-2 w-40 sm:w-44 bg-[#0B1120] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden">
                  {estAnnulable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOuvert(false);
                        onAnnuler(m.id);
                      }}
                      disabled={estEnCours}
                      className="w-full text-left text-xs sm:text-sm px-3 sm:px-4 py-2.5 text-orange-300 hover:bg-white/5 transition disabled:opacity-50"
                    >
                      {estEnCours ? "..." : "🚫 Annuler l'envoi"}
                    </button>
                  )}

                  {estAnnule && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOuvert(false);
                        onReactiver(m.id);
                      }}
                      disabled={estReactivationEnCours}
                      className="w-full text-left text-xs sm:text-sm px-3 sm:px-4 py-2.5 text-green-300 hover:bg-white/5 transition disabled:opacity-50"
                    >
                      {estReactivationEnCours ? "..." : "♻️ Réactiver"}
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOuvert(false);
                      onSupprimer(m.id);
                    }}
                    disabled={estSuppressionEnCours}
                    className="w-full text-left text-xs sm:text-sm px-3 sm:px-4 py-2.5 text-red-300 hover:bg-red-500/10 transition disabled:opacity-50 border-t border-white/10"
                  >
                    {estSuppressionEnCours ? "..." : "🗑️ Supprimer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {partageMsg && (
        <p className="text-xs text-green-300 mt-2 text-right">{partageMsg}</p>
      )}

      {expanded && (
        <div className="mt-3 sm:mt-4">
          {enEdition ? (
            <div className="flex flex-col gap-2 sm:gap-3" onClick={(e) => e.stopPropagation()}>
              <textarea
                value={texteEdite}
                onChange={(e) => setTexteEdite(e.target.value)}
                rows={6}
                className="w-full bg-white/5 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-white/90 border border-[#C8A84E]/30 focus:outline-none focus:border-[#C8A84E] resize-y"
                placeholder="Écris ton message ici..."
              />
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={sauvegarder}
                  disabled={estSauvegardeEnCours || !texteEdite.trim()}
                  className="text-xs sm:text-sm bg-[#C8A84E] text-[#0B1120] font-bold px-3 sm:px-4 py-2 rounded-lg hover:bg-[#D4B85C] transition disabled:opacity-50"
                >
                  {estSauvegardeEnCours ? "Enregistrement..." : "💾 Enregistrer"}
                </button>
                <button
                  onClick={annulerEdition}
                  disabled={estSauvegardeEnCours}
                  className="text-xs sm:text-sm border border-white/20 px-3 sm:px-4 py-2 rounded-lg text-white/60 hover:bg-white/5 transition disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            // 🔧 MOBILE FIX : break-words + overflow-hidden sur le message = PLUS D'ÉTIREMENT
            <div
              onClick={handleCopierTexte}
              title="Cliquer pour copier le message"
              className="group cursor-pointer bg-white/5 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-white/70 whitespace-pre-wrap break-words overflow-hidden border border-white/10 hover:border-[#C8A84E]/30 hover:bg-white/10 transition relative"
            >
              {m.message}
              <span className="block mt-3 text-[10px] sm:text-[11px] text-white/30 group-hover:text-[#C8A84E]/60 transition">
                📋 Cliquer pour copier
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}