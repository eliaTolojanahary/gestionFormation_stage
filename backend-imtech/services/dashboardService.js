// Service du tableau de bord : indicateurs, évolution dans le temps et export CSV.
const { Parser } = require('json2csv');
const dashboardModel = require('../models/dashboardModel');
const { creerCache } = require('../utils/cache');
const { LIMITE_EXPORT } = require('../utils/pagination');

// Cache des statistiques : elles sont les mêmes pour tout le personnel et parcourent tout
// l'historique quand aucune période n'est choisie. Chaque calcul est gardé 1 minute par période.
const enCache = creerCache(60 * 1000);

const clePeriode = (nom, { debut = null, fin = null } = {}) => `${nom}:${debut}:${fin}`;

async function recupererKPI(periode) {
  return await enCache(clePeriode('kpi', periode), () => dashboardModel.getKPI(periode));
}

async function getDonneesInscriptionsParMois(periode) {
  return await enCache(clePeriode('parMois', periode), () => dashboardModel.getDonneesInscriptionsParMois(periode));
}
async function getTopInscriptions(periode) {
  return await enCache(clePeriode('top', periode), () => dashboardModel.getTopInscriptions(periode));
}

// Accepte aussi les formes au féminin ("mensuelle") ; période inconnue = mensuel
function normaliserPeriode(periode) {
  const p = String(periode || '').replace(/le$/, '');
  return ['quotidien', 'hebdomadaire', 'mensuel', 'annuel'].includes(p) ? p : 'mensuel';
}

// Date en texte 'AAAA-MM-JJ', heure locale (comme date_paiement)
function versTexte(date) {
  const deux = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}`;
}

// Liste des clés de période affichées, de la plus ancienne à l'actuelle (même format que le model) :
// 7 derniers jours, 8 dernières semaines (lundis), 12 derniers mois. L'année n'a pas de fenêtre.
function periodesAffichees(periode, aujourdhui = new Date()) {
  const debut = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
  const cles = [];
  if (periode === 'quotidien') {
    for (let i = 6; i >= 0; i--) {
      cles.push(versTexte(new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() - i)));
    }
  } else if (periode === 'hebdomadaire') {
    const lundi = debut.getDate() - ((debut.getDay() + 6) % 7);
    for (let i = 7; i >= 0; i--) {
      cles.push(versTexte(new Date(debut.getFullYear(), debut.getMonth(), lundi - 7 * i)));
    }
  } else if (periode === 'mensuel') {
    for (let i = 11; i >= 0; i--) {
      cles.push(versTexte(new Date(debut.getFullYear(), debut.getMonth() - i, 1)).slice(0, 7));
    }
  }
  return cles;
}

// Encaissements par jour, semaine, mois ou année. Pour jour, semaine et mois, la fenêtre est fixe
// et les périodes sans paiement valent 0 (sinon le graphique saute des jours sans le dire).
async function recupererEvolution(periodeDemandee) {
  const periode = normaliserPeriode(periodeDemandee);
  return await enCache(`evolution:${periode}`, () => calculerEvolution(periode));
}

async function calculerEvolution(periode) {
  const cles = periodesAffichees(periode);
  if (cles.length === 0) {
    const lignes = await dashboardModel.getEvolution(periode, null);
    return { periode, points: lignes.map((l) => ({ periode: l.periode, total: Number(l.total) })) };
  }

  // Le premier jour de la fenêtre, à minuit (le mois 'AAAA-MM' devient 'AAAA-MM-01')
  const dateDebut = cles[0].length === 7 ? `${cles[0]}-01` : cles[0];
  const lignes = await dashboardModel.getEvolution(periode, dateDebut);
  const totaux = new Map(lignes.map((l) => [l.periode, Number(l.total)]));
  return { periode, points: cles.map((cle) => ({ periode: cle, total: totaux.get(cle) || 0 })) };
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
// { csv, limite } : limite = LIMITE_EXPORT si l'export a été coupé à ce nombre de lignes, sinon null.
async function genererExportCSV() {
  const data = await dashboardModel.getDonneesInscriptions();
  const tronque = data.length > LIMITE_EXPORT;
  const parser = new Parser({ fields: COLONNES_EXPORT, delimiter: ';', withBOM: true });
  return { csv: parser.parse(tronque ? data.slice(0, LIMITE_EXPORT) : data), limite: tronque ? LIMITE_EXPORT : null };
}

module.exports = {
  getDonneesInscriptionsParMois,
  recupererKPI,
  recupererEvolution,
  periodesAffichees,
  genererExportCSV,
  viderCache: enCache.vider, // pour les tests
  getTopInscriptions
};