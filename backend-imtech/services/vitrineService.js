// Vitrine publique de l'application mobile (personne non inscrite) et inscription en ligne.
//
// Inscription en ligne = même méthode que l'Accueil, faite par l'étudiant lui-même :
//   1. création du compte + dossier étudiant (il pourra se connecter tout de suite) ;
//   2. pour CHAQUE formation choisie : inscription + échéancier (creerInscriptionDans, la même
//      fonction que l'Accueil), puis premier paiement déclaré EN ATTENTE ;
//   3. l'Accueil voit les inscriptions « En ligne » dans sa liste et valide chacune séparément.
// Tout se fait dans une seule transaction : en cas d'erreur, rien n'est créé.
const bcrypt = require('bcryptjs');
const etudiantModel = require('../models/etudiantModel');
const inscriptionModel = require('../models/inscriptionModel');
const echeanceModel = require('../models/echeanceModel');
const paiementModel = require('../models/paiementModel');
const userModel = require('../models/userModel');
const vitrineModel = require('../models/vitrineModel');
const notifModel = require('../models/notifModel');
const inscriptionService = require('./inscriptionService');
const reactionService = require('./reactionService');
const notifService = require('./notifService');
const { avecTransaction } = require('../utils/transaction');
const { CONTACTS, PRESENTATION, ENGAGEMENT_PAR_DEFAUT } = require('../config/vitrine');
const { badRequest, conflict } = require('../utils/errors');

const MAX_TRANCHES = 4;
const MOT_DE_PASSE_MIN = 8;
const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Contenu de la vitrine : présentation, contacts, formations (avec avis sur le formateur)
// et formateurs compétents
async function contenuVitrine() {
  const [formations, avis, modesPaiement] = await Promise.all([
    vitrineModel.getFormationsPubliques(),
    reactionService.avisFormateurs(),
    vitrineModel.getModesPaiement(),
  ]);
  const avisParFormateur = new Map(avis.map((f) => [Number(f.id_utilisateur), f]));

  const formationsPubliques = formations.map((f) => {
    const a = avisParFormateur.get(Number(f.id_formateur));
    return {
      ...f,
      tarif: Number(f.tarif),
      nb_inscrits: Number(f.nb_inscrits),
      engagement_formateur: f.engagement_formateur || ENGAGEMENT_PAR_DEFAUT,
      avis_formateur: a?.avis || reactionService.AVIS.PAS_ASSEZ,
      taux_positif: a?.taux_positif ?? null,
    };
  });

  // Seulement les formateurs jugés compétents, avec les formations qu'ils animent
  const formateursCompetents = avis
    .filter((f) => f.avis === reactionService.AVIS.COMPETENT)
    .map((f) => ({
      id_formateur: f.id_utilisateur,
      nom: f.nom,
      prenom: f.prenom,
      taux_positif: f.taux_positif,
      total_reactions: f.total_reactions,
      formations: formationsPubliques
        .filter((formation) => Number(formation.id_formateur) === Number(f.id_utilisateur))
        .map((formation) => formation.nom),
    }));

  return {
    presentation: PRESENTATION,
    contacts: CONTACTS,
    formations: formationsPubliques,
    formateurs_competents: formateursCompetents,
    modes_paiement: modesPaiement,
  };
}

// Vérifie le formulaire ; renvoie les formations sans doublon
function verifierDemande({ nom, prenom, email, telephone, mot_de_passe, formations, id_mode_paiement }) {
  if (!nom?.trim() || !prenom?.trim()) throw badRequest('Le nom et le prénom sont requis.');
  if (!EMAIL_VALIDE.test(email || '')) throw badRequest("L'adresse e-mail est invalide.");
  if (!telephone?.trim()) throw badRequest('Le numéro de téléphone est requis.');
  if (!mot_de_passe || mot_de_passe.length < MOT_DE_PASSE_MIN) {
    throw badRequest(`Le mot de passe doit contenir au moins ${MOT_DE_PASSE_MIN} caractères.`);
  }
  if (!id_mode_paiement) throw badRequest('Le mode de paiement est requis.');
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
    });

    // Une inscription par formation, avec la même fonction que l'Accueil
    const inscriptions = [];
    for (const { id_formation, nombre_tranches } of formations) {
      const id_inscription = await inscriptionService.creerInscriptionDans(connection, {
        id_etudiant,
        id_formation,
        nombre_tranches,
        id_tranche: nombre_tranches,
        origine: 'en_ligne',
      });

      // Premier paiement déclaré par l'étudiant : en attente jusqu'à la validation par l'Accueil
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

    const id_utilisateur = await inscriptionModel.getIdUtilisateurByEtudiant(id_etudiant, connection);
    return { id_etudiant, id_utilisateur, inscriptions };
  }).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      throw conflict('Un compte existe déjà avec cette adresse e-mail : contactez IMTECH INFO.');
    }
    throw error;
  });

  // Notifications après le commit : un échec ne doit pas annuler l'inscription
  const total = resultat.inscriptions.reduce((somme, i) => somme + i.montant_premier_paiement, 0);
  try {
    const nom = `${demande.prenom.trim()} ${demande.nom.trim()}`;
    await notifService.notifierPersonnel(
      `Nouvelle inscription en ligne : ${nom}, ${resultat.inscriptions.length} formation(s). ` +
      'Premier paiement déclaré à vérifier dans la page Inscriptions.'
    );
    await notifModel.insertNotificationInApp(
      resultat.id_utilisateur,
      `Bienvenue chez IMTECH INFO ! Votre inscription (${resultat.inscriptions.length} formation(s)) est en attente de validation par l'accueil.`
    );
  } catch (error) {
    console.warn('Notification d’inscription en ligne échouée :', error.message);
  }

  return { email, inscriptions: resultat.inscriptions, total_premier_paiement: total };
}

module.exports = { contenuVitrine, verifierDemande, inscriptionEnLigne, MOT_DE_PASSE_MIN };
