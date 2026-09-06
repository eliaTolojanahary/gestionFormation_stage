const QRCode = require('qrcode');

async function genererQRCodeBuffer(url) {
  return await QRCode.toBuffer(url, { width: 200, margin: 1 });
}

module.exports = { genererQRCodeBuffer };