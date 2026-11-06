// Présentation commune des e-mails envoyés par la plateforme : noms bien écrits, titre en
// majuscules, encadré récapitulatif, et signature de la personne qui envoie (nom, fonction,
// e-mail, téléphone). mailer.js habille tout e-mail avec miseEnPage().
// Styles en ligne : la plupart des messageries ignorent les feuilles de style.

const BLEU = '#063a5c';

// Fonction affichée sous le nom du signataire, selon son rôle
const FONCTIONS = {
  'Super Admin': 'Direction',
  Accueil: 'Accueil et scolarité',
  Formateur: 'Formateur',
};

// « andry » -> « Andry », « ny aina » -> « Ny Aina », « jean-luc » -> « Jean-Luc »
function formaterPrenom(prenom = '') {
  return String(prenom ?? '')
    .trim()
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (_, separateur, lettre) => separateur + lettre.toUpperCase());
}

// Nom de famille en majuscules, comme sur les documents officiels : « RAKOTOARISOA »
function formaterNom(nom = '') {
  return String(nom ?? '').trim().toUpperCase();
}

// « Andry RAKOTOARISOA »
function nomComplet(prenom, nom) {
  return [formaterPrenom(prenom), formaterNom(nom)].filter(Boolean).join(' ');
}

// « 0340211458 » -> « 034 02 114 58 » (numéro malgache à 10 chiffres ; sinon laissé tel quel)
function formaterTelephone(telephone = '') {
  const chiffres = String(telephone ?? '').replace(/\D/g, '');
  if (chiffres.length !== 10) return String(telephone ?? '').trim();
  return `${chiffres.slice(0, 3)} ${chiffres.slice(3, 5)} ${chiffres.slice(5, 8)} ${chiffres.slice(8)}`;
}

// « Bonjour Andry RAKOTOARISOA, » (ou « Bonjour, » si le nom est inconnu)
function salutation(prenom, nom) {
  const complet = nomComplet(prenom, nom);
  return `<p style="margin:0 0 16px;">Bonjour${complet ? ` <strong>${complet}</strong>` : ''},</p>`;
}

// Titre de l'e-mail, en majuscules : « CONFIRMATION DE PAIEMENT »
function titre(texte) {
  return `<h1 style="margin:0 0 20px;color:${BLEU};font-size:20px;letter-spacing:0.5px;">${String(texte).toUpperCase()}</h1>`;
}

// Encadré récapitulatif : lignes = [[libellé, valeur], ...] ; valeurs en gras, lignes vides ignorées
function encadre(lignes) {
  const contenu = lignes
    .filter(([, valeur]) => valeur !== undefined && valeur !== null && valeur !== '')
    .map(([libelle, valeur]) => `<tr>
        <td style="padding:7px 12px;color:#64748b;white-space:nowrap;vertical-align:top;">${libelle}</td>
        <td style="padding:7px 12px;color:#0f172a;font-weight:bold;">${valeur}</td>
      </tr>`)
    .join('');
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:18px 0;border-collapse:collapse;background:#f1f5f9;border-left:4px solid ${BLEU};border-radius:4px;font-size:14px;">${contenu}</table>`;
}

// Nom de formation mis en valeur : « DÉVELOPPEMENT WEB » en gras
function formation(nom) {
  return `<strong>${String(nom ?? '').toUpperCase()}</strong>`;
}

// Signature : la personne qui a fait l'action (ou le contact de l'Accueil pour un envoi automatique)
function signature(expediteur) {
  if (!expediteur?.email) {
    return `<p style="margin:28px 0 0;">Cordialement,<br><strong>L'équipe IMTECH INFO</strong></p>`;
  }
  const telephone = formaterTelephone(expediteur.telephone);
  const fonction = FONCTIONS[expediteur.role] || 'IMTECH INFO';
  return `<p style="margin:28px 0 6px;">Cordialement,</p>
      <table role="presentation" cellspacing="0" cellpadding="0" style="border-top:2px solid ${BLEU};padding-top:10px;font-size:14px;line-height:1.6;">
        <tr><td style="padding-top:10px;">
          <strong style="font-size:15px;color:${BLEU};">${nomComplet(expediteur.prenom, expediteur.nom)}</strong><br>
          <span style="color:#475569;">${fonction} — <strong>IMTECH INFO</strong></span><br>
          E-mail : <a href="mailto:${expediteur.email}" style="color:${BLEU};font-weight:bold;">${expediteur.email}</a><br>
          ${telephone ? `Téléphone : <strong>${telephone}</strong>` : ''}
        </td></tr>
      </table>`;
}

// Encadre le contenu : bandeau IMTECH INFO, texte, signature et mention « message automatique ».
function miseEnPage(contenuHtml, expediteur = null) {
  return `<div style="margin:0;padding:24px 0;background:#eef2f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
    <div style="padding:18px 28px;background:${BLEU};color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:2px;">
      IMTECH INFO
      <div style="font-size:12px;font-weight:normal;letter-spacing:0.5px;opacity:0.85;">Centre de formation en informatique</div>
    </div>
    <div style="padding:28px;color:#1e293b;font-size:15px;line-height:1.6;">
      ${contenuHtml}
      ${signature(expediteur)}
    </div>
    <div style="padding:14px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5;">
      Ce message vous a été envoyé par la plateforme <strong>IMTECH INFO</strong>.
      ${expediteur?.email
        ? 'Vous pouvez y répondre directement : votre réponse parviendra à votre interlocuteur.'
        : "Pour toute question, contactez l'Accueil ou utilisez l'assistance de l'application mobile."}
    </div>
  </div>
</div>`;
}

module.exports = {
  formaterPrenom, formaterNom, nomComplet, formaterTelephone,
  salutation, titre, encadre, formation, signature, miseEnPage,
};
