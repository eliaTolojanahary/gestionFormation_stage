const express = require('express');
const router = express.Router();

const { login, getProfil, logout ,forgotPasswordController,resetPasswordController} = require('../controllers/authController');

const {
  listerEtudiants, detailEtudiant, formationsEtudiant,
  creerEtudiantController, updateEtudiantController, deleteEtudiantController
} = require('../controllers/etudiantController');

const {
  listerFormations, detailFormation, etudiantsFormation,
  creerFormationController, updateFormationController, deleteFormationController
} = require('../controllers/formationController');
const {
  enregistrerPaiementController,getPaiementByIdController,updatePaiementController
} = require('../controllers/paiementController');

const { creerInscriptionController, deleteInscriptionController, detailInscription,listerInscriptions,validerInscriptionController } = require('../controllers/inscriptionController');
const { verifyToken,checkRole } = require('../middlewares/authMiddleware');
const {
  getAllUsers,
  getUserById,
  createUserController,
  updateUserController,
  deleteUserController
} = require('../controllers/userController');

const { getEcheancesByInscriptionController,listerEcheances,updateEcheanceController } = require('../controllers/echeanceController');
const { genererAttestation, genererFiche, genererFacture ,verifierDocumentController} = require('../controllers/documentController');
const { listerReactionsSupportController, reagir, retirerReaction } = require('../controllers/reactionController');
const { listerSupportsFormationController, creerSupportController, deleteSupportController } = require('../controllers/supportController');
const { listerCommentaires, deleteCommentaireControler, creerCommentaireController } = require('../controllers/commentaireController');

router.get('/utilisateurs', verifyToken, getAllUsers);
router.get('/utilisateurs/:id', verifyToken, getUserById);
router.post('/utilisateurs', verifyToken, createUserController);
router.put('/utilisateurs/:id', verifyToken, updateUserController);
router.delete('/utilisateurs/:id', verifyToken, deleteUserController);

// Authentification 
router.post('/auth/login', login);
router.get('/auth/profil', verifyToken, getProfil);
router.post('/auth/logout', logout);
router.post('/auth/forgot-password', forgotPasswordController);
router.post('/auth/reset-password', resetPasswordController);

// Inscriptions et paiements (Accueil / Super Admin)
router.post('/inscriptions', verifyToken, checkRole('Accueil', 'Super Admin'), creerInscriptionController);
router.get('/inscriptions', verifyToken, checkRole('Super Admin', 'Accueil'), listerInscriptions);
router.get('/inscriptions/:id', verifyToken, checkRole('Super Admin', 'Accueil'), detailInscription);
router.delete('/inscriptions/:id', verifyToken, checkRole('Super Admin', 'Accueil'), deleteInscriptionController);
router.post('/inscriptions/:id/valid',verifyToken, checkRole('Super Admin', 'Accueil'), validerInscriptionController);
router.get('/inscriptions/:id/echeances', verifyToken, getEcheancesByInscriptionController);
//etudiants 
router.get('/etudiants', verifyToken, checkRole('Super Admin', 'Accueil'), listerEtudiants);
router.get('/etudiants/:id', verifyToken, checkRole('Super Admin', 'Accueil'), detailEtudiant);
router.get('/etudiants/:id/formations', verifyToken, formationsEtudiant);
router.post('/etudiants', verifyToken, checkRole('Super Admin', 'Accueil'), creerEtudiantController);
router.put('/etudiants/:id', verifyToken, checkRole('Super Admin', 'Accueil'), updateEtudiantController);
router.delete('/etudiants/:id', verifyToken, checkRole('Super Admin', 'Accueil'), deleteEtudiantController);

// Formations
router.get('/formations', verifyToken, listerFormations);
router.get('/formations/:id', verifyToken, detailFormation);
router.get('/formations/:id/etudiants', verifyToken, checkRole('Super Admin', 'Accueil', 'Formateur'), etudiantsFormation);
router.post('/formations', verifyToken, checkRole('Super Admin'), creerFormationController);
router.put('/formations/:id', verifyToken, checkRole('Super Admin'), updateFormationController);
router.delete('/formations/:id', verifyToken, checkRole('Super Admin'), deleteFormationController);
router.get('/formations/:id/supports', verifyToken, listerSupportsFormationController);

//paiements 
router.post('/paiements', verifyToken, checkRole('Accueil', 'Super Admin'), enregistrerPaiementController);
router.get('/paiements/:id', verifyToken, getPaiementByIdController);
router.put('/paiements/:id', verifyToken, checkRole('Super Admin', 'Accueil'), updatePaiementController);

//echeances
router.get('/echeances', verifyToken, listerEcheances);
router.put('/echeances/:id', verifyToken, checkRole('Super Admin', 'Accueil'), updateEcheanceController);

// ---  DOCUMENTS ---
router.post('/fiche/:id_inscription/generer', verifyToken, checkRole('Accueil', 'Super Admin'), genererFiche);
router.post('/factures/:id_paiement/generer', verifyToken, checkRole('Accueil', 'Super Admin'), genererFacture);
router.post('/attestations/:id_inscription/generer', verifyToken, checkRole('Accueil', 'Super Admin'), genererAttestation);
router.get('/verification/:uuid', verifierDocumentController);


//support
router.post('/supports', verifyToken, checkRole('Super Admin', 'Formateur'), creerSupportController);
router.delete('/supports/:id', verifyToken, checkRole('Formateur', 'Super Admin'), deleteSupportController);
router.get('/supports/:id/commentaires', verifyToken,listerCommentaires);
router.get('/supports/:id/reactions',verifyToken, checkRole('Super Admin', 'Formateur','Étudiant'),verifyToken, listerReactionsSupportController);
router.post('/supports/:id/reactions',verifyToken,checkRole('Super Admin', 'Formateur','Étudiant'), verifyToken, reagir);
router.delete('/supports/:id/reactions',verifyToken,checkRole('Super Admin', 'Formateur','Étudiant'), retirerReaction);

//commentaires
router.post('/commentaires', verifyToken, checkRole('Super Admin','Étudiant','Formateur'), creerCommentaireController);
router.delete('/commentaires/:id', verifyToken, checkRole('Super Admin','Étudiant', 'Super Admin'), deleteCommentaireControler);
module.exports = router;