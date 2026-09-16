const dashboardService = require('../services/dashboardService');

async function kpi(req, res) {
  try {
    const data = await dashboardService.recupererKPI();
    return res.json({ status: "success", data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function getDonneesInscriptionsParMois(req, res) {
  try {
    const data = await dashboardService.getDonneesInscriptionsParMois();
    return res.json({ status: "success", data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}
async function getTopInscriptions(req, res) {
  try {
    const data = await dashboardService.getTopInscriptions();
    return res.json({ status: "success", data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}
async function evolution(req, res) {
  try {
    const periode = req.query.periode || 'mensuelle';
    const data = await dashboardService.recupererEvolution(periode);
    return res.json({ status: "success", periode, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function exportCSV(req, res) {
  try {
    const csv = await dashboardService.genererExportCSV();
    res.header('Content-Type', 'text/csv');
    res.attachment('export_inscriptions.csv');
    return res.send(csv);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

module.exports = { getTopInscriptions,kpi, evolution, exportCSV,getDonneesInscriptionsParMois };