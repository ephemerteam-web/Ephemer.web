// app/api/generate-message/route.ts
// Cette route reçoit une requête du navigateur, appelle l'IA Mammouth, et renvoie le message généré.

import { NextResponse } from "next/server";

// POST = type de requête utilisé quand on envoie des données au serveur
export async function POST(request: Request) {
  try {
    // 1. On récupère les données envoyées par le navigateur (nom du contact, ton souhaité, etc.)
    const { firstName, lastName, age, relation, tone, eventType } = await request.json();

    // 2. On vérifie que la clé API est bien configurée côté serveur
    const apiKey = process.env.MAMMOUTH_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API Mammouth manquante sur le serveur." },
        { status: 500 }
      );
    }

    // 3. On construit le "prompt" (= les instructions données à l'IA)
    const systemPrompt = `Tu es un assistant expert en rédaction de messages personnels chaleureux et authentiques. 
Tu écris en français. Tes messages sont courts (2 à 4 phrases max), naturels, et adaptés au ton demandé.
Ne mets jamais de guillemets autour du message. Ne signe pas le message.`;

    const userPrompt = `Rédige un message de ${eventType || "anniversaire"} pour ${firstName} ${lastName || ""}.
- Relation : ${relation || "ami"}
- Âge ${eventType === "anniversaire" ? "fêté" : ""} : ${age || "non précisé"} ans
- Ton souhaité : ${tone || "chaleureux"}

Écris uniquement le message, rien d'autre.`;

    // 4. On appelle l'API Mammouth (compatible OpenAI)
    const mammouthResponse = await fetch("https://api.mammouth.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini", // modèle rapide et économique
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.9, // 0 = très prévisible, 1 = très créatif
        max_tokens: 300,
      }),
    });

    // 5. Si Mammouth renvoie une erreur, on la remonte
    if (!mammouthResponse.ok) {
      const errorText = await mammouthResponse.text();
      console.error("Erreur Mammouth:", errorText);
      return NextResponse.json(
        { error: "Erreur lors de l'appel à l'IA Mammouth.", details: errorText },
        { status: 500 }
      );
    }

    // 6. On extrait le message généré de la réponse
    const data = await mammouthResponse.json();
    const message = data.choices?.[0]?.message?.content?.trim() || "";

    // 7. On renvoie le message au navigateur
    return NextResponse.json({ message });

  } catch (error) {
    console.error("Erreur inattendue:", error);
    return NextResponse.json(
      { error: "Erreur serveur inattendue." },
      { status: 500 }
    );
  }
}
