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
// 📰 NEWSLETTER MENSUELLE - VERSION PREMIUM
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

// 🛠️ FONCTION GÉNÉRATRICE DE LA NEWSLETTER (version premium table-based)
export function genererNewsletterMensuelle(params: NewsletterParams): string {
  const { prenomUtilisateur, moisLibelle, evenements } = params;

  // 📧 Preheader text (caché, visible dans la preview)
  const preheaderText = `📅 ${evenements.length} événement${evenements.length > 1 ? 's' : ''} à ne pas manquer en ${moisLibelle}`;

  // 🏷️ Badge du nombre d'événements
  const badge = evenements.length > 0
    ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 16px auto 0;">
        <tr>
          <td style="background-color: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35); border-radius: 20px; padding: 6px 16px;">
            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #ffffff; letter-spacing: 0.3px;">
              🎉 ${evenements.length} événement${evenements.length > 1 ? 's' : ''} ce mois-ci
            </p>
          </td>
        </tr>
      </table>`
    : '';

  // 📋 Liste des événements (chaque événement = sa propre "carte")
  const listeEvenements = evenements.length === 0
    ? `<tr>
        <td style="padding: 32px 24px; text-align: center; background-color: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <p style="margin: 0 0 8px; font-size: 32px;">🌿</p>
          <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">
            Aucun événement ce mois-ci.<br/>
            Profitez-en pour vous reposer !
          </p>
        </td>
      </tr>`
    : evenements.map((evt, index) => {
        const isLast = index === evenements.length - 1;
        return `
        <tr>
          <td style="padding: ${index === 0 ? '0' : '12px'} 0 ${isLast ? '0' : '0'};">
            <!-- Carte événement -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid ${EMAIL_CONFIG.primaryColor}; border-radius: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              <tr>
                <!-- Pastille jour (colonne gauche) -->
                <td width="70" valign="middle" style="padding: 16px; text-align: center; vertical-align: middle;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                    <tr>
                      <td style="background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.secondaryColor}); border-radius: 10px; padding: 8px 0; width: 52px; text-align: center;">
                        <p style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1;">
                          ${evt.jour}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>

                <!-- Infos contact (colonne droite) -->
                <td valign="middle" style="padding: 16px 16px 16px 0; vertical-align: middle;">
                  <p style="margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #1e293b; line-height: 1.3;">
                    ${evt.emoji} ${evt.prenomContact} ${evt.nomContact}
                  </p>
                  <p style="margin: 0; font-size: 13px; color: #64748b; text-transform: capitalize; line-height: 1.4;">
                    ${evt.typeEvenement.replace(/_/g, ' ')}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
      }).join('');

  // ══════════════════════════════════════════════════════════════
  // 📧 HTML FINAL - Newsletter Premium (100% table-based)
  // ══════════════════════════════════════════════════════════════
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no">
  <title>Votre agenda de ${moisLibelle} - ${EMAIL_CONFIG.brandName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">

  <!-- Preheader (caché) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheaderText}
  </div>

  <!-- Email principal -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 24px 12px;">

        <!-- Wrapper (max 600px) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- ═══════════════════════════════════════════ -->
          <!-- 🏷️ HEADER PREMIUM -->
          <!-- ═══════════════════════════════════════════ -->
          <tr>
            <td style="background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor} 0%, ${EMAIL_CONFIG.secondaryColor} 100%); border-radius: 16px 16px 0 0; padding: 40px 24px 32px; text-align: center;">
              
              <!-- Badge "AGENDA" -->
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 16px;">
                <tr>
                  <td style="background-color: rgba(255,255,255,0.2); border-radius: 20px; padding: 5px 14px;">
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: #ffffff; letter-spacing: 1.5px; text-transform: uppercase;">
                      📅 Votre Agenda
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Titre principal -->
              <p style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.2;">
                ${moisLibelle}
              </p>
              <p style="margin: 10px 0 0; font-size: 14px; color: rgba(255,255,255,0.9); line-height: 1.4;">
                Vos rendez-vous mémoire à ne pas manquer ✨
              </p>

              ${badge}
            </td>
          </tr>

          <!-- ═══════════════════════════════════════════ -->
          <!-- 💬 CORPS -->
          <!-- ═══════════════════════════════════════════ -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 24px;">

              <!-- Salutation -->
              <p style="margin: 0 0 16px; font-size: 17px; color: #1e293b; line-height: 1.5;">
                Bonjour <strong>${prenomUtilisateur}</strong> 👋
              </p>

              <p style="margin: 0 0 28px; font-size: 15px; color: #475569; line-height: 1.6;">
                Voici les <strong>moments importants</strong> qui vous attendent ce mois-ci. Un simple clic pour ne rien oublier.
              </p>

              <!-- ═══════════════════════════════════ -->
              <!-- 📋 LISTE DES ÉVÉNEMENTS -->
              <!-- ═══════════════════════════════════ -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${listeEvenements}
              </table>

              <!-- Espace avant CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height: 28px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Petit texte d'encouragement -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}08, ${EMAIL_CONFIG.secondaryColor}08); border-radius: 10px; margin: 0 0 24px;">
                <tr>
                  <td style="padding: 16px 20px; text-align: center;">
                    <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5; font-style: italic;">
                      💡 Astuce : un message personnalisé fait toujours plus plaisir qu'un simple "Joyeux anniversaire" !
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Gros bouton CTA -->
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.secondaryColor}); border-radius: 12px; padding: 2px;">
                    <a href="${EMAIL_CONFIG.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.secondaryColor}); border-radius: 10px; color: #ffffff; font-size: 16px; font-weight: 700; padding: 16px 40px; text-decoration: none; letter-spacing: 0.2px;">
                      📋 Voir mon calendrier complet
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ═══════════════════════════════════════════ -->
          <!-- 🔗 FOOTER PREMIUM -->
          <!-- ═══════════════════════════════════════════ -->
          <tr>
            <td style="background-color: #1e293b; border-radius: 0 0 16px 16px; padding: 32px 24px;">

              <!-- Encadré "Pourquoi cet email" -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; margin: 0 0 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #ffffff; letter-spacing: 0.3px; text-transform: uppercase;">
                      📬 Pourquoi ce message ?
                    </p>
                    <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.75); line-height: 1.6;">
                      Vous avez activé les newsletters mensuelles sur <strong>${EMAIL_CONFIG.brandName}</strong>.<br/>
                      Cet email est un <strong>rappel personnel</strong>, sans publicité.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Liens footer -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 0 0 20px;">
                    <a href="${EMAIL_CONFIG.dashboardUrl}" style="display: inline-block; font-size: 12px; color: ${EMAIL_CONFIG.primaryColor}; text-decoration: none; margin: 0 10px; font-weight: 500;">
                      Gérer mes préférences
                    </a>
                    <span style="color: rgba(255,255,255,0.3);">·</span>
                    <a href="${EMAIL_CONFIG.privacyPolicyUrl}" style="display: inline-block; font-size: 12px; color: ${EMAIL_CONFIG.primaryColor}; text-decoration: none; margin: 0 10px; font-weight: 500;">
                      Confidentialité
                    </a>
                    <span style="color: rgba(255,255,255,0.3);">·</span>
                    <a href="mailto:${EMAIL_CONFIG.supportEmail}" style="display: inline-block; font-size: 12px; color: ${EMAIL_CONFIG.primaryColor}; text-decoration: none; margin: 0 10px; font-weight: 500;">
                      Support
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Adresse physique (obligatoire CAN-SPAM) -->
              <p style="margin: 0 0 12px; font-size: 11px; color: rgba(255,255,255,0.5); text-align: center; line-height: 1.6;">
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

</body>
</html>
  `.trim();
}