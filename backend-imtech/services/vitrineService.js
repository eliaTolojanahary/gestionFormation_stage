// Vitrine publique de l'application mobile (personne non inscrite) et inscription en ligne.
//
// Inscription en ligne = même méthode que l'Accueil, faite par l'étudiant lui-même :
//   1. création du compte + dossier étudiant (il pourra se connecter tout de suite) ;
//   2. pour CHAQUE formation choisie : inscription + échéancier (creerInscriptionDans, la même
//      fonction que l'Accueil), puis premier paiement déclaré EN ATTENTE ;
//   3. l'Accueil voit les inscriptions « En ligne » dans sa liste et valide chacune séparément,
//      seulement quand le dossier est complet (pièces jointes ici ou déposées ensuite dans Mon dossier).
// Tout se fait dans une seule transaction : en cas d'erreur, rien n'est créé.
const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const etudiantModel = require('../models/etudiantModel');
const inscriptionModel = require('../models/inscriptionModel');
const echeanceModel = require('../models/echeanceModel');
const paiementModel = require('../models/paiementModel');
const userModel = require('../models/userModel');
const vitrineModel = require('../models/vitrineModel');
const parametreModel = require('../models/parametreModel');
const inscriptionService = require('./inscriptionService');
const reactionService = require('./reactionService');
const notifService = require('./notifService');
const { salutation, titre, encadre } = require('../utils/modeleEmail');
const { formatMontant } = require('../utils/format');
const { avecTransaction } = require('../utils/transaction');
const { CONTACTS, PRESENTATION, ENGAGEMENT_PAR_DEFAUT } = require('../config/vitrine');
const { etatDossier, piecesManquantes } = require('../config/dossier');
const { badRequest, conflict, notFound } = require('../utils/errors');

const MAX_TRANCHES = 4;
const FOND_VITRINE = 'fond_vitrine';
const LOGO = 'logo';
const DOSSIER_UPLOADS = path.join(__dirname, '..', 'uploads');
const MOT_DE_PASSE_MIN = 8;
const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Nombre de formations et de formateurs envoyés à la fois (la suite arrive en faisant glisser)
const PAR_PAGE_VITRINE = 5;

// Formation telle qu'affichée dans la vitrine : avec l'avis des étudiants sur son formateur
function formationPublique(f, avisParFormateur) {
  const a = avisParFormateur.get(Number(f.id_formateur));
  return {
    ...f,
    tarif: Number(f.tarif),
    nb_inscrits: Number(f.nb_inscrits),
    engagement_formateur: f.engagement_formateur || ENGAGEMENT_PAR_DEFAUT,
    avis_formateur: a?.avis || reactionService.AVIS.PAS_ASSEZ,
    taux_positif: a?.taux_positif ?? null,
  };
}

// Une page de formations (les plus demandées d'abord) et leur total.
// filtres.id_etudiant : sans les formations où l'étudiant est déjà inscrit
async function pageFormations(filtres = {}, pagination = { limite: PAR_PAGE_VITRINE, offset: 0 }) {
  const [formations, total, avis] = await Promise.all([
    vitrineModel.getFormationsPubliques(filtres, pagination),
    vitrineModel.compterFormationsPubliques(filtres),
    reactionService.avisFormateurs(),
  ]);
  const avisParFormateur = new Map(avis.map((f) => [Number(f.id_utilisateur), f]));
  return { lignes: formations.map((f) => formationPublique(f, avisParFormateur)), total };
}

// Une page des formateurs jugés compétents (les mieux notés d'abord), avec les formations
// qu'ils animent. Le classement se calcule sur tous les formateurs, puis on découpe la page.
async function pageFormateurs(pagination = { limite: PAR_PAGE_VITRINE, offset: 0 }) {
  const competents = (await reactionService.avisFormateurs())
    .filter((f) => f.avis === reactionService.AVIS.COMPETENT);
  const page = competents.slice(pagination.offset, pagination.offset + pagination.limite);
  const formations = await vitrineModel.getFormationsDesFormateurs(page.map((f) => f.id_utilisateur));

  const lignes = page.map((f) => ({
    id_formateur: f.id_utilisateur,
    nom: f.nom,
    prenom: f.prenom,
    taux_positif: f.taux_positif,
    total_reactions: f.total_reactions,
    formations: formations
      .filter((formation) => Number(formation.id_formateur) === Number(f.id_utilisateur))
      .map((formation) => formation.nom),
  }));
  return { lignes, total: competents.length };
}

