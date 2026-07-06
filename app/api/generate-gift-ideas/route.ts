// app/api/generate-gift-ideas/route.ts
import { NextResponse } from "next/server";

function limiterTexte(value: unknown, maxLength = 300): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      firstName = "",
      lastName = "",
      dateNaissance = null,        // date complète (YYYY-MM-DD)
      age = null,
      relation = "ami",
      email = null,
      estFavori = false,
      telephoneIndicatif = null,
      telephoneNumero = null,
      note = null,
      eventType = "anniversaire",
    } = body;

    const safeFirstName = limiterTexte(firstName, 80);
    const safeLastName = limiterTexte(lastName, 80);
    const safeNote = limiterTexte(note, 500);
    const safeEmail = limiterTexte(email, 120);

    const fullName = [safeFirstName, safeLastName].filter(Boolean).join(" ");

    // Construction du prompt enrichi
    const prompt = `
Tu es un expert cadeau français très créatif et réaliste.

Objectif :
Proposer exactement 4 idées cadeaux personnalisées pour ${fullName || "cette personne"}, avec un lien Amazon affilié.

Informations complètes disponibles sur le contact :
- Prénom : ${safeFirstName || "non précisé"}
- Nom : ${safeLastName || "non précisé"}
${dateNaissance ? `- Date de naissance exacte : ${dateNaissance}` : ""}
${age ? `- Âge approximatif : ${age} ans` : ""}
- Relation : ${relation}
- Type d'événement : ${eventType}
${safeEmail ? `- Email : ${safeEmail}` : ""}
${estFavori ? `- Ce contact est marqué comme favori` : ""}
${telephoneIndicatif && telephoneNumero ? `- Téléphone : ${telephoneIndicatif} ${telephoneNumero}` : ""}
${safeNote ? `- Informations personnelles / notes : ${safeNote}` : ""}

Contraintes strictes :
- Réponds UNIQUEMENT avec un tableau JSON valide (pas de texte avant ou après).
- Chaque objet doit contenir exactement ces 4 clés : "idee", "raison", "lien_amazon", "emoji".
- "idee" = nom du cadeau (maximum 8 mots).
- "raison" = explication courte et personnalisée (maximum 12 mots) qui utilise les infos fournies.
- "lien_amazon" = URL Amazon de recherche avec ton tag affilié (format : https://www.amazon.fr/s?k=TERME+RECHERCHE&tag=TON_TAG-21). Remplace TON_TAG par ton identifiant Amazon Associates.
- "emoji" = un seul emoji pertinent en rapport avec le type de cadeau (ex: 📚 pour un livre, ☕ pour du thé, 🎧 pour des écouteurs, etc.). Jamais de 🎁.
- Idées réalistes, positives, adaptées à la relation, à l’âge et aux notes personnelles.
- Évite les objets trop chers ou inappropriés.
- Ne répète jamais le prénom dans les idées.

Format attendu (exemple) :
[
  {"idee": "Livre pop-up dinosaures", "raison": "Parfait pour un enfant de 8 ans passionné de dinosaures", "lien_amazon": "https://www.amazon.fr/s?k=livre+pop+up+dinosaures&tag=TON_TAG-21", "emoji": "📖"},
  {"idee": "Coffret thé bio", "raison": "Idéal pour une amie qui aime les moments cocooning", "lien_amazon": "https://www.amazon.fr/s?k=coffret+the+bio&tag=TON_TAG-21", "emoji": "☕"}
]
`.trim();

    const mammouthResponse = await fetch("https://api.mammouth.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MAMMOUTH_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!mammouthResponse.ok) {
      const errorText = await mammouthResponse.text();
      console.error("Erreur Mammouth (cadeaux):", errorText);
      return NextResponse.json(
        { error: "Erreur lors de la génération des idées cadeaux" },
        { status: 500 }
      );
    }

    const data = await mammouthResponse.json();
    let raw = data.choices?.[0]?.message?.content?.trim() || "";

    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    let ideas: Array<{ idee: string; raison: string; lien_amazon: string; emoji?: string }> = [];
    try {
      ideas = JSON.parse(raw);
    } catch {
      console.error("JSON invalide reçu de l'IA:", raw);
      return NextResponse.json(
        { error: "L'IA n'a pas renvoyé un JSON valide" },
        { status: 500 }
      );
    }

    ideas = ideas
      .filter((i) => i && typeof i.idee === "string" && typeof i.raison === "string" && typeof i.lien_amazon === "string")
      .slice(0, 4);

    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("Erreur inattendue generate-gift-ideas:", error);
    return NextResponse.json(
      { error: "Erreur inattendue" },
      { status: 500 }
    );
  }
}
