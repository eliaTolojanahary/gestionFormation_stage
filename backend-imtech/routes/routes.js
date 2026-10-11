// Toutes les routes de l'API (montées sous /api dans app.js).
// Chaque route enchaîne : authentification -> contrôle des rôles -> upload éventuel -> controller.
const express = require('express');
const router = express.Router();

const { ROLES, STAFF, TOUS } = require('../config/roles');
const { verifyToken, checkRole, exigerEtudiantProprietaire, exigerSoiOuAdmin } = require('../middlewares/authMiddleware');
const createUploader = require('../middlewares/docUpload');

const auth = require('../controllers/authController');
const user = require('../controllers/userController');
const etudiant = require('../controllers/etudiantController');
const formation = require('../controllers/formationController');
const inscription = require('../controllers/inscriptionController');
const echeance = require('../controllers/echeanceController');
const paiement = require('../controllers/paiementController');
const document = require('../controllers/documentController');
const support = require('../controllers/supportController');
const commentaire = require('../controllers/commentaireController');
const reaction = require('../controllers/reactionController');
const notif = require('../controllers/notifController');
const dashboard = require('../controllers/dashboardController');
const assistance = require('../controllers/assistanceController');
const classement = require('../controllers/classementController');
const vitrine = require('../controllers/vitrineController');
const recherche = require('../controllers/rechercheController');
const { limiteRequetes } = require('../middlewares/limiteRequetes');

const { SUPER_ADMIN, ACCUEIL, FORMATEUR, ETUDIANT } = ROLES;

// Raccourcis : authentification + rôles autorisés
const staff = [verifyToken, checkRole(...STAFF)];
const roles = (...liste) => [verifyToken, checkRole(...liste)];

// ─── Uploads ────────────────────────────────
const utilisateurUpload = createUploader('utilisateurs');
const etudiantUpload = createUploader('etudiants');
const documentUpload = createUploader('documents', { maxSizeMb: 10 });
// Supports : 50 Mo pour laisser passer une courte vidéo ou un enregistrement audio
const supportUpload = createUploader('supports', {
  maxSizeMb: 50,
  types: createUploader.TYPES_SUPPORT,
  messageType: 'Un support doit être un PDF, une image, un audio (MP3, M4A, OGG, WAV) ou une vidéo (MP4, WEBM, MOV).',
});
const notifUpload = createUploader('notifications');
// Couvertures des formations (vitrine publique)
const formationUpload = createUploader('formations', {
  maxSizeMb: 5,
  types: new Set(['image/jpeg', 'image/png', 'image/webp']),
  messageType: 'La couverture doit être une image (JPEG, PNG ou WEBP).',
});
// Fond du bandeau « Découvrir » (vitrine publique) : 8 Mo pour une image assez grande pour rester nette
const vitrineUpload = createUploader('vitrine', {
  maxSizeMb: 8,
  types: new Set(['image/jpeg', 'image/png', 'image/webp']),
  messageType: 'Le fond doit être une image (JPEG, PNG ou WEBP).',
});

// Pièces jointes du dossier étudiant (un fichier max par champ)
const piecesEtudiant = etudiantUpload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'photo_1', maxCount: 1 },
  { name: 'photo_2', maxCount: 1 },
  { name: 'certificat_residence', maxCount: 1 },
  { name: 'photocopie_cin', maxCount: 1 },
]);

// ─── Authentification ───────────────────────
// login / mot de passe oublié / réinitialisation : publiques (pas encore de token)
// ─── Vitrine publique (sans connexion) ──────
// Personne non inscrite : découvrir les formations et s'inscrire en ligne (validation par l'Accueil)
const limiteInscription = limiteRequetes({
  max: 5,
  fenetreMs: 60 * 60 * 1000,
  message: "Trop d'inscriptions depuis cet appareil. Réessayez dans une heure ou contactez IMTECH INFO.",
});
router.get('/public/vitrine', vitrine.vitrineController);
router.post('/public/inscriptions', limiteInscription, vitrine.inscriptionEnLigneController);
// Fond du bandeau « Découvrir » choisi par le Super Admin (Paramètres > Apparence)
router.put('/vitrine/fond', roles(SUPER_ADMIN), vitrineUpload.single('image'), vitrine.modifierFondController);
router.delete('/vitrine/fond', roles(SUPER_ADMIN), vitrine.supprimerFondController);

