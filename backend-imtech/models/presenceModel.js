// Model de la présence : un jour où l'étudiant a ouvert un support, réagi ou commenté
// (appelé par middlewares/presence.js, voir les règles là-bas).
const db = require('../config/db');

// Utilisateurs déjà marqués présents aujourd'hui (évite une requête SQL à chaque appel API).
// Vidé quand le jour change : la mémoire ne garde que les étudiants actifs du jour.
let jourEnMemoire = null;
const presentsDuJour = new Set();

function aujourdhui() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Marque l'utilisateur présent aujourd'hui (une seule ligne par jour grâce à uq_presence)
async function marquerPresence(id_utilisateur) {
  const jour = aujourdhui();
  if (jour !== jourEnMemoire) {
    presentsDuJour.clear();
    jourEnMemoire = jour;
  }
  if (presentsDuJour.has(id_utilisateur)) return;

  await db.query('INSERT IGNORE INTO presence (id_utilisateur, jour) VALUES (?, ?)', [id_utilisateur, jour]);
  if (jour === jourEnMemoire) presentsDuJour.add(id_utilisateur);
}

module.exports = { marquerPresence };
