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
function getFormatDatePourPeriode(periode) {
  if (periode === 'mensuel' || periode === 'mensuelle') return '%Y-%m';
  if (periode === 'annuel' || periode === 'annuelle') return '%Y';
  return '%Y-%m-%d';
}

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