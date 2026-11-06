// Fichiers reçus par multer (.fields) : chemins à enregistrer en base, et nettoyage du disque.
const fs = require('fs/promises');
const path = require('path');

const DOSSIER_UPLOADS = path.join(__dirname, '..', 'uploads');

// req.files -> { champ: 'dossier/nom-fichier' } pour les champs listés dans `champs`
function cheminsUploades(files, dossier, champs) {
  return Object.fromEntries(
    champs.filter((champ) => files?.[champ]?.[0]).map((champ) => [champ, `${dossier}/${files[champ][0].filename}`])
  );
}

// Supprime un fichier de uploads/ ('etudiants/xxx.jpg'), sans erreur s'il a déjà disparu
async function supprimerUpload(chemin) {
  if (!chemin) return;
  const absolu = path.join(DOSSIER_UPLOADS, chemin);
  if (!absolu.startsWith(DOSSIER_UPLOADS + path.sep)) return; // jamais en dehors de uploads/
  await fs.unlink(absolu).catch(() => {});
}

// Requête refusée après l'upload (validation, e-mail déjà pris...) : on ne garde pas les fichiers reçus
async function supprimerFichiersRecus(files) {
  const liste = Object.values(files || {}).flat();
  await Promise.all(liste.map((f) => fs.unlink(f.path).catch(() => {})));
}

module.exports = { cheminsUploades, supprimerUpload, supprimerFichiersRecus };
