const QRCode = require('qrcode');

// Génère l'image PNG (en mémoire) d'un QR code pointant vers `url`, pour l'insérer dans un PDF.
async function genererQRCodeBuffer(url) {
  return await QRCode.toBuffer(url, { width: 200, margin: 1 });
}

module.exports = { genererQRCodeBuffer };