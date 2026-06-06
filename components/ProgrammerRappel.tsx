"use client";

import { useState } from "react";
import { programmerMessage } from "@/lib/rappels";
import { DESTINATAIRES_RAPPEL } from "@/lib/constants";
import type { Destinataire } from "@/lib/rappels";
import { formaterDateFR } from "@/lib/anniversaires";

// ============================================================
// 📌 TYPES
// ============================================================

type Contact = {
  id: string | number;
  prenom: string;
  nom: string;
  email?: string | null;
  date_naissance?: string | null;
};

type DatesPossibles = {
  j7: Date;
  j1: Date;
  jourJ: Date;
};

type Session = {
  user: {
    id: string;
    email?: string | null;
  };
};

type Props = {
  session: Session;
  selectedContact: Contact;
  message: string;
  tone: string;
  eventType: string;
  datesPossibles?: DatesPossibles | null; // ✅ optionnel maintenant
};

// ============================================================
// 🎨 COMPOSANT
// ============================================================

export default function ProgrammerRappel({
  session,
  selectedContact,
  message,
  tone,
  eventType,
  datesPossibles,
}: Props) {
  const [destinataire, setDestinataire] = useState<Destinataire>("moi");
  const [dateEnvoi, setDateEnvoi] = useState<Date | null>(
    datesPossibles?.jourJ ?? null
  );

  // 🆕 État pour la date personnalisée
  const [modePerso, setModePerso] = useState(false);
  const [datePerso, setDatePerso] = useState<string>("");

  const [programmation, setProgrammation] = useState({
    loading: false,
    success: false,
    error: "",
  });

  // 🆕 Helper : convertit la string "YYYY-MM-DD" en Date à 9h du matin
  function appliquerDatePerso(value: string) {
    setDatePerso(value);
    if (value) {
      const [annee, mois, jour] = value.split("-").map(Number);
      const d = new Date(annee, mois - 1, jour, 9, 0, 0);
      setDateEnvoi(d);
    } else {
      setDateEnvoi(null);
    }
  }

  async function handleProgrammer() {
    setProgrammation({ loading: true, success: false, error: "" });

    // 🛡️ Sécurité : on doit avoir une date
    if (!dateEnvoi) {
      setProgrammation({
        loading: false,
        success: false,
        error: "Merci de choisir une date d'envoi.",
      });
      return;
    }

    try {
      const typeEvenementSafe = (eventType || "anniversaire") as
        | "anniversaire"
        | "fete_prenomale"
        | "jour_special";

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
      });

      setProgrammation({ loading: false, success: true, error: "" });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setProgrammation({ loading: false, success: false, error: errorMessage });
      console.error("Erreur programmation:", err);
    }
  }

  // 🆕 Date min pour le champ date = aujourd'hui (format YYYY-MM-DD)
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
      <h3 className="font-semibold text-[#C8A84E]">📅 Programmer un rappel</h3>

      {/* Choix du destinataire */}
      <div>
        <label className="block text-sm text-white/80 mb-2">Envoyer à :</label>
        <select
          value={destinataire}
          onChange={(e) => setDestinataire(e.target.value as Destinataire)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
        >
          {DESTINATAIRES_RAPPEL.map((d) => (
            <option key={d.value} value={d.value} className="bg-gray-800">
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* Choix de la date d'envoi */}
      <div>
        <label className="block text-sm text-white/80 mb-2">Date d'envoi :</label>
        <div className="space-y-2">
          {/* Boutons rapides J-7 / J-1 / Jour J (seulement si datesPossibles dispo) */}
          {datesPossibles &&
            [
              { date: datesPossibles.j7, label: "J-7 (une semaine avant)" },
              { date: datesPossibles.j1, label: "J-1 (la veille)" },
              { date: datesPossibles.jourJ, label: "Le jour J" },
            ].map(({ date, label }) => (
              <button
                key={label}
                onClick={() => {
                  setModePerso(false);
                  setDateEnvoi(date);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                  !modePerso && dateEnvoi?.getTime() === date?.getTime()
                    ? "bg-[#C8A84E]/20 border-[#C8A84E] text-white"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                <span className="font-medium">{label}</span>
                <br />
                <span className="text-xs">{formaterDateFR(date)}</span>
              </button>
            ))}

          {/* 🆕 Bouton "Date personnalisée" */}
          <button
            onClick={() => {
              setModePerso(true);
              setDateEnvoi(null);
              setDatePerso("");
            }}
            className={`w-full text-left px-3 py-2 rounded-lg border transition ${
              modePerso
                ? "bg-[#C8A84E]/20 border-[#C8A84E] text-white"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
            }`}
          >
            <span className="font-medium">📆 Date personnalisée</span>
          </button>

          {/* 🆕 Champ date qui apparaît si mode perso activé */}
          {modePerso && (
            <input
              type="date"
              value={datePerso}
              min={today}
              onChange={(e) => appliquerDatePerso(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            />
          )}
        </div>
      </div>

      {/* Bouton programmer */}
      <button
        onClick={handleProgrammer}
        disabled={programmation.loading || !message || !dateEnvoi}
        className="w-full bg-[#C8A84E] hover:bg-[#B89742] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold px-4 py-3 rounded-lg transition"
      >
        {programmation.loading ? "⏳ Programmation..." : "✅ Programmer le rappel"}
      </button>

      {/* Messages de retour */}
      {programmation.success && (
        <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-3 text-green-200 text-sm">
          ✅ Rappel programmé avec succès !
        </div>
      )}
      {programmation.error && (
        <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 text-red-200 text-sm">
          ❌ {programmation.error}
        </div>
      )}
    </div>
  );
}
