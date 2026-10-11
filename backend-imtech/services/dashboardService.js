// Service du tableau de bord : indicateurs, évolution dans le temps et export CSV.
const { Parser } = require('json2csv');
const dashboardModel = require('../models/dashboardModel');

async function recupererKPI() {
  return await dashboardModel.getKPI();
}

async function getDonneesInscriptionsParMois() {
  return await dashboardModel.getDonneesInscriptionsParMois();
}
async function getTopInscriptions() {
  return await dashboardModel.getTopInscriptions();
}

// Format MySQL DATE_FORMAT utilisé pour regrouper les données : par mois, par année ou par jour
function getFormatDatePourPeriode(periode) {
  if (periode === 'mensuel' || periode === 'mensuelle') return '%Y-%m';
  if (periode === 'annuel' || periode === 'annuelle') return '%Y';
  return '%Y-%m-%d';
}

// Évolution selon la période : "hebdomadaire" = jour par jour sur les 7 derniers jours ;
// sinon regroupement mensuel, annuel ou journalier sur tout l'historique
async function recupererEvolution(periode) {
  if (periode === 'hebdomadaire') {
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - 7);
    const dateDebutStr = dateDebut.toISOString().split('T')[0];
    return await dashboardModel.getEvolutionParJour(dateDebutStr);
  }

  const formatDate = getFormatDatePourPeriode(periode);
  return await dashboardModel.getEvolution(formatDate);
}

// Convertit la liste des inscriptions en texte CSV (colonnes = champs de la requête)
async function genererExportCSV() {
  const data = await dashboardModel.getDonneesInscriptions();
  const parser = new Parser();
  return parser.parse(data);
}

module.exports = {
  getDonneesInscriptionsParMois,
  recupererKPI,
  recupererEvolution,
  genererExportCSV,
  getTopInscriptions
};