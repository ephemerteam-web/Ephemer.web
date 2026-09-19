"use client";

import { Button, Notice } from '@/components/ui';
import { useState } from "react";
import { programmerMessage } from "@/lib/rappels";
import { DESTINATAIRES_RAPPEL } from "@/lib/constants";
import type { Destinataire } from "@/lib/rappels";
import { formaterDateFR, formatDateLocale } from "@/lib/date-utils";

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
    if (programmation.loading || programmation.success) return;
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
        eventDate: datesPossibles ? formatDateLocale(datesPossibles.jourJ) : undefined,
      });

      setProgrammation({ loading: false, success: true, error: "" });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setProgrammation({ loading: false, success: false, error: errorMessage });
      console.error("Erreur programmation:", err);
    }
  }

  // 🆕 Date min pour le champ date = aujourd'hui (format YYYY-MM-DD)
  const today = formatDateLocale(new Date());

  return (
    <div className="bg-ink/5 rounded-xl p-4 border border-line space-y-4">
      <h3 className="font-semibold text-accent">📅 Programmer un rappel</h3>

      {/* Choix du destinataire */}
      <div>
        <label className="block text-sm text-muted mb-2">Envoyer à :</label>
        <select
          value={destinataire}
          onChange={(e) => setDestinataire(e.target.value as Destinataire)}
          className="w-full bg-ink/10 border border-line rounded-lg px-3 py-2 text-ink"
        >
          {DESTINATAIRES_RAPPEL.map((d) => (
            <option key={d.value} value={d.value} className="bg-surface">
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* Choix de la date d'envoi */}
      <div>
        <label className="block text-sm text-muted mb-2">Date d&apos;envoi :</label>
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
                disabled={formatDateLocale(date) < today}
                onClick={() => {
                  setModePerso(false);
                  setDateEnvoi(date);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                  !modePerso && dateEnvoi?.getTime() === date?.getTime()
                    ? "bg-action/20 border-accent text-ink"
                    : "bg-ink/5 border-line text-muted hover:bg-ink/10"
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
                ? "bg-action/20 border-accent text-ink"
                : "bg-ink/5 border-line text-muted hover:bg-ink/10"
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
              className="w-full bg-ink/10 border border-line rounded-lg px-3 py-2 text-ink"
            />
          )}
        </div>
      </div>

      <p className="text-xs text-muted">Envoi lors du passage quotidien du service. Si le passage du jour est terminé, le rappel sera éligible au prochain passage ; la livraison dépend du traitement et du prestataire.</p>
      {/* Bouton programmer */}
      <Button
        onClick={handleProgrammer}
        disabled={programmation.loading || programmation.success || !message || !dateEnvoi}
        className="w-full"
      >
        {programmation.loading ? "⏳ Programmation..." : "✅ Programmer le rappel"}
      </Button>

      {/* Messages de retour */}
      {programmation.success && (
        <Notice>Rappel programmé avec succès.</Notice>
      )}
      {programmation.error && (
        <Notice error>{programmation.error}</Notice>
      )}
    </div>
  );
}
