// Génération des documents PDF officiels (fiche d'inscription, facture, attestation) avec pdfkit.
// Les fichiers sont écrits dans uploads/documents ; chaque fonction renvoie le chemin relatif
// ("documents/xxx.pdf") à enregistrer en base.
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const DOSSIER_DOCUMENTS = path.join(__dirname, '..', 'uploads', 'documents');
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logoImtech.png'); 

// Charte graphique IMTECH utilisée dans tous les PDF
const COULEURS = {
  primaire: '#002E4F',
  succes: '#5A9032',
  accent: '#EFC32E',
  gris: '#7F8A97',
  fond: '#F5F7F9',
  texte: '#1F2937',
};

function assurerDossier() {
  if (!fs.existsSync(DOSSIER_DOCUMENTS)) {
    fs.mkdirSync(DOSSIER_DOCUMENTS, { recursive: true });
  }
}

// Relie le PDF à son fichier et renvoie une promesse résolue quand le fichier est entièrement écrit
// (sans cela, un e-mail envoyé juste après pourrait joindre un fichier incomplet).
function ecrireVers(doc, chemin) {
  return new Promise((resolve, reject) => {
    const flux = fs.createWriteStream(chemin);
    flux.on('finish', resolve);
    flux.on('error', reject);
    doc.pipe(flux);
  });
}

// A4 sans marge : toutes les positions sont données en coordonnées absolues (points)
function creerDocument() {
  return new PDFDocument({ size: 'A4', margin: 0 });
}

// ─── Éléments graphiques réutilisables ──────

// Logo IMTECH (ignoré si le fichier assets/logoImtech.png est absent)
function dessinerLogo(doc, x, y, largeur) {
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, x, y, { width: largeur });
  }
}

// Bandeau bleu en haut de page : logo + "IMTECH INFO" à gauche, titre du document à droite
function dessinerEntete(doc, titre) {
  doc.rect(0, 0, doc.page.width, 110).fill(COULEURS.primaire);

  dessinerLogo(doc, 50, 25, 60);

  doc.fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(20)
    .text('IMTECH INFO', 120, 35);

  doc.font('Helvetica')
    .fontSize(9)
    .fillColor('#D9E4EC')
    .text('Centre de formation', 120, 60);

  doc.font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#FFFFFF')
    .text(titre, 0, 45, { align: 'right', width: doc.page.width - 50 });

  doc.rect(0, 110, doc.page.width, 4).fill(COULEURS.accent);
}

// Trait de séparation + texte centré en bas de page
function dessinerPiedDePage(doc, texte) {
  const y = doc.page.height - 60;
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#E2E8F0').lineWidth(1).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(COULEURS.gris)
    .text(texte, 50, y + 10, { align: 'center', width: doc.page.width - 100 });
}

// Ligne "LIBELLÉ    valeur" (affiche "-" si la valeur est absente)
function ligneInfo(doc, x, y, label, valeur, largeurLabel = 140) {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COULEURS.gris)
    .text(label.toUpperCase(), x, y, { width: largeurLabel });
  doc.font('Helvetica').fontSize(11).fillColor(COULEURS.texte)
    .text(valeur ?? '-', x + largeurLabel, y, { width: 300 });
}

// Cadre gris clair aux coins arrondis servant de fond à un bloc d'informations
function encadre(doc, x, y, largeur, hauteur) {
  doc.roundedRect(x, y, largeur, hauteur, 6)
    .fillAndStroke(COULEURS.fond, '#E2E8F0');
}

// ─── Documents ──────────────────────────────

// Fiche d'inscription : infos de l'étudiant + formation choisie et tarif

