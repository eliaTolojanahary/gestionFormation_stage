const express = require('express');
const router = express.Router();

const { login, getProfil, logout ,forgotPassword,resetPassword} = require('../controllers/authController');

const {
  listerEtudiants, detailEtudiant, formationsEtudiant,
  creerEtudiantController, updateEtudiantController, deleteEtudiantController
} = require('../controllers/etudiantController');

const { creerInscriptionController, enregistrerPaiementController } = require('../controllers/inscriptionController');
const { verifyToken,checkRole } = require('../middlewares/authMiddleware');
const {
  getAllUsers,
  getUserById,
  createUserController,
  updateUserController,
  deleteUserController
} = require('../controllers/userController');

router.get('/utilisateurs', verifyToken, getAllUsers);
router.get('/utilisateurs/:id', verifyToken, getUserById);
router.post('/utilisateurs', verifyToken, createUserController);
router.put('/utilisateurs/:id', verifyToken, updateUserController);
router.delete('/utilisateurs/:id', verifyToken, deleteUserController);

// Authentification 
router.post('/auth/login', login);
router.get('/auth/profil', verifyToken, getProfil);
router.post('/auth/logout', logout);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);

// Inscriptions et paiements (Accueil / Super Admin)
router.post('/inscriptions', verifyToken, checkRole('Accueil', 'Super Admin'), creerInscriptionController);
router.post('/paiements', verifyToken, checkRole('Accueil', 'Super Admin'), enregistrerPaiementController);

//etudiants 
router.get('/etudiants', verifyToken, checkRole('Super Admin', 'Accueil'), listerEtudiants);
router.get('/etudiants/:id', verifyToken, checkRole('Super Admin', 'Accueil'), detailEtudiant);
router.get('/etudiants/:id/formations', verifyToken, formationsEtudiant);
router.post('/etudiants', verifyToken, checkRole('Super Admin', 'Accueil'), creerEtudiantController);
router.put('/etudiants/:id', verifyToken, checkRole('Super Admin', 'Accueil'), updateEtudiantController);
router.delete('/etudiants/:id', verifyToken, checkRole('Super Admin', 'Accueil'), deleteEtudiantController);

module.exports = router;