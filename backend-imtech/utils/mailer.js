// Envoi d'emails via un compte Gmail (identifiants EMAIL_USER / EMAIL_PASSWORD du .env).
const nodemailer = require('nodemailer');
const { miseEnPage, nomComplet } = require('./modeleEmail');

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

// Envoie un email. `expediteur` ({ prenom, nom, email, telephone, role }) optionnel : la personne
// qui envoie. Son nom s'affiche comme expéditeur, son adresse sert à la réponse, et ses coordonnées
// signent le message. Le contenu est toujours habillé avec la présentation IMTECH INFO (utils/modeleEmail.js).
async function envoyerEmail({ to, subject, html, attachments, expediteur }) {
  const nom = expediteur ? nomComplet(expediteur.prenom, expediteur.nom) : '';
  const nomExpediteur = nom ? `${nom} (IMTECH INFO)` : 'IMTECH INFO';

  await transporter.sendMail({
    from: `"${nomExpediteur}" <${process.env.EMAIL_USER}>`, // toujours le compte authentifié
    replyTo: expediteur?.email || undefined, // permet de répondre directement à l'expéditeur si fourni
    to,
    subject,
    html: miseEnPage(html, expediteur),
    attachments: attachments || [],
  });
}

module.exports = { envoyerEmail };