// Contenu de la vitrine : présentation, contacts, modes de paiement, et la première page des
// formations et des formateurs compétents avec leurs totaux (la suite : GET /public/formations
// et /public/formateurs)
async function contenuVitrine() {
  const [formations, formateurs, modesPaiement, fond] = await Promise.all([
    pageFormations(),
    pageFormateurs(),
    vitrineModel.getModesPaiement(),
    parametreModel.getParametre(FOND_VITRINE),
  ]);

  return {
    // fond : image du bandeau choisie par le Super Admin, null = image par défaut de l'application
    presentation: { ...PRESENTATION, fond },
    contacts: CONTACTS,
    formations: formations.lignes,
    formateurs_competents: formateurs.lignes,
    totaux: { formations: formations.total, formateurs_competents: formateurs.total },
    par_page: PAR_PAGE_VITRINE,
    modes_paiement: modesPaiement,
  };
}

// Vérifie le formulaire ; renvoie les formations sans doublon
function verifierDemande({ nom, prenom, email, telephone, mot_de_passe, confirmation_mot_de_passe, formations, id_mode_paiement }) {
  if (!nom?.trim() || !prenom?.trim()) throw badRequest('Le nom et le prénom sont requis.');
  if (!EMAIL_VALIDE.test(email || '')) throw badRequest("L'adresse e-mail est invalide.");
  if (!telephone?.trim()) throw badRequest('Le numéro de téléphone est requis.');
  if (!mot_de_passe || mot_de_passe.length < MOT_DE_PASSE_MIN) {
    throw badRequest(`Le mot de passe doit contenir au moins ${MOT_DE_PASSE_MIN} caractères.`);
  }
  if (confirmation_mot_de_passe !== mot_de_passe) throw badRequest('Les deux mots de passe ne correspondent pas.');
  if (!id_mode_paiement) throw badRequest('Le mode de paiement est requis.');
  return verifierFormations(formations);
}

// Formations choisies (1 à MAX_TRANCHES tranches chacune) ; renvoie la liste sans doublon
function verifierFormations(formations) {
  if (!Array.isArray(formations) || formations.length === 0) {
    throw badRequest('Choisissez au moins une formation.');
  }

  const parFormation = new Map();
  for (const f of formations) {
    const nombre = Number(f.nombre_tranches) || 1;
    if (!Number(f.id_formation)) throw badRequest('Formation invalide.');
    if (nombre < 1 || nombre > MAX_TRANCHES) throw badRequest(`Le nombre de tranches va de 1 à ${MAX_TRANCHES}.`);
    parFormation.set(Number(f.id_formation), nombre);
  }
  return [...parFormation].map(([id_formation, nombre_tranches]) => ({ id_formation, nombre_tranches }));
}

async function inscriptionEnLigne(demande) {
  const formations = verifierDemande(demande);
  const email = demande.email.trim().toLowerCase();
  const { id_mode_paiement, reference_virement } = demande;

  if (await userModel.findUserByEmail(email)) {
    throw conflict('Un compte existe déjà avec cette adresse e-mail : connectez-vous ou contactez IMTECH INFO.');
  }
  const mot_de_passe_hash = await bcrypt.hash(demande.mot_de_passe, 10);

  const resultat = await avecTransaction(async (connection) => {
    // (un compte désactivé garde son e-mail : la contrainte UNIQUE est traduite en 409 plus bas)
    if (!(await vitrineModel.modePaiementExiste(id_mode_paiement, connection))) {
      throw badRequest('Mode de paiement inconnu.');
    }

    const id_etudiant = await etudiantModel.insertUtilisateurEtEtudiant(connection, {
      nom: demande.nom.trim(),
      prenom: demande.prenom.trim(),
      email,
      mot_de_passe_hash,
      telephone: demande.telephone.trim(),
      ...(demande.pieces || {}), // pièces jointes à l'inscription (sinon déposées plus tard)
    });

    const inscriptions = await inscrireFormationsDans(connection, id_etudiant, formations, { id_mode_paiement, reference_virement });
    const id_utilisateur = await inscriptionModel.getIdUtilisateurByEtudiant(id_etudiant, connection);
    return { id_etudiant, id_utilisateur, inscriptions };
  }).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      throw conflict('Un compte existe déjà avec cette adresse e-mail : contactez IMTECH INFO.');
    }
    throw error;
  });

  const total = totalPremierPaiement(resultat.inscriptions);
  await notifierInscriptionEnLigne({
    id_utilisateur: resultat.id_utilisateur,
    email,
    prenom: demande.prenom.trim(),
    nom: demande.nom.trim(),
    dossierEtudiant: demande.pieces,
    inscriptions: resultat.inscriptions,
    nouveauCompte: true,
  });

  return { email, inscriptions: resultat.inscriptions, total_premier_paiement: total };
}

