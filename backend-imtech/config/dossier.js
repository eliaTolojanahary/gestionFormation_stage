// Pièces du dossier étudiant : toutes obligatoires. Une colonne de la table `etudiant` par pièce.
// Une inscription en ligne n'est validée par l'Accueil que si le dossier est complet ;
// l'étudiant dépose ou remplace ses pièces depuis le mobile (menu ⋮ > Mon dossier).
const PIECES_DOSSIER = [
  { champ: 'photo_1', libelle: "Photo d'identité n°1" },
  { champ: 'photo_2', libelle: "Photo d'identité n°2" },
  { champ: 'photocopie_cin', libelle: 'Photocopie de la CIN' },
  { champ: 'certificat_residence', libelle: 'Certificat de résidence' },
];

const CHAMPS_DOSSIER = PIECES_DOSSIER.map((p) => p.champ);

// Formats acceptés : photo prise avec le téléphone ou PDF scanné
const TYPES_PIECE = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

// SQL : nombre de pièces fournies pour l'étudiant d'alias `alias` (0 à 4)
const PIECES_FOURNIES = (alias = 'e') =>
  `(${CHAMPS_DOSSIER.map((c) => `(COALESCE(${alias}.${c}, '') <> '')`).join(' + ')})`;

// Libellés des pièces manquantes (dossier complet : [])
function piecesManquantes(etudiant = {}) {
  return PIECES_DOSSIER.filter((p) => !etudiant[p.champ]).map((p) => p.libelle);
}

// État du dossier renvoyé au mobile et au web : chaque pièce avec son fichier (ou null)
function etatDossier(etudiant = {}) {
  const pieces = PIECES_DOSSIER.map((p) => ({ ...p, fichier: etudiant[p.champ] || null }));
  const fournies = pieces.filter((p) => p.fichier).length;
  return { pieces, fournies, total: pieces.length, complet: fournies === pieces.length };
}

module.exports = { PIECES_DOSSIER, CHAMPS_DOSSIER, TYPES_PIECE, PIECES_FOURNIES, piecesManquantes, etatDossier };
