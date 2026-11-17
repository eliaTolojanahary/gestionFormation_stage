// Réduit une fois pour toutes les photos de profil déjà présentes dans uploads/utilisateurs
// (les nouvelles le sont à l'upload par middlewares/reduirePhoto.js). Même règle : 400 px au plus
// sur le côté le plus long, même format, même nom de fichier (rien à changer en base).
// Le dossier ne contient que des photos de profil (champ "photo", voir FIELD_OVERRIDES de docUpload.js).
// Lancement : node scripts/reduirePhotos.js   (faire une copie de uploads/ avant, l'opération est définitive)
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const DOSSIER = path.join(__dirname, '..', 'uploads', 'utilisateurs');
const TAILLE_MAX = 400;
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function main() {
  const noms = await fs.readdir(DOSSIER);
  let avant = 0;
  let apres = 0;
  let reduites = 0;

  for (const nom of noms) {
    if (!EXTENSIONS.has(path.extname(nom).toLowerCase())) continue;
    const chemin = path.join(DOSSIER, nom);
    try {
      const original = await fs.readFile(chemin);
      const reduite = await sharp(original)
        .rotate()
        .resize(TAILLE_MAX, TAILLE_MAX, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();
      avant += original.length;
      if (reduite.length < original.length) {
        await fs.writeFile(chemin, reduite);
        apres += reduite.length;
        reduites += 1;
      } else {
        apres += original.length;
      }
    } catch (err) {
      console.warn(`Ignorée (illisible) : ${nom} — ${err.message}`);
    }
  }

  const ko = (octets) => `${Math.round(octets / 1024)} Ko`;
  console.log(`${reduites} photo(s) réduite(s) : ${ko(avant)} -> ${ko(apres)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
