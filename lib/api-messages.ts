// ============================================================
// 📡 APPELS API - Génération de messages
// ============================================================

// Type des paramètres pour générer un message
export type GenerateMessageParams = {
  firstName: string;
  lastName: string;
  age: number | null;
  relation: string;
  tone: string;
  eventType: string;
  eventDate: string | null;
  eventDescription: string | null;
  note: string | null;
  eventDateOrigin?: string | null;
};

/**
 * Appelle l'API pour générer un message personnalisé via l'IA
 * @returns Le message généré (string)
 * @throws Error si l'API renvoie une erreur
 */
export async function genererMessage(params: GenerateMessageParams): Promise<string> {
  const response = await fetch("/api/generate-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  // Lecture sécurisée du JSON (même si la réponse est vide ou invalide)
  let responseData: { message?: string; error?: string } = {};
  try {
    responseData = await response.json();
  } catch (parseErr) {
    console.error("Réponse non-JSON:", parseErr);
  }

  if (!response.ok) {
    const errorMessage = responseData.error || "Erreur de l'API";
    throw new Error(String(errorMessage));
  }

  if (!responseData.message) {
    throw new Error("Aucun message reçu du serveur");
  }

  return responseData.message;
}