async function genererFichePDF(donnees, nomFichier) {
  assurerDossier();
  const chemin = path.join(DOSSIER_DOCUMENTS, nomFichier);
  const doc = creerDocument();
  const ecriture = ecrireVers(doc, chemin);

  dessinerEntete(doc, "FICHE D'INSCRIPTION");

  let y = 150;
  encadre(doc, 50, y, doc.page.width - 100, 200);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COULEURS.primaire)
    .text('Informations de l\'étudiant', 70, y + 20);

  y += 50;
  ligneInfo(doc, 70, y, 'Étudiant', `${donnees.prenom} ${donnees.nom}`); y += 26;
  ligneInfo(doc, 70, y, 'Email', donnees.email); y += 26;
  ligneInfo(doc, 70, y, 'Téléphone', donnees.telephone); y += 26;
  ligneInfo(doc, 70, y, 'Date d\'inscription', formatDate(donnees.date_inscription));

  y += 60;
  encadre(doc, 50, y, doc.page.width - 100, 130);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COULEURS.primaire)
    .text('Détails de la formation', 70, y + 20);

  y += 50;
  ligneInfo(doc, 70, y, 'Formation', donnees.formation_nom); y += 26;
  ligneInfo(doc, 70, y, 'Tarif', `${formatMontant(donnees.tarif)} Ar`);

  dessinerPiedDePage(doc, `IMTECH INFO — Fiche générée le ${formatDate(new Date())} — Document à usage administratif`);

  doc.end();
  await ecriture;
  return `documents/${nomFichier}`;
}

// Facture d'un paiement : numéro, client, tableau (description / mode / montant),
// total payé et reste à payer sur la formation
async function genererFacturePDF(donnees, nomFichier) {
  assurerDossier();

  const chemin = path.join(DOSSIER_DOCUMENTS, nomFichier);
  const doc = creerDocument();

  const ecriture = ecrireVers(doc, chemin);

  dessinerEntete(doc, 'FACTURE');

  let y = 150;

  // Numéro de facture
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(COULEURS.gris)
    .text('N° FACTURE', 50, y);

  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(COULEURS.primaire)
    .text(donnees.numero_facture, 50, y + 16);

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(COULEURS.gris)
    .text(
      `Date : ${formatDate(donnees.date_paiement)}`,
      0,
      y + 5,
      {
        align: 'right',
        width: doc.page.width - 50
      }
    );

  y += 70;

  // Informations du client
  encadre(doc, 50, y, doc.page.width - 100, 90);

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(COULEURS.primaire)
    .text('Facturé à', 70, y + 15);

  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor(COULEURS.texte)
    .text(`${donnees.prenom} ${donnees.nom}`, 70, y + 35);

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(COULEURS.gris)
    .text(`Formation : ${donnees.formation_nom}`, 70, y + 55);

  y += 120;

  // Tableau
  const tableX = 50;
  const tableW = doc.page.width - 100;

  doc
    .rect(tableX, y, tableW, 30)
    .fill(COULEURS.primaire);

  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Description', tableX + 15, y + 10)
    .text('Mode de paiement', tableX + 260, y + 10)
    .text(
      'Montant',
      tableX + tableW - 100,
      y + 10,
      {
        width: 85,
        align: 'right'
      }
    );

  y += 30;

  doc
    .rect(tableX, y, tableW, 40)
    .fillAndStroke('#FFFFFF', '#E2E8F0');

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(COULEURS.texte)
    .text(
      `Paiement — ${donnees.formation_nom}`,
      tableX + 15,
      y + 14,
      {
        width: 230
      }
    )
    .text(
      donnees.mode_paiement || '-',
      tableX + 260,
      y + 14
    )
    .text(
      `${formatMontant(donnees.montant)} Ar`,
      tableX + tableW - 100,
      y + 14,
      {
        width: 85,
        align: 'right'
      }
    );

  y += 55;

  // Total payé
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(COULEURS.primaire)
    .text('Total payé', tableX + 260, y)
    .text(
      `${formatMontant(donnees.montant)} Ar`,
      tableX + tableW - 100,
      y,
      {
        width: 85,
        align: 'right'
      }
    );

  // Reste à payer
  y += 25;

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(COULEURS.gris)
    .text('Reste à payer', tableX + 260, y)
    .text(
      `${formatMontant(donnees.reste_a_payer)} Ar`,
      tableX + tableW - 100,
      y,
      {
        width: 85,
        align: 'right'
      }
    );

  dessinerPiedDePage(
    doc,
    'IMTECH INFO — Merci pour votre confiance — Document généré automatiquement'
  );

  doc.end();
  await ecriture;

  return `documents/${nomFichier}`;
}

