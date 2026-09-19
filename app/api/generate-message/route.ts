// app/api/generate-message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  TYPES_RELATION,
  TYPES_EVENEMENT,
  TONS_MESSAGE,
  MESSAGES_UI,
} from "@/lib/constants";
import { verifierGardeIA } from '@/lib/garde-ia';


type LabelValueItem = { value: string; label: string };

function getLabelFromValue(array: readonly LabelValueItem[], value: string): string {
  const item = array.find((item) => item.value === value);
  return item ? item.label : array[0]?.label || value;
}

const VALID_EVENT_TYPES = new Set(TYPES_EVENEMENT.map(e => e.value));
const VALID_RELATIONS = new Set(TYPES_RELATION.map(r => r.value));
const VALID_TONES = new Set(TONS_MESSAGE.map(t => t.value));

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



export async function POST(request: NextRequest) {
  // 🔐 Garde-fou IA : vérifie la connexion + le quota quotidien
  // Placé AVANT tout appel payant à l'IA.
  const garde = await verifierGardeIA(request);
  if (!garde.ok) {
    return NextResponse.json({ error: garde.message }, { status: garde.status });
  }

  try {
    // ... tout ton code existant reste identique
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
    // Liste fermée : aucun texte personnel libre ne part vers le prestataire.
    const validatedEventType = VALID_EVENT_TYPES.has(body.eventType) ? body.eventType : TYPES_EVENEMENT[0].value;
    const validatedRelation = VALID_RELATIONS.has(body.relation) ? body.relation : TYPES_RELATION[0].value;
    const validatedTone = VALID_TONES.has(body.tone) ? body.tone : TONS_MESSAGE[0].value;
    const eventLabel = getLabelFromValue(TYPES_EVENEMENT, validatedEventType);
    const relationLabel = getLabelFromValue(TYPES_RELATION, validatedRelation);
    const toneLabel = getLabelFromValue(TONS_MESSAGE, validatedTone);
const toneInstruction = getToneInstruction(validatedTone);
const relationInstruction = getRelationInstruction(validatedRelation);

const prompt = `Rédige un message personnel en français, chaleureux et naturel, de 1 à 2 phrases.
Occasion : ${eventLabel}. Relation : ${relationLabel}. ${relationInstruction}
Ton : ${toneLabel}. ${toneInstruction}
N'invente aucun nom, âge, date ou détail personnel. Ne mentionne pas d'années écoulées.
Aucun prénom, aucune signature, aucun champ à compléter. Une seule version, sans guillemets.`;

    const mammouthResponse = await fetch("https://api.mammouth.ai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(30000),
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
      console.error("Erreur Mammouth, statut:", mammouthResponse.status);
      return NextResponse.json(
        { error: MESSAGES_UI.erreur_genérique },
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
