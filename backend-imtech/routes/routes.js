const express = require('express');
const router = express.Router();

const { login, getProfil } = require('../controllers/authController');
const { creerInscription, enregistrerUnPaiement } = require('../controllers/inscriptionController');
const { verifyToken,checkRole } = require('../middlewares/authMiddleware');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

// Toutes les routes utilisateurs nécessitent le token
router.get('/utilisateurs', verifyToken, getAllUsers);
router.get('/utilisateurs/:id', verifyToken, getUserById);
router.post('/utilisateurs', verifyToken, createUser);
router.put('/utilisateurs/:id', verifyToken, updateUser);
router.delete('/utilisateurs/:id', verifyToken, deleteUser);

// Authentification (route publique)
router.post('/auth/login', login);
router.get('/auth/profil', verifyToken, getProfil);

// Inscriptions & paiements (réservé Accueil / Super Admin)
router.post('/inscriptions', verifyToken, checkRole('Accueil', 'Super Admin'), creerInscription);
router.post('/paiements', verifyToken, checkRole('Accueil', 'Super Admin'), enregistrerUnPaiement);

module.exports = router;