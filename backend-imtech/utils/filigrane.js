// utils/filigrane.js
// Filigrane dynamique ajouté au moment où un fichier est servi (le fichier sur disque reste intact).
// Il porte le nom, l'e-mail de la personne qui consulte et la date : une capture ou une photo
// qui circule hors d'IMTECH permet de savoir d'où vient la fuite.
const { PDFDocument, StandardFonts, rgb, degrees } = require('pdf-lib');
const sharp = require('sharp');

const IMAGES = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

// Texte du filigrane : "IMTECH INFO · Prénom Nom · email · date heure"
function texteFiligrane(utilisateur) {
  const date = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  const nom = `${utilisateur.prenom || ''} ${utilisateur.nom || ''}`.trim();
  return `IMTECH INFO · ${nom} · ${utilisateur.email || ''} · ${date}`;
}

// Les polices standard des PDF ne connaissent que le Latin-1 (accents français compris)
function latin1(texte) {
  return texte.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

// Ajoute le filigrane sur chaque page du PDF (taille du texte proportionnelle à la page)
async function filigranerPdf(buffer, texte) {
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const police = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ligne = latin1(texte);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const taille = Math.max(10, Math.min(width, height) / 38);
    const largeurTexte = police.widthOfTextAtSize(ligne, taille);

    // Texte répété en diagonale sur toute la page : impossible de le rogner proprement
    for (let y = -height; y < height * 1.5; y += taille * 9) {
      for (let x = -width; x < width * 1.5; x += largeurTexte + taille * 4) {
        page.drawText(ligne, {
          x, y, size: taille, font: police,
          color: rgb(0.55, 0.55, 0.55), opacity: 0.22, rotate: degrees(30),
        });
      }
    }
  }
  return Buffer.from(await pdf.save());
}

// Le texte est injecté dans un SVG : on échappe les caractères spéciaux XML
function echapperXml(texte) {
  return texte.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

// Superpose à l'image un SVG transparent contenant le texte répété en diagonale (motif <pattern>),
// puis réencode l'image dans son format d'origine
async function filigranerImage(buffer, texte) {
  const image = sharp(buffer);
  const { width, height, format } = await image.metadata();
  const taille = Math.max(12, Math.round(Math.min(width, height) / 28));

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <pattern id="f" width="${taille * 32}" height="${taille * 7}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
          <text x="0" y="${taille * 2}" font-family="Arial, sans-serif" font-size="${taille}" font-weight="bold"
                fill="#808080" fill-opacity="0.35">${echapperXml(texte)}</text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#f)" />
    </svg>`;

  return image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .toFormat(format)
    .toBuffer();
}

// Renvoie le fichier filigrané, ou null si ce type de fichier n'est pas pris en charge
async function filigraner(buffer, extension, utilisateur) {
  const texte = texteFiligrane(utilisateur);
  if (extension === '.pdf') return filigranerPdf(buffer, texte);
  if (IMAGES.has(extension)) return filigranerImage(buffer, texte);
  return null;
}

module.exports = { filigraner, texteFiligrane };
