// lib/email-templates.ts

// 🎨 CONFIGURATION CENTRALISÉE
export const EMAIL_CONFIG = {
  brandName: "Ephemer.name",
  primaryColor: "#4F46E5",
  secondaryColor: "#7C3AED",
  supportEmail: "ephemer.team@gmail.com",
  dashboardUrl: "https://ephemer.name/dashboard",
  privacyPolicyUrl: "https://ephemer.name/confidentialite",
  defaultFrom: "noreply@ephemer.name",
  // 📍 Adresse physique (requise par les lois anti-spam CAN-SPAM / CASL)
  physicalAddress: "Ephemer.name - 123 Rue de la Mémoire, 75001 Paris, France"
};

// 📐 INTERFACE TYPESCRIPT (contrat de données attendu par le template)
export interface EmailRappelParams {
  prenom: string;
  nom: string;
  typeEvenement: string;
  message: string;
  dateEnvoi: string;
  ton: string | null;
  typeRappel?: string | null; // 👈 'j30' | 'j7' | 'jourj'
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

// 🛠️ FONCTION GÉNÉRATRICE D'EMAIL PROFESSIONNEL
export function genererEmailRappel(params: EmailRappelParams): string {
  const { prenom, nom, typeEvenement, message, dateEnvoi, ton, typeRappel, expediteurNom } = params;

  // 🎭 Mapping visuel : associe un ton/événement à un emoji et une couleur de fond
  const ambiance: Record<string, { emoji: string; bg: string }> = {
    // Tons
    formel: { emoji: "📜", bg: "#f8fafc" },
    familier: { emoji: "✨", bg: "#fff7ed" },
    humoristique: { emoji: "😄", bg: "#fefce8" },
    poetique: { emoji: "🌙", bg: "#f5f3ff" },
    beauf: { emoji: "😎", bg: "#fefce8" },
    vieux_francais: { emoji: "🏰", bg: "#f5f3ff" },
    // Événements
    anniversaire: { emoji: "🎂", bg: "#fef2f2" },
    saint_valentin: { emoji: "❤️", bg: "#fdf2f8" },
    naissance: { emoji: "👶", bg: "#f0fdf4" },
    mariage: { emoji: "💍", bg: "#fff1f2" },
  };

  const style = ambiance[ton || typeEvenement] || { emoji: "📩", bg: "#f8fafc" };
  const timing = libelleTiming(typeRappel);
  const titreEvenement = typeEvenement
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const dateFormatee = new Date(dateEnvoi).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // 📧 Preheader text (texte invisible dans la preview email)
  const preheaderText = `${style.emoji} ${prenom}, n'oubliez pas ce moment spécial ! - Envoyé par ${expediteurNom || EMAIL_CONFIG.brandName}`;

  // ══════════════════════════════════════════════════════════════
  // 📧 HTML FINAL - Email Pro & Anti-Spam
  // ══════════════════════════════════════════════════════════════
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no">
  <title>${titreEvenement} - ${EMAIL_CONFIG.brandName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">

  <!-- ══════════════════════════════════════════════════════════ -->
  <!-- 📌 PREHEADER (texte invisible pour la preview email) -->
  <!-- ══════════════════════════════════════════════════════════ -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheaderText}
  </div>
  <!--[if mso | IE]><div style="display: none !important; font-size: 0; line-height: 0; width: 0; height: 0; visibility: hidden;">${preheaderText}</div><![endif]-->

  <!-- ══════════════════════════════════════════════════════════ -->
  <!-- 🎯 EMAIL PRINCIPAL -->
  <!-- ══════════════════════════════════════════════════════════ -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f2f5;">
    <tr>
      <td align="center" style="padding: 30px 15px;">

        <!-- Wrapper principal (max 600px pour lisibilité) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <!-- 🏷️ HEADER - Logo & Branding -->
          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <tr>
            <td style="background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.secondaryColor}); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <!-- Logo/Texte -->
                    <p style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                      ✨ ${EMAIL_CONFIG.brandName}
                    </p>
                    <p style="margin: 8px 0 0; font-size: 13px; color: rgba(255,255,255,0.9);">
                      ${style.emoji} ${titreEvenement} • ${timing}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <!-- 💬 CORPS - Message personnalisé -->
          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 24px;">

              <!-- Salutation -->
              <p style="margin: 0 0 20px; font-size: 16px; color: #1e293b; line-height: 1.5;">
                Bonjour <strong>${prenom}</strong> 👋
              </p>

              <!-- Bloc de citation/message -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}08, ${EMAIL_CONFIG.secondaryColor}08); border-left: 4px solid ${EMAIL_CONFIG.primaryColor}; border-radius: 0 12px 12px 0; margin: 0 0 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0; font-size: 16px; color: #334155; line-height: 1.7; font-style: italic;">
                      "${message}"
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Badge date -->
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; border-radius: 20px; margin: 0 auto 20px;">
                <tr>
                  <td style="padding: 8px 16px;">
                    <p style="margin: 0; font-size: 13px; color: #64748b;">
                      📅 ${dateFormatee}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0 0;">
                <tr>
                  <td style="background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.secondaryColor}); border-radius: 10px; padding: 2px;">
                    <a href="${EMAIL_CONFIG.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.secondaryColor}); border-radius: 8px; color: #ffffff; font-size: 15px; font-weight: 600; padding: 14px 32px; text-decoration: none; width: 100%; box-sizing: border-box;">
                      📋 Voir mon espace
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <!-- 🔗 FOOTER ANTI-SPAM - Information obligatoire -->
          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <tr>
            <td style="background-color: #1e293b; border-radius: 0 0 16px 16px; padding: 24px;">

              <!-- Question anti-spam (très important) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(255,255,255,0.08); border-radius: 10px; margin: 0 0 20px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #ffffff;">
                      📬 Pourquoi recevez-vous cet email ?
                    </p>
                    <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.75); line-height: 1.6;">
                      Vous recevez cet email car vous avez programmé un rappel sur <strong>${EMAIL_CONFIG.brandName}</strong>. 
                      ${expediteurNom ? `Il a été envoyé par ${expediteurNom}.` : ''}
                      Cet email est un <strong>rappel personnel</strong> et non une communication marketing.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Liens de gestion -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 16px;">
                <tr>
                  <td align="center" style="padding: 0 0 16px;">
                    <a href="${EMAIL_CONFIG.dashboardUrl}" style="display: inline-block; font-size: 12px; color: ${EMAIL_CONFIG.primaryColor}; text-decoration: none; margin: 0 12px;">
                      Gérer mes rappels
                    </a>
                    <span style="color: rgba(255,255,255,0.3);">|</span>
                    <a href="${EMAIL_CONFIG.privacyPolicyUrl}" style="display: inline-block; font-size: 12px; color: ${EMAIL_CONFIG.primaryColor}; text-decoration: none; margin: 0 12px;">
                      Politique de confidentialité
                    </a>
                    <span style="color: rgba(255,255,255,0.3);">|</span>
                    <a href="mailto:${EMAIL_CONFIG.supportEmail}" style="display: inline-block; font-size: 12px; color: ${EMAIL_CONFIG.primaryColor}; text-decoration: none; margin: 0 12px;">
                      Nous contacter
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Adresse physique (requise par CAN-SPAM / CASL) -->
              <p style="margin: 0 0 12px; font-size: 11px; color: rgba(255,255,255,0.5); text-align: center; line-height: 1.5;">
                ${EMAIL_CONFIG.physicalAddress}
              </p>

              <!-- Copyright -->
              <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.4); text-align: center;">
                © ${new Date().getFullYear()} ${EMAIL_CONFIG.brandName}. Tous droits réservés.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

  <!-- ══════════════════════════════════════════════════════════ -->
  <!-- 📱 STYLES RESPONSIVE (Media Queries via MSO conditional) -->
  <!-- ══════════════════════════════════════════════════════════ -->
  <!--[if mso | IE]>
  <style type="text/css">
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; }
      .email-padding { padding: 24px 16px !important; }
      .email-header { padding: 24px 16px !important; }
      .email-body { padding: 24px 16px !important; }
      .email-footer { padding: 20px 16px !important; }
      .email-title { font-size: 20px !important; }
      .email-button { width: 100% !important; }
    }
  </style>
  <![endif]-->

