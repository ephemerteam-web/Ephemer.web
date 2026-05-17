// app/api/generate-message/route.ts
import { NextResponse } from "next/server";
import {
  TYPES_RELATION,
  TYPES_EVENEMENT,
  TONS_MESSAGE,
  MESSAGES_UI
} from "@/lib/constants";

// Type pour les objets avec `value` et `label`
type LabelValueItem = { value: string; label: string };

// Fonction utilitaire pour récupérer le label à partir de la valeur
function getLabelFromValue(
  array: readonly LabelValueItem[],
  value: string
): string {
  const item = array.find((item) => item.value === value);
  return item ? item.label : array[0]?.label || value;
}

// Sets pour validation rapide
const VALID_EVENT_TYPES = new Set(TYPES_EVENEMENT.map(e => e.value));
const VALID_RELATIONS = new Set(TYPES_RELATION.map(r => r.value));
const VALID_TONES = new Set(TONS_MESSAGE.map(t => t.value));

// 👇 NOUVEAU : Fonction pour formater une date en français (ex: "15 octobre 2023")
function formatDateForPrompt(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Fallback si date invalide
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
      // 👇 NOUVEAU : Récupération des champs pour les dates spéciales
      eventDate = null,
      eventDescription = null,
      note = null,
    } = body;

    // Validation des entrées
    const validatedEventType = VALID_EVENT_TYPES.has(eventType) ? eventType : TYPES_EVENEMENT[0].value;
    const validatedRelation = VALID_RELATIONS.has(relation) ? relation : TYPES_RELATION[0].value;
    const validatedTone = VALID_TONES.has(tone) ? tone : TONS_MESSAGE[0].value;

    // 👇 NOUVEAU : Validation spécifique pour les dates spéciales
    if (validatedEventType === "jour_special") {
      if (!eventDate) {
        return NextResponse.json(
          { error: "La date de l'événement est obligatoire pour un jour spécial." },
          { status: 400 }
        );
      }
      // Vérifie que la date est valide et dans le futur
      const dateObj = new Date(eventDate);
      if (isNaN(dateObj.getTime()) || dateObj < new Date()) {
        return NextResponse.json(
          { error: "La date doit être valide et dans le futur." },
          { status: 400 }
        );
      }
    }

    // Récupération des labels
    const eventLabel = getLabelFromValue(TYPES_EVENEMENT, validatedEventType);
    const relationLabel = getLabelFromValue(TYPES_RELATION, validatedRelation);
    const toneLabel = getLabelFromValue(TONS_MESSAGE, validatedTone);

    // 👇 NOUVEAU : Construction du prompt avec gestion des dates spéciales
    let prompt = `
      Rédige un message ${toneLabel} pour ${firstName} ${lastName ? ` ${lastName}` : ''}
    `;

    if (validatedEventType === "jour_special" && eventDate) {
      // Cas spécial : événement personnalisé
      const formattedDate = formatDateForPrompt(eventDate);
      prompt += `à l'occasion de ⭐ ${eventDescription || "cet événement spécial"}.`;
      prompt += `\nCélébré le ${formattedDate}.`;
    } else {
      // Cas classique : anniversaire, fête prénomale, etc.
      prompt += `à l'occasion de son ${eventLabel}.`;
    }

    prompt += `
      ${age ? `Il/Elle a ${age} ans.` : ''}
      Relation : ${relationLabel}.
      ${note ? `Informations personnelles sur ${firstName} (utilise-les pour personnaliser le message) : ${note}.` : ''}
      ${customMessage ? `Inclure ce message personnalisé : "${customMessage}".` : ''}
      Format : Texte court (1-2 phrases max), naturel et ${toneLabel}.
      Langue : Français.
    `.trim();

    // Appel à l'API Mammouth
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
