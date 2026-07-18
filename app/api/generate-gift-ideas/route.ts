// app/api/generate-gift-ideas/route.ts
import { NextResponse } from "next/server";

function limiterTexte(value: unknown, maxLength = 300): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

const CATEGORIES_VALIDES = [
  "loisir",
  "bien_etre",
  "tech",
  "decoration",
  "gourmand",
] as const;

// 👈 Table de correspondance : code technique → description lisible pour l'IA
const LABELS_EVENEMENT: Record<string, string> = {
  anniversaire: "un anniversaire",
  fete_prenom: "sa fête (prénom)",
  noel: "Noël",
  saint_valentin: "la Saint-Valentin",
  fete_meres: "la fête des mères",
  fete_peres: "la fête des pères",
  nouvel_an: "le Nouvel An",
  autre: "une occasion spéciale",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      firstName = "",
      lastName = "",
      dateNaissance = null,
      age = null,
      relation = "ami",
      email = null,
      estFavori = false,
      telephoneIndicatif = null,
      telephoneNumero = null,
      note = null,
      eventType = "anniversaire",
      eventDescription = "", // 👈 NOUVEAU
    } = body;

    const safeFirstName = limiterTexte(firstName, 80);
    const safeLastName = limiterTexte(lastName, 80);
    const safeNote = limiterTexte(note, 500);
    const safeEmail = limiterTexte(email, 120);
    const safeDescription = limiterTexte(eventDescription, 200); // 👈 NOUVEAU

    const fullName = [safeFirstName, safeLastName].filter(Boolean).join(" ");

    // 👈 On transforme le code technique en description lisible
    const labelEvenement = LABELS_EVENEMENT[eventType] || "une occasion spéciale";

    // 👈 Si "autre" + description fournie, on la privilégie
    const occasionTexte =
      eventType === "autre" && safeDescription
        ? `une occasion spéciale décrite ainsi : "${safeDescription}"`
        : labelEvenement;

    const prompt = `
Tu es un expert cadeau français très créatif et réaliste.

Objectif :
Proposer exactement 6 idées cadeaux personnalisées pour ${fullName || "cette personne"}, à l'occasion de ${occasionTexte}, avec des catégories variées pour couvrir les 5 domaines principaux.

⚠️ IMPORTANT : Les idées doivent être COHÉRENTES avec l'occasion (${occasionTexte}). Adapte le ton et le type de cadeau à cet événement précis.

Informations disponibles sur le contact :
- Prénom : ${safeFirstName || "non précisé"}
- Nom : ${safeLastName || "non précisé"}
${dateNaissance ? `- Date de naissance exacte : ${dateNaissance}` : ""}
${age ? `- Âge approximatif : ${age} ans` : ""}
- Relation : ${relation}
- Occasion du cadeau : ${occasionTexte}
${safeDescription ? `- Détails de l'occasion : ${safeDescription}` : ""}
${estFavori ? `- Ce contact est marqué comme favori` : ""}
${safeNote ? `- Informations personnelles / notes : ${safeNote}` : ""}

Les 5 catégories à utiliser (une ou deux idées par catégorie maximum) :
1. **loisir** → Loisirs & Passions (jeux, livres, musique, sport, collections...)
2. **bien_etre** → Bien-être (cosmétiques, parfum, spa, santé, relaxation...)
3. **tech** → Tech & Gadgets (électronique, high-tech, accessoires numériques...)
4. **decoration** → Décoration (art de la table, cadre, plante, bougie, luminaires...)
5. **gourmand** → Gourmandise (gourmandises fines, thé, café, chocolats, vins...)

Contraintes strictes :
- Réponds UNIQUEMENT avec un tableau JSON valide (pas de texte avant ou après).
- Chaque objet doit contenir exactement ces 5 clés : "idee", "raison", "categorie", "recherche", "emoji".
- "idee" = nom du cadeau (maximum 8 mots, concret et attrayant).
- "raison" = explication courte et personnalisée (maximum 15 mots) qui relie le cadeau À LA FOIS à la personne ET à l'occasion (${occasionTexte}).
- "categorie" = une des 5 catégories listées ci-dessus (en minuscules avec underscore). Répartis tes 6 idées sur au moins 4 catégories différentes.
- "recherche" = mots-clés de recherche optimisés (3-6 mots maximum, sans accent, séparés par des "+").
- "emoji" = un seul emoji pertinent. Jamais de 🎁.
- Idées réalistes, positives, adaptées à la relation, à l'âge, aux notes ET à l'occasion.
- Évite les objets trop chers (max ~80€) ou inappropriés.
- Ne répète jamais le prénom du destinataire dans les idées.
- Varie les gammes de prix.

Format attendu (exemple) :
[
  {"idee": "Coffret thés du monde", "raison": "Idéal pour cet anniversaire, elle adore voyager et découvrir des saveurs", "categorie": "gourmand", "recherche": "coffret+the+monde", "emoji": "☕"}
]
`.trim();

    const mammouthResponse = await fetch(
      "https://api.mammouth.ai/v1/chat/completions",
      {
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
      }
    );

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

    raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

    let ideas: Array<{
      idee: string;
      raison: string;
      categorie: string;
      recherche: string;
      emoji?: string;
    }> = [];

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
      .filter(
        (i) =>
          i &&
          typeof i.idee === "string" &&
          typeof i.raison === "string" &&
          typeof i.categorie === "string" &&
          typeof i.recherche === "string"
      )
      .filter((i) =>
        CATEGORIES_VALIDES.includes(i.categorie as typeof CATEGORIES_VALIDES[number])
      )
      .slice(0, 6);

    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("Erreur inattendue generate-gift-ideas:", error);
    return NextResponse.json(
      { error: "Erreur inattendue" },
      { status: 500 }
    );
  }
}