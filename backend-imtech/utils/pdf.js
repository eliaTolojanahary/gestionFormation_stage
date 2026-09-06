const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const DOSSIER_DOCUMENTS = path.join(__dirname, '..', '..', 'uploads', 'documents');

function assurerDossier() {
  if (!fs.existsSync(DOSSIER_DOCUMENTS)) {
    fs.mkdirSync(DOSSIER_DOCUMENTS, { recursive: true });
  }
}

async function genererFichePDF(donnees, nomFichier) {
  assurerDossier();
  const chemin = path.join(DOSSIER_DOCUMENTS, nomFichier);
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(chemin));

  doc.fontSize(18).text("Fiche d'inscription", { align: 'center' });
  doc.moveDown();
  doc.fontSize(12);
  doc.text(`Étudiant : ${donnees.prenom} ${donnees.nom}`);
  doc.text(`Email : ${donnees.email}`);
  doc.text(`Téléphone : ${donnees.telephone}`);
  doc.text(`Formation : ${donnees.formation_nom}`);
  doc.text(`Tarif : ${donnees.tarif} Ar`);
  doc.text(`Date d'inscription : ${donnees.date_inscription}`);

  doc.end();
  return `documents/${nomFichier}`;
}

async function genererFacturePDF(donnees, nomFichier) {
  assurerDossier();
  const chemin = path.join(DOSSIER_DOCUMENTS, nomFichier);
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(chemin));

  doc.fontSize(18).text("Facture", { align: 'center' });
  doc.moveDown();
  doc.fontSize(12);
  doc.text(`N° Facture : ${donnees.numero_facture}`);
  doc.text(`Étudiant : ${donnees.prenom} ${donnees.nom}`);
  doc.text(`Formation : ${donnees.formation_nom}`);
  doc.text(`Montant payé : ${donnees.montant} Ar`);
  doc.text(`Mode de paiement : ${donnees.mode_paiement}`);
  doc.text(`Date : ${donnees.date_paiement}`);

  doc.end();
  return `documents/${nomFichier}`;
}

async function genererAttestationPDF(donnees, qrCodeBuffer, nomFichier) {
  assurerDossier();
  const chemin = path.join(DOSSIER_DOCUMENTS, nomFichier);
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(chemin));

  doc.fontSize(20).text("Attestation de formation", { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(13);
  doc.text(`Nous certifions que ${donnees.prenom} ${donnees.nom}`);
  doc.text(`a suivi la formation : ${donnees.formation_nom}`);
  doc.text(`Durée : ${donnees.duree}`);
  doc.text(`Délivrée le : ${donnees.date_delivrance}`);

  // Insertion du QR code en bas de page
  doc.image(qrCodeBuffer, 50, 650, { width: 100 });
  doc.fontSize(9).text("Scannez pour vérifier l'authenticité", 160, 690);

  doc.end();
  return `documents/${nomFichier}`;
}

module.exports = { genererFichePDF, genererFacturePDF, genererAttestationPDF };