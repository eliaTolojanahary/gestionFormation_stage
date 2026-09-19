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
  listerPaiementsController, enregistrerPaiementController,getPaiementByIdController,updatePaiementController
} = require('../controllers/paiementController');

const { creerInscriptionController, deleteInscriptionController, detailInscription,listerInscriptions,validerInscriptionController } = require('../controllers/inscriptionController');
const { verifyToken,checkRole } = require('../middlewares/authMiddleware');
const createUploader = require('../middlewares/docUpload');


const {
  getAllUsers,
  getUserById,
  createUserController,
  updateUserController,
  deleteUserController,
  changePasswordController
} = require('../controllers/userController');


const {
  listerNotifications,
  lireNotification,
  retirerNotification,
  envoyerNotifInApp,
  envoyerEmailController,
  envoyerEmailPieceJointeController,
} = require('../controllers/notifController');
const { getEcheancesByInscriptionController,listerEcheances,updateEcheanceController } = require('../controllers/echeanceController');
const { genererAttestation, genererFiche, genererFacture ,verifierDocumentController,creerDocument,obtenirDocuments,supprimerDocumentController} = require('../controllers/documentController');
const { listerReactionsSupportController, reagir, retirerReaction } = require('../controllers/reactionController');
const { listerSupportsFormationController, creerSupportController, deleteSupportController } = require('../controllers/supportController');
const { listerCommentaires, deleteCommentaireControler, creerCommentaireController } = require('../controllers/commentaireController');

const {
  kpi,
  evolution,
  exportCSV,
  getDonneesInscriptionsParMois,
  getTopInscriptions,
} = require('../controllers/dashboardController');


router.get('/utilisateurs', verifyToken, getAllUsers);
router.get('/utilisateurs/:id', verifyToken, getUserById);
const utilisateurUpload = createUploader('utilisateurs');
// Route POST mise à jour avec gestion de l'upload de photo
router.post('/utilisateurs', verifyToken, utilisateurUpload.single('photo'), createUserController);

// Si vous avez une route PUT pour modifier un utilisateur :
router.put('/utilisateurs/:id', verifyToken, utilisateurUpload.single('photo'), updateUserController);
router.delete('/utilisateurs/:id', verifyToken, deleteUserController);

// Authentification 
router.post('/auth/login', login);
router.get('/auth/profil', verifyToken, getProfil);
router.post('/auth/logout', logout);
router.post('/auth/forgot-password', forgotPasswordController);
router.post('/auth/reset-password', resetPasswordController);
router.put('/auth/change-password', verifyToken, changePasswordController);
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
router.delete('/etudiants/:id', verifyToken, checkRole('Super Admin', 'Accueil'), deleteEtudiantController);

const etudiantUpload = createUploader('etudiants');

const documentFields = etudiantUpload.fields([
  { name: 'photo', maxCount: 1 }, // <--- Champ ajouté pour la photo de profil utilisateur
  { name: 'photo_1', maxCount: 1 },
  { name: 'photo_2', maxCount: 1 },
  { name: 'certificat_residence', maxCount: 1 },
  { name: 'photocopie_cin', maxCount: 1 },
]);
const documentUpload = createUploader('documents', {
  maxSizeMb: 10
});

router.post(
  '/documents',
  verifyToken,
  checkRole('Super Admin', 'Accueil'),
  documentUpload.array('fichiers', 10),
  creerDocument
);

router.get(
  '/documents',
  verifyToken,
  checkRole('Super Admin', 'Accueil', 'Formateur'),
  obtenirDocuments
);

router.delete(
  '/documents/:id',
  verifyToken,
  checkRole('Super Admin'),
  supprimerDocumentController
);
const supportUpload = createUploader('supports', { maxSizeMb: 10 })

router.post(
  '/supports',
  verifyToken,
  checkRole('Super Admin', 'Accueil', 'Formateur'),
  supportUpload.single('fichier'),
  creerSupportController
)
router.get(
  '/formations/:id/supports',
  verifyToken,
  checkRole('Super Admin', 'Accueil', 'Formateur', 'Etudiant'),
  listerSupportsFormationController
);
router.post('/etudiants', verifyToken, checkRole('Super Admin', 'Accueil'), documentFields, creerEtudiantController);

router.put('/etudiants/:id', verifyToken, checkRole('Super Admin', 'Accueil'), documentFields, updateEtudiantController);

// Formations
router.get('/formations', verifyToken, listerFormations);
router.get('/formations/:id', verifyToken, detailFormation);
router.get('/formations/:id/etudiants', verifyToken, checkRole('Super Admin', 'Accueil', 'Formateur'), etudiantsFormation);
router.post('/formations', verifyToken, checkRole('Super Admin'), creerFormationController);
router.put('/formations/:id', verifyToken, checkRole('Super Admin'), updateFormationController);
router.delete('/formations/:id', verifyToken, checkRole('Super Admin'), deleteFormationController);

//paiements 
router.get('/paiements', verifyToken, checkRole('Accueil', 'Super Admin'), listerPaiementsController);
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

router.delete('/supports/:id', verifyToken, checkRole('Formateur', 'Super Admin'), deleteSupportController);
router.get('/supports/:id/commentaires', verifyToken,listerCommentaires);
router.get('/supports/:id/reactions',verifyToken, checkRole('Super Admin', 'Formateur','Étudiant'),verifyToken, listerReactionsSupportController);
router.post('/supports/:id/reactions',verifyToken,checkRole('Super Admin', 'Formateur','Étudiant'), verifyToken, reagir);
router.delete('/supports/:id/reactions',verifyToken,checkRole('Super Admin', 'Formateur','Étudiant'), retirerReaction);

//commentaires
router.post('/commentaires', verifyToken, checkRole('Super Admin','Étudiant','Formateur'), creerCommentaireController);
router.delete('/commentaires/:id', verifyToken, checkRole('Super Admin','Étudiant', 'Super Admin'), deleteCommentaireControler);


// Config multer pour la pièce jointe email
const uploadNotif = createUploader('notifications');

// --- Notifications in-app ---
router.get('/notifications', verifyToken, listerNotifications);
router.put('/notifications/:id/lu', verifyToken, lireNotification);
router.delete('/notifications/:id', verifyToken, retirerNotification);

// --- Envoi de notifications ---
router.post(
  '/notifications/in-app',
  verifyToken,
  checkRole('Super Admin', 'Accueil'),
  envoyerNotifInApp
);

router.post(
  '/notifications/email',
  verifyToken,
  checkRole('Super Admin', 'Accueil'),
  envoyerEmailController
);

router.post(
  '/notifications/email/piece-jointe',
  verifyToken,
  checkRole('Super Admin', 'Accueil'),
  uploadNotif.single('piece_jointe'),
  envoyerEmailPieceJointeController
);

//dashboard
router.get('/dashboard/kpi', verifyToken, checkRole('Super Admin', 'Accueil'), kpi);
router.get('/dashboard/evolution', verifyToken, checkRole('Super Admin', 'Accueil'), evolution);
router.get('/dashboard/export-csv', verifyToken, checkRole('Super Admin', 'Accueil'), exportCSV);
router.get('/dashboard/inscriptionParMois', verifyToken, checkRole('Super Admin', 'Accueil'), getDonneesInscriptionsParMois);
router.get('/dashboard/topInscription', verifyToken, checkRole('Super Admin', 'Accueil'), getTopInscriptions);
module.exports = router;