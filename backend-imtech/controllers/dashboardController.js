// Controller du tableau de bord (statistiques pour l'Accueil et le Super Admin).
const dashboardService = require('../services/dashboardService');

// GET /dashboard/kpi : indicateurs clés
async function kpi(req, res) {
  const data = await dashboardService.recupererKPI();
  res.json({ status: 'success', data });
}

// GET /dashboard/inscriptionParMois
async function getDonneesInscriptionsParMois(req, res) {
  const data = await dashboardService.getDonneesInscriptionsParMois();
  res.json({ status: 'success', data });
}

// GET /dashboard/topInscription : formations les plus demandées
async function getTopInscriptions(req, res) {
  const data = await dashboardService.getTopInscriptions();
  res.json({ status: 'success', data });
}

// GET /dashboard/evolution?periode=... (défaut : mensuelle)
async function evolution(req, res) {
  const periode = req.query.periode || 'mensuelle';
  const data = await dashboardService.recupererEvolution(periode);
  res.json({ status: 'success', periode, data });
}

// GET /dashboard/export-csv : téléchargement du fichier export_inscriptions.csv
async function exportCSV(req, res) {
  const csv = await dashboardService.genererExportCSV();
  res.header('Content-Type', 'text/csv');
  res.attachment('export_inscriptions.csv');
  res.send(csv);
}

module.exports = { getTopInscriptions, kpi, evolution, exportCSV, getDonneesInscriptionsParMois };
