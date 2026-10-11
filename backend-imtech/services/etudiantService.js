// Service des étudiants. Un étudiant = une ligne `utilisateur` (compte) + une ligne `etudiant` (dossier).
const bcrypt = require('bcryptjs');
const etudiantModel = require('../models/etudiantModel');
const { avecTransaction } = require('../utils/transaction');
const { notFound } = require('../utils/errors');

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
  const ok = await etudiantModel.deleteEtudiant(id);
  if (!ok) throw notFound('Étudiant introuvable.');
}

module.exports = {
  listerEtudiants, recupererEtudiant, recupererFormationsEtudiant,
  creerEtudiant, modifierEtudiant, supprimerEtudiant
};
