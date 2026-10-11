// Connexion MySQL partagée par tous les models (pool de connexions, API à promesses).
require('dotenv').config();
const mysql = require('mysql2/promise');

// Sans secret JWT, aucun token ne peut être signé/vérifié : on refuse de démarrer.
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET manquant dans le fichier .env — arrêt du serveur.');
}

// Pool : réutilise jusqu'à 10 connexions au lieu d'en ouvrir une par requête
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestion_formation_db',
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;