router.post('/auth/login', auth.login);
router.post('/auth/forgot-password', auth.forgotPasswordController);
router.post('/auth/reset-password', auth.resetPasswordController);
router.post('/auth/logout', verifyToken, auth.logout);
router.get('/auth/profil', verifyToken, auth.getProfil);
router.put('/auth/change-password', verifyToken, auth.changePasswordController);
router.get('/auth/sessions', verifyToken, auth.getSessionsController);
router.get('/auth/last-login', verifyToken, auth.getLastLoginController);
router.put('/auth/logout-all', verifyToken, auth.logoutAllController);

// ─── Utilisateurs ───────────────────────────
// Chacun peut lire / modifier son propre compte ; le Super Admin gère tous les comptes.
router.get('/utilisateurs', roles(SUPER_ADMIN), user.getAllUsers);
router.get('/utilisateurs/:id', verifyToken, exigerSoiOuAdmin(), user.getUserById);
router.post('/utilisateurs', roles(SUPER_ADMIN), utilisateurUpload.single('photo'), user.createUserController);
router.put('/utilisateurs/:id', verifyToken, exigerSoiOuAdmin(), utilisateurUpload.single('photo'), user.updateUserController);
router.delete('/utilisateurs/:id', roles(SUPER_ADMIN), user.deleteUserController);

// ─── Étudiants ──────────────────────────────
router.get('/etudiants', roles(SUPER_ADMIN, ACCUEIL, FORMATEUR), etudiant.listerEtudiants);
router.get('/etudiants/:id', staff, etudiant.detailEtudiant);
router.get('/etudiants/:id/formations', roles(...TOUS), exigerEtudiantProprietaire(), etudiant.formationsEtudiant);
router.get('/etudiants/:id/dashboard-paiement', roles(SUPER_ADMIN, ACCUEIL, ETUDIANT), exigerEtudiantProprietaire(), paiement.dashboardPaiementEtudiantController);
router.post('/etudiants', staff, piecesEtudiant, etudiant.creerEtudiantController);
router.put('/etudiants/:id', staff, piecesEtudiant, etudiant.updateEtudiantController);
router.delete('/etudiants/:id', staff, etudiant.deleteEtudiantController);

// ─── Recherche globale (barre du tableau de bord web) ───
router.get('/recherche', roles(SUPER_ADMIN, ACCUEIL, FORMATEUR), recherche.rechercheController);

// ─── Formations ─────────────────────────────
router.get('/formations', verifyToken, formation.listerFormations);
router.get('/formations/:id', verifyToken, formation.detailFormation);
router.get('/formations/:id/etudiants', roles(SUPER_ADMIN, ACCUEIL, FORMATEUR), formation.etudiantsFormation);
router.get('/formations/:id/supports', roles(...TOUS), support.listerSupportsFormationController);
router.post('/formations', roles(SUPER_ADMIN), formation.creerFormationController);
router.put('/formations/:id', roles(SUPER_ADMIN), formation.updateFormationController);
router.put('/formations/:id/image', roles(SUPER_ADMIN), formationUpload.single('image'), formation.modifierImageController);
router.delete('/formations/:id', roles(SUPER_ADMIN), formation.deleteFormationController);

// Classement d'activité des étudiants et notes d'attestation suggérées
router.get('/formations/:id/classement', roles(SUPER_ADMIN, ACCUEIL, FORMATEUR), classement.classementFormationController);

// ─── Inscriptions & échéances ───────────────
router.get('/inscriptions', staff, inscription.listerInscriptions);
router.get('/inscriptions/:id', staff, inscription.detailInscription);
router.post('/inscriptions', staff, inscription.creerInscriptionController);
router.post('/inscriptions/:id/valid', staff, inscription.validerInscriptionController);
router.delete('/inscriptions/:id', staff, inscription.deleteInscriptionController);
router.get('/inscriptions/:id/echeances', staff, echeance.getEcheancesByInscriptionController);
router.put('/inscriptions/:id/note', roles(SUPER_ADMIN, FORMATEUR), classement.definirNoteController);

router.get('/echeances', staff, echeance.listerEcheances);
router.put('/echeances/:id', staff, echeance.updateEcheanceController);
router.post('/echeances/:id/rappeler', staff, echeance.rappelerEcheanceController); // in-app + e-mail à l'étudiant

// ─── Paiements ──────────────────────────────
// L'étudiant peut payer (paiement "en attente") et voir SES paiements ;
// l'Accueil / le Super Admin valident ou refusent.
router.get('/paiements', roles(SUPER_ADMIN, ACCUEIL, ETUDIANT), paiement.listerPaiementsController);
router.get('/paiements/:id', roles(SUPER_ADMIN, ACCUEIL, ETUDIANT), paiement.getPaiementByIdController);
router.post('/paiements', roles(SUPER_ADMIN, ACCUEIL, ETUDIANT), paiement.enregistrerPaiementController);
router.put('/paiements/:id', staff, paiement.updatePaiementController);
router.put('/paiements/:id/valider', staff, paiement.validerPaiementController);
router.put('/paiements/:id/refuser', staff, paiement.refuserPaiementController);

