// app/api/generate-gift-ideas/route.ts
import { NextResponse } from "next/server";

function limiterTexte(value: unknown, maxLength = 300): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

// Liste des catégories valides
const CATEGORIES_VALIDES = [
  "loisir",
  "bien_etre",
  "tech",
  "decoration",
  "gourmand",
] as const;

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
Proposer exactement 6 idées cadeaux personnalisées pour ${fullName || "cette personne"}, avec des catégories variées pour couvrir les 5 domaines principaux.

Informations disponibles sur le contact :
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
- "raison" = explication courte et personnalisée (maximum 15 mots) qui utilise les infos fournies. Tu DOIS mentionner quelque chose de personnel (une passion, un trait de caractère, un souvenir partagé, une préférence...).
- "categorie" = une des 5 catégories listées ci-dessus (en minuscules avec underscore). Répartis tes 6 idées sur au moins 4 catégories différentes.
- "recherche" = mots-clés de recherche optimisés (3-6 mots maximum, sans accent, séparés par des "+"). Ex: "coffret+the+ BIO" → "coffret+the+bio"
- "emoji" = un seul emoji pertinent en rapport avec le type de cadeau (ex: 📚 pour un livre, ☕ pour du thé, 🎧 pour des écouteurs, 🧘 pour du bien-être...). Jamais de 🎁.
- Idées réalistes, positives, adaptées à la relation, à l'âge et aux notes personnelles.
- Évite les objets trop chers (max ~80€) ou inappropriés.
- Ne répète jamais le prénom du destinataire dans les idées.
- Varie les gammes de prix pour proposer des options pour tous les budgets.

Format attendu (exemple) :
[
  {"idee": "Coffret thés du monde", "raison": "Parfait pour Marie qui adore voyager et découvrir de nouvelles saveurs", "categorie": "gourmand", "recherche": "coffret+the+monde", "emoji": "☕"},
  {"idee": "Roman polar hardcover", "raison": "Un thriller captivant pour les amateurs du genre comme Sophie", "categorie": "loisir", "recherche": "roman+ polar+thriller", "emoji": "📖"},
  {"idee": "Masque visage bio", "raison": "Soin naturel pour Paul qui prend soin de sa peau au quotidien", "categorie": "bien_etre", "recherche": "masque+visage+naturel+bio", "emoji": "🧴"}
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

    // Nettoyage du JSON reçu
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

    // Validation et nettoyage des idées
    ideas = ideas
      .filter(
        (i) =>
          i &&
          typeof i.idee === "string" &&
          typeof i.raison === "string" &&
          typeof i.categorie === "string" &&
          typeof i.recherche === "string"
      )
      .filter((i) => CATEGORIES_VALIDES.includes(i.categorie as typeof CATEGORIES_VALIDES[number]))
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