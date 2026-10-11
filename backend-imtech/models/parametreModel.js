// Model des paramètres de l'application modifiables par le Super Admin (table clé -> valeur).
const db = require('../config/db');

// Valeur d'un paramètre, null s'il n'existe pas
async function getParametre(cle) {
  const [rows] = await db.query('SELECT valeur FROM parametre_application WHERE cle = ?', [cle]);
  return rows[0]?.valeur ?? null;
}

// Crée ou remplace la valeur d'un paramètre
async function setParametre(cle, valeur) {
  await db.query(
    `INSERT INTO parametre_application (cle, valeur) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)`,
    [cle, valeur]
  );
}

module.exports = { getParametre, setParametre };