// ─── Documents générés ──────────────────────
router.post('/fiche/:id_inscription/generer', staff, document.genererFiche);
router.post('/factures/:id_paiement/generer', staff, document.genererFacture);
router.post('/attestations/:id_inscription/generer', staff, document.genererAttestation);
router.post('/attestations/:id_inscription/envoyer', staff, document.envoyerAttestationController); // génère + in-app + e-mail
router.get('/verification/:uuid', document.verifierDocumentController); // public : lien du QR code

// ─── Documents administratifs ───────────────
router.get('/documents', roles(SUPER_ADMIN, ACCUEIL, FORMATEUR), document.obtenirDocuments);
router.post('/documents', staff, documentUpload.array('fichiers', 10), document.creerDocument);
router.delete('/documents/:id', roles(SUPER_ADMIN), document.supprimerDocumentController);

// ─── Supports de cours ──────────────────────
// Supports programmés : brouillons publiés automatiquement à l'heure prévue (avant /supports/:id)
router.get('/supports/programmes', roles(FORMATEUR, SUPER_ADMIN), support.listerSupportsProgrammesController);
router.get('/supports/:id', roles(...TOUS), support.detailSupportController);
router.post('/supports', roles(FORMATEUR), supportUpload.single('fichier'), support.creerSupportController);
router.put('/supports/:id', roles(FORMATEUR, SUPER_ADMIN), supportUpload.single('fichier'), support.modifierSupportProgrammeController);
router.post('/supports/:id/envoyer', roles(FORMATEUR, SUPER_ADMIN), support.envoyerSupportController);
router.delete('/supports/:id', roles(FORMATEUR, SUPER_ADMIN), support.deleteSupportController);

// ─── Commentaires & réactions ───────────────
router.get('/supports/:id/commentaires', roles(...TOUS), commentaire.listerCommentaires);
router.post('/commentaires', roles(ETUDIANT, FORMATEUR, SUPER_ADMIN), commentaire.creerCommentaireController);
router.delete('/commentaires/:id', roles(SUPER_ADMIN, FORMATEUR, ETUDIANT), commentaire.deleteCommentaireController);

router.get('/supports/:id/reactions', roles(SUPER_ADMIN, FORMATEUR, ETUDIANT), reaction.listerReactionsSupportController);
router.post('/supports/:id/reactions', roles(SUPER_ADMIN, FORMATEUR, ETUDIANT), reaction.reagir);
router.delete('/supports/:id/reactions', roles(SUPER_ADMIN, FORMATEUR, ETUDIANT), reaction.retirerReaction);
// Back-office : avis des étudiants sur les formateurs (compétent / non compétent selon les réactions)
router.get('/formateurs/avis', roles(SUPER_ADMIN, ACCUEIL), reaction.avisFormateursController);

// ─── Notifications ──────────────────────────
router.get('/notifications', verifyToken, notif.listerNotifications);
router.put('/notifications/:id/lu', verifyToken, notif.lireNotification);
router.delete('/notifications/:id', verifyToken, notif.retirerNotification);
router.post('/notifications/in-app', staff, notif.envoyerNotifInApp);
router.post('/notifications/email', staff, notif.envoyerEmailController);
router.post('/notifications/email/piece-jointe', staff, notifUpload.single('piece_jointe'), notif.envoyerEmailPieceJointeController);

// ─── Assistance ─────────────────────────────
// L'étudiant écrit depuis le mobile ; l'Accueil / le Super Admin résolvent depuis le web.
router.get('/assistances', roles(SUPER_ADMIN, ACCUEIL, ETUDIANT), assistance.listerAssistancesController);
router.post('/assistances', roles(ETUDIANT), assistance.creerAssistanceController);
router.put('/assistances/:id/resoudre', staff, assistance.resoudreAssistanceController);

// ─── Tableau de bord ────────────────────────
router.get('/dashboard/kpi', staff, dashboard.kpi);
router.get('/dashboard/evolution', staff, dashboard.evolution);
router.get('/dashboard/export-csv', staff, dashboard.exportCSV);
router.get('/dashboard/inscriptionParMois', staff, dashboard.getDonneesInscriptionsParMois);
router.get('/dashboard/topInscription', staff, dashboard.getTopInscriptions);

module.exports = router;
