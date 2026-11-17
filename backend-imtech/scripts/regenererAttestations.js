// Refait le PDF de toutes les attestations déjà délivrées, avec le lien de vérification actuel
// (URL_BASE du .env). À lancer quand l'adresse du serveur change (autre réseau, jour de la
// soutenance) ou pour donner un PDF aux attestations des données de démonstration qui n'en ont pas.
// Garde la référence (uuid) et la date de délivrance : un QR code déjà imprimé reste valable si
// l'adresse n'a pas changé. Aucun e-mail ni notification n'est envoyé.
// Usage : node scripts/regenererAttestations.js
require('dotenv').config({ quiet: true });
const db = require('../config/db');
const documentModel = require('../models/documentModel');
const { genererAttestationPDF } = require('../utils/pdf');
const { genererQRCodeBuffer } = require('../utils/qrcode');
const { supprimerUpload } = require('../utils/fichiersUpload');

const URL_BASE = process.env.URL_BASE || 'http://localhost:3000/api';

async function regenerer() {
  if (!/\/api\/?$/.test(URL_BASE) || /localhost|127\.0\.0\.1/.test(URL_BASE)) {
    console.warn(`URL_BASE = ${URL_BASE} : un téléphone ne pourra pas l'ouvrir ` +
      '(il faut l\'adresse du PC sur le réseau, terminée par /api).');
  }

  const [attestations] = await db.query(
    'SELECT id_inscription, uuid_verification, date_delivrance, fichier_pdf FROM attestation ORDER BY id_attestation'
  );
  let refaites = 0;
  for (const a of attestations) {
    const donnees = await documentModel.findInscriptionPourAttestation(a.id_inscription);
    if (!donnees) {
      console.warn(`Inscription ${a.id_inscription} désactivée : attestation ignorée.`);
      continue;
    }
    const qr = await genererQRCodeBuffer(`${URL_BASE.replace(/\/$/, '')}/verification/${a.uuid_verification}`);
    const nomFichier = `attestation_${a.id_inscription}_${Date.now()}.pdf`;
    const chemin = await genererAttestationPDF({ ...donnees, date_delivrance: a.date_delivrance }, qr, nomFichier);
    await db.query('UPDATE attestation SET fichier_pdf = ? WHERE id_inscription = ?', [chemin, a.id_inscription]);
    await supprimerUpload(a.fichier_pdf); // ancien PDF (ancien lien)
    console.log(`${donnees.prenom} ${donnees.nom} — ${donnees.formation_nom} → ${chemin}`);
    refaites += 1;
  }
  console.log(`${refaites} attestation(s) refaite(s) avec le lien ${URL_BASE}/verification/<référence>.`);
}

regenerer()
  .catch((error) => {
    console.error('Erreur :', error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
