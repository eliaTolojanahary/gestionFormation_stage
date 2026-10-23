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

// Colonnes de l'export : titre affiché dans Excel -> champ de la requête
const COLONNES_EXPORT = [
  { label: 'N° inscription', value: 'id_inscription' },
  { label: 'Nom', value: 'nom' },
  { label: 'Prénom', value: 'prenom' },
  { label: 'Formation', value: 'formation' },
  {
    label: "Date d'inscription",
    value: (ligne) => (ligne.date_inscription ? new Date(ligne.date_inscription).toLocaleDateString('fr-FR') : ''),
  },
  // MySQL renvoie le DECIMAL en texte : converti en nombre pour qu'Excel puisse faire des sommes
  { label: 'Tarif (Ar)', value: (ligne) => Number(ligne.tarif) },
];

// Convertit la liste des inscriptions en texte CSV lisible par Excel en français :
// séparateur « ; » et BOM UTF-8 (sinon les accents s'affichent mal).
// Les colonnes sont fixées : le fichier garde son en-tête même sans aucune inscription.
async function genererExportCSV() {
  const data = await dashboardModel.getDonneesInscriptions();
  const parser = new Parser({ fields: COLONNES_EXPORT, delimiter: ';', withBOM: true });
  return parser.parse(data);
}

module.exports = {
  getDonneesInscriptionsParMois,
  recupererKPI,
  recupererEvolution,
  genererExportCSV,
  getTopInscriptions
};