require('dotenv').config();
const mysql = require('mysql2/promise');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET manquant dans le fichier .env — arrêt du serveur.');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestion_formation_db',
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;