// Pour chaque formation : inscription + échéancier (la même fonction que l'Accueil, origine
// « en ligne »), puis premier paiement déclaré par l'étudiant, EN ATTENTE jusqu'à la validation
// par l'Accueil. `connection` : transaction en cours (déjà inscrit à une formation : 409, tout est annulé).
async function inscrireFormationsDans(connection, id_etudiant, formations, { id_mode_paiement, reference_virement }) {
  const inscriptions = [];
  for (const { id_formation, nombre_tranches } of formations) {
    const id_inscription = await inscriptionService.creerInscriptionDans(connection, {
      id_etudiant,
      id_formation,
      nombre_tranches,
      id_tranche: nombre_tranches,
      origine: 'en_ligne',
    });

    const [premiere] = await echeanceModel.getEcheancesByInscription(id_inscription, connection);
    await paiementModel.insererPaiement({
      id_echeance: premiere.id_echeance,
      id_mode_paiement,
      montant: premiere.montant_prevu,
      reference_virement: reference_virement?.trim() || null,
      statut: paiementModel.STATUTS_PAIEMENT.EN_ATTENTE,
    }, connection);

    inscriptions.push({ id_inscription, id_formation, montant_premier_paiement: Number(premiere.montant_prevu) });
  }
  return inscriptions;
}

const totalPremierPaiement = (inscriptions) => inscriptions.reduce((somme, i) => somme + i.montant_premier_paiement, 0);

// Étudiant déjà inscrit (connecté sur le mobile) qui choisit d'autres formations : mêmes règles
// que l'inscription en ligne, sans créer de compte. Son dossier est déjà enregistré : s'il est
// complet, l'Accueil pourra valider tout de suite.
// demande = { formations: [{ id_formation, nombre_tranches }], id_mode_paiement, reference_virement }
async function inscriptionCompteExistant(id_etudiant, demande) {
  const formations = verifierFormations(demande.formations);
  const { id_mode_paiement, reference_virement } = demande;
  if (!id_mode_paiement) throw badRequest('Le mode de paiement est requis.');

  const etudiant = await etudiantModel.getEtudiantById(id_etudiant);
  if (!etudiant) throw notFound('Étudiant introuvable.');

  const inscriptions = await avecTransaction(async (connection) => {
    if (!(await vitrineModel.modePaiementExiste(id_mode_paiement, connection))) {
      throw badRequest('Mode de paiement inconnu.');
    }
    return await inscrireFormationsDans(connection, id_etudiant, formations, { id_mode_paiement, reference_virement });
  });

  await notifierInscriptionEnLigne({
    id_utilisateur: etudiant.id_utilisateur,
    email: etudiant.email,
    prenom: etudiant.prenom,
    nom: etudiant.nom,
    dossierEtudiant: etudiant,
    inscriptions,
    nouveauCompte: false,
  });

  return { inscriptions, total_premier_paiement: totalPremierPaiement(inscriptions) };
}