// Attestation de fin de formation : double cadre, nom de l'étudiant, formation, durée,
// note éventuelle, et QR code menant à la page publique de vérification d'authenticité
async function genererAttestationPDF(donnees, qrCodeBuffer, nomFichier) {
  assurerDossier();
  const chemin = path.join(DOSSIER_DOCUMENTS, nomFichier);
  const doc = creerDocument();
  const ecriture = ecrireVers(doc, chemin);

  // Double bordure (bleue puis jaune)
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
    .lineWidth(2).stroke(COULEURS.primaire);
  doc.rect(28, 28, doc.page.width - 56, doc.page.height - 56)
    .lineWidth(1).stroke(COULEURS.accent);

  // Logo centré en haut de l'attestation
  dessinerLogo(doc, doc.page.width / 2 - 35, 50, 70);

  doc.font('Helvetica-Bold').fontSize(14).fillColor(COULEURS.gris)
    .text('IMTECH INFO', 0, 125, { align: 'center' });

  doc.font('Helvetica-Bold').fontSize(28).fillColor(COULEURS.primaire)
    .text('ATTESTATION DE FORMATION', 0, 155, { align: 'center' });

  doc.moveTo(180, 200).lineTo(doc.page.width - 180, 200)
    .strokeColor(COULEURS.accent).lineWidth(2).stroke();

  doc.font('Helvetica').fontSize(13).fillColor(COULEURS.texte)
    .text('Nous certifions par la présente que', 0, 240, { align: 'center' });

  doc.font('Helvetica-Bold').fontSize(22).fillColor(COULEURS.primaire)
    .text(`${donnees.prenom} ${donnees.nom}`, 0, 270, { align: 'center' });

  doc.font('Helvetica').fontSize(13).fillColor(COULEURS.texte)
    .text('a suivi avec succès la formation', 0, 315, { align: 'center' });

  doc.font('Helvetica-Bold').fontSize(17).fillColor(COULEURS.succes)
    .text(donnees.formation_nom, 0, 340, { align: 'center' });

  doc.font('Helvetica').fontSize(11).fillColor(COULEURS.gris)
    .text(`Durée : ${donnees.duree}`, 0, 375, { align: 'center' })
    .text(`Délivrée le ${formatDate(donnees.date_delivrance)}`, 0, 392, { align: 'center' });

  if (donnees.note !== null && donnees.note !== undefined) {
    doc.font('Helvetica-Bold').fontSize(14).fillColor(COULEURS.primaire)
      .text(`Note obtenue : ${Number(donnees.note).toLocaleString('fr-FR')} / 20`, 0, 420, { align: 'center' });
  }

  // Bas de page : QR code à gauche, zone cachet/signature à droite
  const qrY = doc.page.height - 190;
  doc.image(qrCodeBuffer, 80, qrY, { width: 90 });
  doc.font('Helvetica').fontSize(8).fillColor(COULEURS.gris)
    .text("Scannez pour vérifier\nl'authenticité de ce document", 80, qrY + 95, { width: 110 });

  doc.font('Helvetica-Bold').fontSize(11).fillColor(COULEURS.primaire)
    .text('IMTECH INFO', doc.page.width - 220, qrY + 40, { width: 140, align: 'center' });
  doc.moveTo(doc.page.width - 220, qrY + 60).lineTo(doc.page.width - 80, qrY + 60)
    .strokeColor(COULEURS.gris).lineWidth(1).stroke();
  doc.font('Helvetica').fontSize(9).fillColor(COULEURS.gris)
    .text('Cachet et signature', doc.page.width - 220, qrY + 65, { width: 140, align: 'center' });

  doc.end();
  await ecriture;
  return `documents/${nomFichier}`;
}

// ─── Formatage ──────────────────────────────

// Ex. "08 octobre 2026"
function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Ex. 150000 -> "150 000"
function formatMontant(montant) {
  return Number(montant || 0).toLocaleString('fr-FR');
}

module.exports = { genererFichePDF, genererFacturePDF, genererAttestationPDF };