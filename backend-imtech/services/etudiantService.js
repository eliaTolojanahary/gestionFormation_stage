// Service des étudiants. Un étudiant = une ligne `utilisateur` (compte) + une ligne `etudiant` (dossier).
const bcrypt = require('bcryptjs');
const etudiantModel = require('../models/etudiantModel');
const notifService = require('./notifService');
const etatService = require('./etatService');
const { avecTransaction } = require('../utils/transaction');
const { supprimerUpload } = require('../utils/fichiersUpload');
const { PIECES_DOSSIER, etatDossier } = require('../config/dossier');
const { notFound, badRequest } = require('../utils/errors');

// filtres = { recherche } ; pagination = { page, limite, offset } ou null (toute la liste, sans total)
async function listerEtudiants(filtres = {}, pagination = null) {
  if (!pagination) return await etudiantModel.getAllEtudiants(filtres);
  const [lignes, total] = await Promise.all([
    etudiantModel.getAllEtudiants(filtres, pagination),
    etudiantModel.compterEtudiants(filtres),
  ]);
  return { lignes, total };
}

async function recupererEtudiant(id) {
  const etudiant = await etudiantModel.getEtudiantById(id);
  if (!etudiant) throw notFound('Étudiant introuvable.');
  return etudiant;
}

async function recupererFormationsEtudiant(id) {
  return await etudiantModel.getFormationsByEtudiant(id);
}

// Crée le compte et le dossier dans une transaction : jamais l'un sans l'autre
async function creerEtudiant({ mot_de_passe, ...donnees }) {
  const mot_de_passe_hash = await bcrypt.hash(mot_de_passe, 10);
  return await avecTransaction((connection) =>
    etudiantModel.insertUtilisateurEtEtudiant(connection, { ...donnees, mot_de_passe_hash })
  );
}

// Met à jour les deux tables (utilisateur + etudiant) dans une transaction
async function modifierEtudiant(id, data) {
  const ok = await avecTransaction((connection) => etudiantModel.updateEtudiant(connection, id, data));
  if (!ok) throw notFound('Étudiant introuvable.');
}

async function supprimerEtudiant(id) {
  await etatService.desactiverEtudiant(id);
}

// ─── Mon dossier (étudiant connecté, mobile) ───

// Les 4 pièces avec leur fichier (null = à déposer) et si le dossier est complet
async function lireDossier(id_etudiant) {
  return etatDossier(await recupererEtudiant(id_etudiant));
}

// Dépose ou remplace des pièces ({ photo_1: 'etudiants/xxx.jpg', ... }). L'ancien fichier d'une pièce
// remplacée est supprimé ; l'Accueil est notifié (dépôt ou remplacement, et où en est le dossier).
// Une inscription déjà validée le reste.
async function deposerPieces(id_etudiant, fichiers) {
  const deposees = PIECES_DOSSIER.filter((p) => fichiers[p.champ]);
  if (deposees.length === 0) throw badRequest('Choisissez au moins une pièce à déposer.');

  const avant = await recupererEtudiant(id_etudiant);
  await modifierEtudiant(id_etudiant, fichiers);
  const remplacees = deposees.filter((p) => avant[p.champ]);
  await Promise.all(remplacees.map((p) => supprimerUpload(avant[p.champ])));

  const dossier = etatDossier({ ...avant, ...fichiers });
  const nouvelles = deposees.filter((p) => !avant[p.champ]);
  const actions = [
    nouvelles.length ? `a déposé : ${nouvelles.map((p) => p.libelle).join(', ')}` : '',
    remplacees.length ? `a remplacé : ${remplacees.map((p) => p.libelle).join(', ')}` : '',
  ].filter(Boolean).join(' ; ');
  const suite = dossier.complet ? 'Dossier complet.' : `Dossier : ${dossier.fournies}/${dossier.total} pièces.`;
  try {
    await notifService.notifierPersonnel(`${avant.prenom} ${avant.nom} ${actions}. ${suite}`);
  } catch (error) {
    console.warn('Notification de dépôt de pièces échouée :', error.message);
  }
  return dossier;
}

module.exports = {
  listerEtudiants, recupererEtudiant, recupererFormationsEtudiant,
  creerEtudiant, modifierEtudiant, supprimerEtudiant, lireDossier, deposerPieces
};
