// app/api/generate-message/route.ts
import { NextResponse } from "next/server";
import {
  TYPES_RELATION,
  TYPES_EVENEMENT,
  TONS_MESSAGE,
  MESSAGES_UI
} from "@/lib/constants";

type LabelValueItem = { value: string; label: string };

function getLabelFromValue(array: readonly LabelValueItem[], value: string): string {
  const item = array.find((item) => item.value === value);
  return item ? item.label : array[0]?.label || value;
}

const VALID_EVENT_TYPES = new Set(TYPES_EVENEMENT.map(e => e.value));
const VALID_RELATIONS = new Set(TYPES_RELATION.map(r => r.value));
const VALID_TONES = new Set(TONS_MESSAGE.map(t => t.value));

function formatDateForPrompt(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function calculerAnneesEcoulees(dateOrigine: string | null, dateRappel?: string | null): number | null {
  if (!dateOrigine) return null;
  const date = new Date(dateOrigine);
  if (isNaN(date.getTime())) return null;

  const reference = dateRappel ? new Date(dateRappel) : new Date();

  const annees = reference.getFullYear() - date.getFullYear();
  return annees > 0 ? annees : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      firstName = "",
      lastName = "",
      age = null,
      eventType = TYPES_EVENEMENT[0].value,
      relation = TYPES_RELATION[0].value,
      tone = TONS_MESSAGE[0].value,
      customMessage = "",
      eventDate = null,
      eventDescription = null,
      note = null,
      eventDateOrigin = null,
    } = body;

    const validatedEventType = VALID_EVENT_TYPES.has(eventType) ? eventType : TYPES_EVENEMENT[0].value;
    const validatedRelation = VALID_RELATIONS.has(relation) ? relation : TYPES_RELATION[0].value;
    const validatedTone = VALID_TONES.has(tone) ? tone : TONS_MESSAGE[0].value;

    if (validatedEventType === "jour_special") {
      if (!eventDate) {
        return NextResponse.json(
          { error: "La date de l'événement est obligatoire pour un jour spécial." },
          { status: 400 }
        );
      }
      const dateObj = new Date(eventDate);
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json(
          { error: "La date saisie n'est pas valide." },
          { status: 400 }
        );
      }
    }

    const eventLabel = getLabelFromValue(TYPES_EVENEMENT, validatedEventType);
    const relationLabel = getLabelFromValue(TYPES_RELATION, validatedRelation);
    const toneLabel = getLabelFromValue(TONS_MESSAGE, validatedTone);

    const dateOrigine = eventDateOrigin ?? null;

    // ✅ CORRECTION PRINCIPALE : on ne calcule les années écoulées
    // que pour les anniversaires et fêtes prénomales
    let anneesEcoulees: number | null = null;
    if (validatedEventType === "anniversaire" || validatedEventType === "fete_prenomale") {
      anneesEcoulees = calculerAnneesEcoulees(dateOrigine, eventDate);
    }

    let prompt = `Rédige un message ${toneLabel} pour ${firstName}${lastName ? ` ${lastName}` : ""}`;

    if (validatedEventType === "jour_special" && eventDate) {
      const formattedDate = formatDateForPrompt(eventDate);
      prompt += ` à l'occasion de : "${eventDescription || "cet événement spécial"}".`;
      prompt += `\nCet événement a eu lieu le ${formattedDate}.`;
    } else {
      prompt += ` à l'occasion de son ${eventLabel}.`;
      if (eventDate) {
        prompt += `\nDate de l'événement : ${formatDateForPrompt(eventDate)}.`;
      }
      if (eventDescription) {
        prompt += `\nContexte supplémentaire sur cet événement : "${eventDescription}".`;
      }
    }

    if (anneesEcoulees !== null) {
      prompt += `\nCela fait ${anneesEcoulees} an${anneesEcoulees > 1 ? "s" : ""} que cet événement est célébré.`;
      prompt += `\nMentionne subtilement ce chiffre pour personnaliser le message.`;
    }

    prompt += `\n\nContexte événement : "${validatedEventType}" (${eventLabel}).`;
    prompt += `\nUtilise ce type d'événement pour adapter le registre émotionnel du message.`;

    prompt += `
  ${age ? `Il/Elle a ${age} ans.` : ""}
  Relation : ${relationLabel}.
  ${note ? `Infos personnelles utiles : ${note}.` : ""}
  ${customMessage ? `Inclure : "${customMessage}".` : ""}
  Format : Texte court (1-2 phrases max), naturel et ${toneLabel}.
  Langue : Français.
`.trim();

    const mammouthResponse = await fetch("https://api.mammouth.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MAMMOUTH_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!mammouthResponse.ok) {
      const errorText = await mammouthResponse.text();
      console.error("Erreur Mammouth:", errorText);
      return NextResponse.json(
        { error: MESSAGES_UI.erreur_genérique, details: errorText },
        { status: 500 }
      );
    }

    const data = await mammouthResponse.json();
    const message = data.choices?.[0]?.message?.content?.trim() || "";

    return NextResponse.json({ message });

  } catch (error) {
    console.error("Erreur inattendue:", error);
    return NextResponse.json(
      { error: MESSAGES_UI.erreur_genérique },
      { status: 500 }
    );
  }
}
