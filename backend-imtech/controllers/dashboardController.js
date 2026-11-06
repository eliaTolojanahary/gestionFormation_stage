// Controller du tableau de bord (statistiques pour l'Accueil et le Super Admin).
const dashboardService = require('../services/dashboardService');
const { lirePeriode } = require('../utils/periode');

// GET /dashboard/kpi?debut=&fin= : indicateurs clés (sans période = tout l'historique)
async function kpi(req, res) {
  const data = await dashboardService.recupererKPI(lirePeriode(req.query));
  res.json({ status: 'success', data });
}

// GET /dashboard/inscriptionParMois?debut=&fin=
async function getDonneesInscriptionsParMois(req, res) {
  const data = await dashboardService.getDonneesInscriptionsParMois(lirePeriode(req.query));
  res.json({ status: 'success', data });
}

// GET /dashboard/topInscription?debut=&fin= : formations les plus demandées
async function getTopInscriptions(req, res) {
  const data = await dashboardService.getTopInscriptions(lirePeriode(req.query));
  res.json({ status: 'success', data });
}

// GET /dashboard/evolution?periode=... (défaut : mensuelle)
async function evolution(req, res) {
  const { periode, points } = await dashboardService.recupererEvolution(req.query.periode);
  res.json({ status: 'success', periode, data: points });
}

// GET /dashboard/export-csv : téléchargement du fichier export_inscriptions.csv
// En-tête X-Export-Limite : présent si le fichier a été coupé à ce nombre de lignes
async function exportCSV(req, res) {
  const { csv, limite } = await dashboardService.genererExportCSV();
  if (limite) res.header('X-Export-Limite', String(limite));
  res.header('Content-Type', 'text/csv; charset=utf-8');
  res.attachment('export_inscriptions.csv');
  res.send(csv);
}

module.exports = { getTopInscriptions, kpi, evolution, exportCSV, getDonneesInscriptionsParMois };
