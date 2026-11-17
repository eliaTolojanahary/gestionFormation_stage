const fs = require('fs/promises');
const sharp = require('sharp');

// Réduit la photo de profil (champ "photo") juste après l'upload multer : elle n'est affichée qu'en
// petit (avatars de 24 à 120 px), inutile de garder une photo de téléphone de 3 Mo. Le fichier est
// réécrit au même endroit, dans le même format (le chemin enregistré en base ne change pas).
// Seul le champ "photo" est touché : les pièces du dossier (CIN, certificat...) gardent leur netteté.
const TAILLE_MAX = 400; // px, côté le plus long
const IMAGES = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function reduire(fichier) {
  if (!fichier || fichier.fieldname !== 'photo' || !IMAGES.has(fichier.mimetype)) return;
  const original = await fs.readFile(fichier.path);
  const reduite = await sharp(original)
    .rotate() // applique l'orientation EXIF des photos de téléphone avant de la perdre
    .resize(TAILLE_MAX, TAILLE_MAX, { fit: 'inside', withoutEnlargement: true })
    .toBuffer();
  if (reduite.length < original.length) {
    await fs.writeFile(fichier.path, reduite);
    fichier.size = reduite.length;
  }
}

// Middleware : req.file (upload.single) ou req.files.photo (upload.fields).
// Une image illisible est laissée telle quelle plutôt que de bloquer l'enregistrement.
async function reduirePhoto(req, _res, next) {
  const fichiers = [req.file, ...(req.files?.photo || [])];
  for (const fichier of fichiers) {
    try {
      await reduire(fichier);
    } catch {
      // image corrompue ou format non lu par sharp : on garde l'original
    }
  }
  next();
}

module.exports = reduirePhoto;