// Après le commit (un échec n'annule pas l'inscription) : prévient l'Accueil, et envoie à
// l'étudiant un accusé de réception (notification + e-mail) avec l'état de son dossier.
async function notifierInscriptionEnLigne({ id_utilisateur, email, prenom, nom, dossierEtudiant, inscriptions, nouveauCompte }) {
  const total = totalPremierPaiement(inscriptions);
  try {
    const dossier = etatDossier(dossierEtudiant);
    await notifService.notifierPersonnel(
      `Nouvelle inscription en ligne${nouveauCompte ? '' : ' (étudiant déjà inscrit)'} : ${prenom} ${nom}, ` +
      `${inscriptions.length} formation(s). Premier paiement déclaré à vérifier dans la page Inscriptions. ` +
      (dossier.complet ? 'Dossier complet.' : `Dossier : ${dossier.fournies}/${dossier.total} pièces (validation impossible avant).`)
    );
    const lignes = await Promise.all(inscriptions.map(async (i) => {
      const inscription = await inscriptionModel.getInscriptionById(i.id_inscription);
      return [inscription?.nom_formation || 'Formation', `1er paiement : ${formatMontant(i.montant_premier_paiement)}`];
    }));
    await notifService.notifierEtudiant({
      id_utilisateur,
      email,
      message: nouveauCompte
        ? `Bienvenue chez IMTECH INFO ! Votre inscription (${inscriptions.length} formation(s)) est en attente de validation par l'accueil.`
        : `Votre inscription à ${inscriptions.length} nouvelle(s) formation(s) est en attente de validation par l'accueil.`,
      sujet: 'IMTECH INFO — Demande d\'inscription bien reçue',
      contenuHtml: `${titre('Demande d\'inscription reçue')}
        ${salutation(prenom, nom)}
        <p><strong>${nouveauCompte ? 'Merci et bienvenue chez IMTECH INFO !' : 'Merci de votre confiance !'}</strong>
        Nous avons bien reçu votre demande d'inscription, ainsi que votre premier paiement.</p>
        ${encadre([...lignes, ['Total du premier paiement', formatMontant(total)]])}
        <p>Notre Accueil va maintenant <strong>vérifier votre paiement</strong>. Dès que votre inscription sera
        <strong>VALIDÉE</strong>, vous recevrez votre confirmation et votre fiche d'inscription, et vos
        supports de cours s'ouvriront dans l'application mobile.</p>
        ${dossier.complet
          ? '<p>Votre dossier est <strong>complet</strong> : merci !</p>'
          : `<p><strong>Votre dossier est incomplet</strong> : il manque ${piecesManquantes(dossierEtudiant).join(', ')}.
        Votre inscription ne pourra être validée qu'après leur dépôt, depuis l'application mobile
        (menu ⋮ &gt; Mon dossier).</p>`}`,
    });
  } catch (error) {
    console.warn('Notification d’inscription en ligne échouée :', error.message);
  }
}

// ─── Images choisies par le Super Admin : fond « Découvrir » et logo ───
// Rangées dans uploads/vitrine (public : le logo s'affiche aussi sur la page de connexion),
// leur chemin est gardé dans parametre_application.

// Supprime l'ancienne image (sans bloquer si elle a déjà disparu)
async function supprimerAncienneImage(ancien) {
  if (!ancien) return;
  await fs.unlink(path.join(DOSSIER_UPLOADS, ancien)).catch(() => {});
}

// Nouvelle image (déjà enregistrée dans uploads/vitrine par multer) ; renvoie son chemin
async function remplacerImage(cle, fichier) {
  if (!fichier) throw badRequest("Aucune image n'a été fournie.");
  const ancien = await parametreModel.getParametre(cle);
  const chemin = `vitrine/${fichier.filename}`;
  await parametreModel.setParametre(cle, chemin);
  await supprimerAncienneImage(ancien);
  return chemin;
}

// Retour à l'image par défaut de l'application
async function retirerImage(cle) {
  const ancien = await parametreModel.getParametre(cle);
  await parametreModel.setParametre(cle, null);
  await supprimerAncienneImage(ancien);
}

const modifierFondVitrine = (fichier) => remplacerImage(FOND_VITRINE, fichier);
const reinitialiserFondVitrine = () => retirerImage(FOND_VITRINE);

// Logo de l'organisation (barre latérale, connexion) : null = logo IMTECH INFO par défaut
const lireLogo = () => parametreModel.getParametre(LOGO);
const modifierLogo = (fichier) => remplacerImage(LOGO, fichier);
const reinitialiserLogo = () => retirerImage(LOGO);

module.exports = {
  contenuVitrine, pageFormations, pageFormateurs, PAR_PAGE_VITRINE,
  verifierDemande, verifierFormations, inscriptionEnLigne, inscriptionCompteExistant, MOT_DE_PASSE_MIN,
  modifierFondVitrine, reinitialiserFondVitrine,
  lireLogo, modifierLogo, reinitialiserLogo,
};