</body>
</html>
  `.trim();
}
// ══════════════════════════════════════════════════════════════
// 📰 NEWSLETTER MENSUELLE - VERSION PREMIUM (BULLETPROOF)
// ══════════════════════════════════════════════════════════════

// 📐 Structure d'UN événement dans la newsletter
export interface EvenementNewsletter {
  prenomContact: string;
  nomContact: string;
  typeEvenement: string;
  jour: number;
  emoji: string;
}

// 📐 Toutes les infos pour générer la newsletter
export interface NewsletterParams {
  prenomUtilisateur: string;
  moisLibelle: string;
  evenements: EvenementNewsletter[];
}

// 🛠️ FONCTION GÉNÉRATRICE DE LA NEWSLETTER PREMIUM
export function genererNewsletterMensuelle(params: NewsletterParams): string {
  const { prenomUtilisateur, moisLibelle, evenements } = params;

  // 📧 Preheader (texte caché, visible en preview)
  const preheaderText = `📅 ${evenements.length} événement${evenements.length > 1 ? 's' : ''} à ne pas manquer en ${moisLibelle}`;

  // 🎨 Pastilles couleurs selon type d'événement
  const couleurParType: Record<string, string> = {
    anniversaire: "#EF4444",
    mariage: "#EC4899",
    naissance: "#10B981",
    saint_valentin: "#F43F5E",
  };

  // 📋 Construit la liste HTML des événements
  const listeEvenementsHTML = evenements.length === 0
    ? `
        <tr>
          <td style="padding: 40px 24px; text-align: center; background-color: #f8fafc; border-radius: 12px;">
            <p style="margin: 0 0 8px; font-size: 32px;">🌿</p>
            <p style="margin: 0; font-size: 15px; color: #64748b; font-weight: 500;">
              Aucun événement ce mois-ci
            </p>
            <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">
              Profitez-en pour vous détendre ! ☕
            </p>
          </td>
        </tr>
      `
    : evenements.map((evt, index) => {
        // Couleur selon le type d'événement (sinon dégradé indigo/violet)
        const couleur = couleurParType[evt.typeEvenement] || EMAIL_CONFIG.primaryColor;
        const typeCapitalise = evt.typeEvenement
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        return `
          <tr>
            <td style="padding: 0 0 12px 0;">
              <!-- CARTE ÉVÉNEMENT -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid ${couleur}; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <!-- Pastille avec le jour -->
                        <td width="56" valign="middle" style="padding-right: 16px;">
                          <div style="width: 56px; height: 56px; background: linear-gradient(135deg, ${couleur}, ${couleur}cc); border-radius: 12px; text-align: center; line-height: 56px; color: #ffffff; font-size: 20px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            ${evt.jour}
                          </div>
                        </td>
                        <!-- Infos du contact -->
                        <td valign="middle">
                          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1e293b; line-height: 1.3;">
                            ${evt.emoji} ${evt.prenomContact} ${evt.nomContact}
                          </p>
                          <p style="margin: 4px 0 0; font-size: 13px; color: #64748b; line-height: 1.3; text-transform: capitalize;">
                            ${typeCapitalise} • Le ${evt.jour} ${moisLibelle.split(' ')[0]}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
      }).join('');

  // ══════════════════════════════════════════════════════════════
  // 📧 HTML FINAL COMPLET
  // ══════════════════════════════════════════════════════════════
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Votre agenda de ${moisLibelle} - ${EMAIL_CONFIG.brandName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">

  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheaderText}
  </div>
  <!--[if mso | IE]><div style="display: none !important;">${preheaderText}</div><![endif]-->

  <!-- Wrapper global -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 30px 15px;">

        <!-- Conteneur principal (max 600px) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">

          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <!-- 🏷️ HEADER -->
          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <tr>
            <td style="background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.secondaryColor}); padding: 36px 28px 32px; text-align: center;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); letter-spacing: 1.5px; text-transform: uppercase;">
                📅 Votre Agenda
              </p>
              <p style="margin: 10px 0 0; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; line-height: 1.2;">
                ${moisLibelle}
              </p>
              <p style="margin: 12px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); line-height: 1.5;">
                Bonjour <strong>${prenomUtilisateur}</strong> 👋<br>
                Voici vos moments importants du mois
              </p>
              <!-- Badge compteur -->
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 20px auto 0;">
                <tr>
                  <td style="background-color: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); border-radius: 20px; padding: 6px 18px;">
                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #ffffff;">
                      🎉 ${evenements.length} événement${evenements.length > 1 ? 's' : ''}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <!-- 💬 CORPS DE LA NEWSLETTER -->
          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 28px;">

              <!-- Intro -->
              <p style="margin: 0 0 24px; font-size: 15px; color: #475569; line-height: 1.6;">
                Ne manquez aucun moment important. Voici les dates clés à retenir ce mois-ci :
              </p>

              <!-- Liste des événements -->
              ${listeEvenementsHTML}

              <!-- Petit message d'encouragement -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0 0; background-color: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">
                <tr>
                  <td style="padding: 18px 22px;">
                    <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">
                      💡 <strong style="color: #1e293b;">Astuce :</strong> Un petit message fait toujours plaisir ! Pensez à prévenir vos proches à l'avance.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA bouton -->
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 28px auto 0;">
                <tr>
                  <td style="background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.secondaryColor}); border-radius: 10px;">
                    <a href="${EMAIL_CONFIG.dashboardUrl}" style="display: inline-block; padding: 14px 36px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; letter-spacing: 0.3px;">
                      📋 Voir mon calendrier complet
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <!-- 🔗 FOOTER -->
          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <tr>
            <td style="background-color: #1e293b; padding: 28px;">

              <!-- Encadré explicatif -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; margin: 0 0 20px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 6px; font-size: 13px; font-weight: 600; color: #ffffff;">
                      📬 Pourquoi recevez-vous cet email ?
                    </p>
                    <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.6;">
                      Vous avez activé la newsletter mensuelle sur <strong style="color: #ffffff;">${EMAIL_CONFIG.brandName}</strong>. C'est un rappel personnel, pas du marketing. 🤝
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Liens -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 0 0 16px;">
                    <a href="${EMAIL_CONFIG.dashboardUrl}" style="display: inline-block; font-size: 12px; color: #a5b4fc; text-decoration: none; margin: 0 10px; font-weight: 500;">
                      Gérer mes préférences
                    </a>
                    <span style="color: rgba(255,255,255,0.3);">·</span>
                    <a href="${EMAIL_CONFIG.privacyPolicyUrl}" style="display: inline-block; font-size: 12px; color: #a5b4fc; text-decoration: none; margin: 0 10px; font-weight: 500;">
                      Confidentialité
                    </a>
                    <span style="color: rgba(255,255,255,0.3);">·</span>
                    <a href="mailto:${EMAIL_CONFIG.supportEmail}" style="display: inline-block; font-size: 12px; color: #a5b4fc; text-decoration: none; margin: 0 10px; font-weight: 500;">
                      Support
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Adresse + Copyright -->
              <p style="margin: 0 0 12px; font-size: 11px; color: rgba(255,255,255,0.5); text-align: center; line-height: 1.6;">
                ${EMAIL_CONFIG.physicalAddress}
              </p>
              <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.4); text-align: center;">
                © ${new Date().getFullYear()} ${EMAIL_CONFIG.brandName}. Tous droits réservés.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}