require('dotenv').config(); 

const express = require('express');
const cors = require('cors');

const app = express();

// 2. Middlewares globaux (OBLIGATOIREMENT AVANT LES ROUTES)
app.use(cors());
app.use(express.json()); // Permet à Express de lire le corps des requêtes en JSON
app.use(express.urlencoded({ extended: true }));

// 3. Route de santé (Test direct dans le navigateur ou Postman)
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API IMTECH INFO opérationnelle !',
    timestamp: new Date()
  });
});

// 4. Chargement du fichier de routes principal
const taskRoutes = require('./routes/routes');
app.use('/', taskRoutes); // Toutes les routes commenceront par http://localhost:3000/api/...

// 5. Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});

module.exports = app;