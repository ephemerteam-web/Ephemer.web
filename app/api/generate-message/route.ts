// app/api/generate-message/route.ts
import { NextResponse } from "next/server";
import {
  TYPES_RELATION,
  TYPES_EVENEMENT,
  TONS_MESSAGE,
  MESSAGES_UI,
  peutMentionnerAnneesEcoulees,
  necessiteDateManuelle
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
function limiterTexte(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}


function calculerAnneesEcoulees(dateOrigine: string | null, dateRappel?: string | null): number | null {
  if (!dateOrigine) return null;

  const date = new Date(dateOrigine);
  if (isNaN(date.getTime())) return null;

  const reference = dateRappel ? new Date(dateRappel) : new Date();
  if (isNaN(reference.getTime())) return null;

  let annees = reference.getFullYear() - date.getFullYear();

  const moisReference = reference.getMonth();
  const jourReference = reference.getDate();
  const moisOrigine = date.getMonth();
  const jourOrigine = date.getDate();

  const evenementPasEncorePasseCetteAnnee =
    moisReference < moisOrigine ||
    (moisReference === moisOrigine && jourReference < jourOrigine);

  if (evenementPasEncorePasseCetteAnnee) {
    annees -= 1;
  }

  return annees > 0 ? annees : null;
}

function getToneInstruction(tone: string): string {
  switch (tone) {
    case "formel":
      return "Adopte un style sobre, élégant, respectueux et professionnel.";
    case "familier":
      return "Adopte un style chaleureux, simple, naturel et affectueux sans être excessif.";
    case "humoristique":
      return "Ajoute une touche d'humour légère, positive et jamais blessante.";
    case "poetique":
      return "Adopte un style doux, imagé et élégant, sans être trop théâtral.";
    case "beauf":
      return "Utilise un humour potache, légèrement exagéré, mais toujours gentil, respectueux et jamais vulgaire.";
    case "vieux_francais":
      return "Adopte un style inspiré du vieux français, avec une touche médiévale légère et amusante, mais le message doit rester parfaitement compréhensible aujourd'hui.";
    default:
      return "Adopte un style naturel, humain et adapté à la relation.";
  }
}
function getRelationInstruction(relation: string): string {
  switch (relation) {
    case "couple":
      return "La relation est amoureuse : le message peut être tendre, complice et romantique, sans être trop intime ni gênant.";
    case "famille":
      return "La relation est familiale : le message peut être affectueux, chaleureux et sincère.";
    case "ami":
      return "La relation est amicale : le message peut être détendu, complice et naturel.";
    case "pro":
      return "La relation est professionnelle : reste sobre, poli et évite les formulations trop personnelles.";
    default:
      return "Adapte le message à une relation générale, sans supposer trop d'intimité.";
  }
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
const safeFirstName = limiterTexte(firstName, 80);
const safeLastName = limiterTexte(lastName, 80);
const safeCustomMessage = limiterTexte(customMessage, 300);
const safeEventDescription = limiterTexte(eventDescription, 300);
const safeNote = limiterTexte(note, 500);


    if (necessiteDateManuelle(validatedEventType)) {
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

// ✅ On ne calcule les années écoulées que pour les événements où c'est naturel.
let anneesEcoulees: number | null = null;

if (peutMentionnerAnneesEcoulees(validatedEventType)) {
  anneesEcoulees = calculerAnneesEcoulees(dateOrigine, eventDate);
}

const fullName = `${safeFirstName}${safeLastName ? ` ${safeLastName}` : ""}`.trim();

const formattedEventDate = eventDate ? formatDateForPrompt(eventDate) : null;

const detailsEvenement =
  validatedEventType === "jour_special" || validatedEventType === "autre"
    ? safeEventDescription || "cet événement"
    : eventLabel;


const toneInstruction = getToneInstruction(validatedTone);
const relationInstruction = getRelationInstruction(validatedRelation);

const consigneAnnees =
  anneesEcoulees !== null
    ? `Tu peux mentionner subtilement les ${anneesEcoulees} an${anneesEcoulees > 1 ? "s" : ""} liés à cet événement, uniquement si cela sonne naturel.`
    : `Ne mentionne pas d'années écoulées.`;

const prompt = `
Tu es un assistant spécialisé dans la rédaction de messages personnels courts, chaleureux et naturels.

Objectif :
Rédiger un message en français pour ${fullName || "cette personne"}.

Informations :
- Prénom : ${safeFirstName || "non précisé"}
- Nom : ${safeLastName || "non précisé"}
- Type d'événement sélectionné : ${eventLabel}
- Description réelle de l'événement : ${detailsEvenement}
${formattedEventDate ? `- Date de l'événement : ${formattedEventDate}` : ""}
- Relation avec la personne : ${relationLabel}
- Consigne relationnelle : ${relationInstruction}
- Ton demandé : ${toneLabel}
- Style précis à respecter : ${toneInstruction}
${age ? `- Âge : ${age} ans` : ""}
${safeNote ? `- Informations personnelles utiles : ${safeNote}` : ""}
${safeCustomMessage ? `- Élément à inclure obligatoirement : ${safeCustomMessage}` : ""}

Règles importantes :
- Le message doit être court : 1 à 2 phrases maximum.
- Le message doit sembler écrit par un humain, pas par une IA.
- Évite les formulations trop génériques comme "en cette journée spéciale".
- Le message DOIT obligatoirement mentionner le prénom "${safeFirstName}" au moins une fois (par exemple au début, comme "Bonne fête ${safeFirstName} !").
- Utilise le prénom une seule fois, sans le répéter plusieurs fois.
- Adapte le niveau d'émotion à la relation.
- Si la relation est professionnelle, reste sobre et respectueux.
- Si le ton est humoristique, reste bienveillant et évite les blagues blessantes.
- Si le ton est potache, il doit rester gentil, léger et jamais vulgaire.
- ${consigneAnnees}
- Ne mets pas de guillemets autour du message.
- Ne propose qu'une seule version.

Message final :
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
    // 🛡️ Filet de sécurité : si l'IA a oublié le prénom, on l'ajoute au début
    let messageFinal = message;
    if (safeFirstName && message && !message.toLowerCase().includes(safeFirstName.toLowerCase())) {
      messageFinal = `${safeFirstName}, ${message.charAt(0).toLowerCase()}${message.slice(1)}`;
    }
    return NextResponse.json({ message: messageFinal });

  } catch (error) {
    console.error("Erreur inattendue:", error);
    return NextResponse.json(
      { error: MESSAGES_UI.erreur_genérique },
      { status: 500 }
    );
  }
}
