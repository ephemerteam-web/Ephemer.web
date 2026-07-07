// lib/email-templates.ts

// 🎨 CONFIGURATION CENTRALISÉE
export const EMAIL_CONFIG = {
  brandName: "Ephemer.name",
  primaryColor: "#4F46E5",
  secondaryColor: "#7C3AED",
  supportEmail: "ephemer.team@gmail.com",
  dashboardUrl: "https://ephemer.name/dashboard",
  privacyPolicyUrl: "https://ephemer.name/confidentialite",
  defaultFrom: "noreply@ephemer.name"
};

// 📐 INTERFACE TYPESCRIPT (contrat de données attendu par le template)
export interface EmailRappelParams {
  prenom: string;
  nom: string;
  typeEvenement: string;
  message: string;
  dateEnvoi: string;
  ton: string | null;
  typeRappel?: string | null; // 👈 NOUVEAU : 'j30' | 'j7' | 'jourj'
  expediteurNom?: string;
  expediteurEmail?: string;
}

// 🕒 Petite fonction : transforme 'j30' en texte lisible
function libelleTiming(typeRappel: string | null | undefined): string {
  switch (typeRappel) {
    case "j30":
      return "Dans 30 jours";
    case "j7":
      return "Dans 7 jours";
    case "jourj":
      return "C'est aujourd'hui";
    default:
      return "Rappel";
  }
}

// 🛠️ FONCTION GÉNÉRATRICE
export function genererEmailRappel(params: EmailRappelParams): string {
  const { prenom, nom, typeEvenement, message, dateEnvoi, ton, typeRappel } = params;

  // 🎭 Mapping visuel : associe un ton/événement à un emoji et une couleur de fond
  const ambiance: Record<string, { emoji: string; bg: string }> = {
    // Tons
    formel: { emoji: "📜", bg: "#f8fafc" },
    familier: { emoji: "✨", bg: "#fff7ed" },
    humoristique: { emoji: "😄", bg: "#fefce8" }, // 👈 corrigé (avant : "humour")
    poetique: { emoji: "🌙", bg: "#f5f3ff" },
    beauf: { emoji: "😎", bg: "#fefce8" },          // 👈 ajouté
    vieux_francais: { emoji: "🏰", bg: "#f5f3ff" }, // 👈 ajouté
    // Événements
    anniversaire: { emoji: "🎂", bg: "#fef2f2" },
    saint_valentin: { emoji: "❤️", bg: "#fdf2f8" },
    naissance: { emoji: "👶", bg: "#f0fdf4" },
    mariage: { emoji: "💍", bg: "#fff1f2" },
  };

  // On essaie d'abord le ton, puis le type d'événement, sinon fallback par défaut
  const style = ambiance[ton || typeEvenement] || { emoji: "📩", bg: "#f8fafc" };

  // 🕒 Timing lisible (J-30 / J-7 / Jour J)
  const timing = libelleTiming(typeRappel);

  // Nettoyage du titre (remplace les underscores par des espaces + majuscules)
  const titreEvenement = typeEvenement
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // 📅 Formatage lisible de la date
  const dateFormatee = new Date(dateEnvoi).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // 📧 HTML final
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: ${style.bg}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); max-width: 100%;">

              <!-- En-tête -->
              <tr>
                <td style="padding: 30px 40px; background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.secondaryColor}); color: white; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 700;">🔔 Rappel ${EMAIL_CONFIG.brandName}</h1>
                  <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">${style.emoji} ${titreEvenement} • ${timing}</p>
                </td>
              </tr>

              <!-- Corps -->
              <tr>
                <td style="padding: 30px 40px; color: #334155; font-size: 16px; line-height: 1.6;">
                  <p style="margin: 0 0 20px;"><strong>Pour :</strong> ${prenom} ${nom}</p>
                  <div style="background: white; border-left: 4px solid ${EMAIL_CONFIG.primaryColor}; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
                    <p style="margin: 0; font-style: italic;">${message}</p>
                  </div>
                  <p style="margin: 0; font-size: 13px; color: #64748b;">
                    📅 Envoyé automatiquement le ${dateFormatee} par <strong>${EMAIL_CONFIG.brandName}</strong>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 8px;">Géré avec ❤️ par ${EMAIL_CONFIG.brandName}</p>
                  <p style="margin: 0;">
                    <a href="${EMAIL_CONFIG.dashboardUrl}" style="color: ${EMAIL_CONFIG.primaryColor}; text-decoration: none;">Voir mon espace</a> • 
                    <a href="${EMAIL_CONFIG.privacyPolicyUrl}" style="color: ${EMAIL_CONFIG.primaryColor}; text-decoration: none;">Confidentialité</a>
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
