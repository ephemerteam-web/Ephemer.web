// test-email.js
// Ce fichier teste si on peut envoyer un email avec Resend

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  try {
    const response = await resend.emails.send({
      from: 'onboarding@resend.dev', // Email de test fourni par Resend
      to: 'alex@example.com', // CHANGE AVEC TON EMAIL
      subject: '🎉 Test Éphéméride - Email de test',
      html: '<p>Si tu reçois cet email, c\'est que Resend marche ! 🎊</p>',
    });

    console.log('✅ Email envoyé avec succès !');
    console.log('ID de l\'email :', response.id);
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi :', error.message);
  }
}

testEmail();
