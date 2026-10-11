// Envoi d'emails via un compte Gmail (identifiants EMAIL_USER / EMAIL_PASSWORD du .env).
const nodemailer = require('nodemailer');

// Transporteur unique ; `pool` garde les connexions SMTP ouvertes pour les envois en série
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

// Envoie un email. `expediteur` ({ nom, email }) optionnel : affiché comme nom
// d'expéditeur et utilisé comme adresse de réponse.
async function envoyerEmail({ to, subject, html, attachments, expediteur }) {
  const nomExpediteur = expediteur?.nom
    ? `${expediteur.nom} (via IMTECH INFO)`
    : 'IMTECH INFO';

  await transporter.sendMail({
    from: `"${nomExpediteur}" <${process.env.EMAIL_USER}>`, // toujours le compte authentifié
    replyTo: expediteur?.email || undefined, // permet de répondre directement à l'expéditeur si fourni
    to,
    subject,
    html,
    attachments: attachments || [],
  });
}

module.exports = { envoyerEmail };