const nodemailer = require('nodemailer');
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