const db = require('../config/db');

// Exécute `fn(connection)` dans une transaction : commit si tout passe, rollback sinon.
// Toutes les requêtes de `fn` doivent utiliser `connection` (pas `db`) pour faire partie de la transaction.
async function avecTransaction(fn) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const resultat = await fn(connection);
    await connection.commit();
    return resultat;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { avecTransaction };
