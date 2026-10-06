import { minimalAIInput } from './ai-privacy';
import { localMessage, type MessageLength } from './ai-options';
// ============================================================
// 📡 APPELS API - Génération de messages
// ============================================================

import { supabase } from '@/lib/supabase-browser';

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
  contactId?: number;
  consentFields?: import('./ai-consent').AIContactField[];
  length?: MessageLength;
  addressing?: 'tu' | 'vous';
  emojis?: boolean;
  signature?: string;
};

/**
 * Appelle l'API pour générer un message personnalisé via l'IA
 * @returns Le message généré (string)
 * @throws Error si l'API renvoie une erreur
 */
export async function genererMessage(params: GenerateMessageParams): Promise<string> {
  // 🔑 On récupère la session en cours (elle contient le token d'identité)
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Tu dois être connecté.');
  }

  const response = await fetch("/api/generate-message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // 🔑 On joint le token de session pour prouver notre identité au serveur
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(minimalAIInput(params)),
  });

  // Lecture sécurisée du JSON (même si la réponse est vide ou invalide)
  let responseData: { message?: string; error?: string } = {};
  try {
    responseData = await response.json();
  } catch {
    console.error("Réponse non-JSON du générateur");
  }

  if (!response.ok) {
    const errorMessage = responseData.error || "Erreur de l'API";
    throw new Error(String(errorMessage));
  }

  if (!responseData.message) {
    throw new Error("Aucun message reçu du serveur");
  }

  if (typeof responseData.message !== 'string' || responseData.message.length > 4000) throw new Error('Réponse IA invalide.');
  return localMessage(responseData.message, params.firstName, params.signature);
}
