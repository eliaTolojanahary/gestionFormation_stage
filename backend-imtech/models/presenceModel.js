// Model de la présence : un jour où l'étudiant a utilisé l'application.
const db = require('../config/db');

// Jour déjà enregistré pour chaque utilisateur (évite une requête SQL à chaque appel API)
const dernierJourEnregistre = new Map();

function aujourdhui() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Marque l'utilisateur présent aujourd'hui (une seule ligne par jour grâce à uq_presence)
async function marquerPresence(id_utilisateur) {
  const jour = aujourdhui();
  if (dernierJourEnregistre.get(id_utilisateur) === jour) return;

  await db.query('INSERT IGNORE INTO presence (id_utilisateur, jour) VALUES (?, ?)', [id_utilisateur, jour]);
  dernierJourEnregistre.set(id_utilisateur, jour);
}

module.exports = { marquerPresence };
