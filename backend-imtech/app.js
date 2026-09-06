require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middlewares globaux (OBLIGATOIREMENT AVANT LES ROUTES)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route de santé (Test direct dans le navigateur ou Postman)
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API IMTECH INFO opérationnelle !',
    timestamp: new Date()
  });
});

// Fichiers statiques (PDF générés : fiches, factures, attestations)
app.use('/documents', express.static(path.join(__dirname, 'uploads', 'documents')));

// Chargement du fichier de routes principal
const taskRoutes = require('./routes/routes');
app.use('/', taskRoutes); // Toutes les routes commencent par http://localhost:3000/...

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});

module.exports = app;