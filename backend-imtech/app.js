// app.js
// Point d'entrée de l'API IMTECH : configuration d'Express, routes, gestion des erreurs
// et démarrage du serveur.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const os = require('os');
const multer = require('multer');
const { AppError } = require('./utils/errors');
const { servirFichiers } = require('./middlewares/fichierMiddleware');

const app = express();

// Middlewares globaux
// CORS_ORIGIN (optionnel) : liste d'origines séparées par des virgules, ex. "http://localhost:5173"
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN.split(',') } : {}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route de santé
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API IMTECH INFO opérationnelle !',
    timestamp: new Date(),
  });
});

// Fichiers uploadés : connexion + droits obligatoires, filigrane sur les documents
// (plus de express.static : avant, n'importe qui ayant l'URL pouvait télécharger le fichier)
app.use('/api/documents', servirFichiers('documents'));
app.use('/api/formations', servirFichiers('formations'));
app.use('/api/vitrine', servirFichiers('vitrine'));
app.use('/api/etudiants', servirFichiers('etudiants'));
app.use('/api/supports', servirFichiers('supports'));
app.use('/api/utilisateurs', servirFichiers('utilisateurs'));

// Routes API (préfixe /api)
app.use('/api', require('./routes/routes'));

// 404
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route introuvable : ${req.method} ${req.originalUrl}` });
});

// Gestionnaire d'erreurs unique : les controllers et services se contentent de `throw`.
// (Express 5 transmet automatiquement ici les erreurs des fonctions async.)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ status: 'error', message: err.message });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux.' : `Erreur d'upload : ${err.message}`;
    return res.status(400).json({ status: 'error', message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ status: 'error', message: 'Corps de requête JSON invalide.' });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ status: 'error', message: 'Cet email existe déjà.' });
  }

  // Erreur inattendue : on la journalise mais on ne renvoie jamais son détail au client
  console.error(`❌ ${req.method} ${req.originalUrl} :`, err);
  return res.status(500).json({ status: 'error', message: 'Erreur serveur.' });
});

// Adresses IPv4 du réseau local (pour tester depuis un téléphone sur le même Wi-Fi)
function adressesReseauLocal() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((iface) => iface && iface.family === 'IPv4' && !iface.internal)
    .map((iface) => iface.address);
}

// Démarrage uniquement si lancé directement (`node app.js`), pas quand il est importé par les tests
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const HOST = '0.0.0.0'; // écoute sur toutes les interfaces : nécessaire pour le mobile

  app.listen(PORT, HOST, () => {
    console.log('\n🚀 Serveur IMTECH démarré !');
    console.log('─────────────────────────────────────────');
    console.log(`   Local          : http://localhost:${PORT}/api`);
    console.log(`   Android Emu    : http://10.0.2.2:${PORT}/api`);
    adressesReseauLocal().forEach((ip) => console.log(`   Réseau (Wi-Fi) : http://${ip}:${PORT}/api`));
    // Alertes pour l'Accueil : rappels J-2 et fins de formation (au démarrage puis toutes les heures)
    require('./services/alerteService').demarrerAlertesAutomatiques();
    // Supports programmés : annonce 1 h avant puis envoi automatique (vérifié chaque minute)
    require('./services/supportProgrammeService').demarrerEnvoisProgrammes();
    console.log('─────────────────────────────────────────\n');
  });
}

module.exports = app;
