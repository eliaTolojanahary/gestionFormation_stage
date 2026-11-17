// Risque de décrochage des étudiants : repérer un élève qui est en train de lâcher sa formation,
// pour que l'Accueil le contacte à temps. Outil interne : jamais montré à l'étudiant, jamais une sanction.
//
// Différence avec la note système (classementService) : la note JUGE toute la formation, pour
// l'attestation ; le risque regarde ce qui se passe MAINTENANT. Un élève peut avoir 9/10 et décrocher.
//
// Inscriptions suivies : validées, actives, étudiant et formation actifs, formation en cours depuis
// au moins JOURS_COURS_MINIMUM jours de cours (avant, trop peu de données pour juger).
//
// Trois critères, chacun noté 0, 1 ou 2 :
//   assiduité (10 derniers jours de cours terminés) : ≥ 75 % → 0 · 50 à 74 % → 1 · < 50 % → 2
//   silence (jours depuis le dernier cours ouvert)  : < 7 → 0 · ≥ 7 → 2
//   paiement (échéances en retard, règle ROUGE)      : 0 → 0 · 1 → 1 · 2 ou plus → 2
// Score sur 6 : 0-1 normal (non affiché) · 2-3 à surveiller · 4-6 à contacter.
// Il faut deux problèmes à la fois pour être « à contacter », sauf l'élève qui ne vient plus du
// tout (silence + assiduité).
const decrochageModel = require('../models/decrochageModel');
const dependanceService = require('./dependanceService');
const notifService = require('./notifService');
const { joursOuvres } = require('./classementService');
const { salutation, titre, formation } = require('../utils/modeleEmail');
const { formatMontant } = require('../utils/format');
const { conflict } = require('../utils/errors');

const NIVEAUX = Object.freeze({ A_SURVEILLER: 'a_surveiller', A_CONTACTER: 'a_contacter' });
const REGLES = Object.freeze({
  FENETRE_JOURS_COURS: 10,  // assiduité mesurée sur les 10 derniers jours de cours (deux semaines)
  JOURS_COURS_MINIMUM: 5,   // en dessous, la formation vient de commencer : pas de jugement
  ASSIDUITE: [{ tauxMin: 75, points: 0 }, { tauxMin: 50, points: 1 }, { tauxMin: 0, points: 2 }],
  SILENCE_JOURS: 7,         // une semaine sans ouvrir l'application
  SILENCE_POINTS: 2,
  RETARDS_POINTS_MAX: 2,    // 1 point par échéance en retard, au plus 2
  SEUIL_A_SURVEILLER: 2,
  SEUIL_A_CONTACTER: 4,
});
const DELAI_RELANCE_JOURS = 3; // pas plus d'une relance tous les 3 jours par inscription

// ─── Dates 'AAAA-MM-JJ' en heure locale ───

function versDate(texte) {
  const [annee, mois, jour] = texte.split('-').map(Number);
  return new Date(annee, mois - 1, jour);
}

function versTexte(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function ajouterJours(texte, nb) {
  const d = versDate(texte);
  return versTexte(new Date(d.getFullYear(), d.getMonth(), d.getDate() + nb));
}

const ecartJours = (debut, fin) => Math.round((versDate(fin) - versDate(debut)) / (24 * 60 * 60 * 1000));

// Les `nb` derniers jours de cours (lundi à vendredi) avant aujourd'hui, sans remonter avant le début
function derniersJoursDeCours(aujourdhui, debut, nb) {
  const jours = [];
  for (let jour = ajouterJours(aujourdhui, -1); jours.length < nb && jour >= debut; jour = ajouterJours(jour, -1)) {
    const semaine = versDate(jour).getDay();
    if (semaine !== 0 && semaine !== 6) jours.push(jour);
  }
  return jours;
}

const pluriel = (nb, mot) => `${nb} ${mot}${nb > 1 ? 's' : ''}`;

// ─── Calcul (fonction pure, testée) ───

/**
 * Évalue une inscription en cours. `presences` : jours de présence de l'étudiant ('AAAA-MM-JJ').
 * Renvoie null si la formation a commencé depuis moins de JOURS_COURS_MINIMUM jours de cours.
 */
function evaluerInscription(inscription, presences, aujourdhui) {
  const { date_debut: debut } = inscription;
  // joursOuvres (classementService) : jours de cours déjà terminés depuis le début (aujourd'hui exclu)
  if (joursOuvres(versDate(debut), ecartJours(debut, aujourdhui)) < REGLES.JOURS_COURS_MINIMUM) return null;

  const raisons = [];

  const fenetre = derniersJoursDeCours(aujourdhui, debut, REGLES.FENETRE_JOURS_COURS);
  const presents = new Set(presences);
  const joursPresents = fenetre.filter((jour) => presents.has(jour)).length;
  const taux_assiduite = Math.round((joursPresents / fenetre.length) * 100);
  const points_assiduite = REGLES.ASSIDUITE.find((palier) => taux_assiduite >= palier.tauxMin).points;
  if (points_assiduite) {
    raisons.push(`Présent ${joursPresents} jour${joursPresents > 1 ? 's' : ''} sur les ${fenetre.length} derniers jours de cours`);
  }

  // Aucun cours ouvert depuis le début de la formation : le silence compte depuis ce début
  // (présence = support ouvert, réaction ou commentaire : middlewares/presence.js)
  const connecteDepuisDebut = inscription.derniere_presence && inscription.derniere_presence >= debut;
  const jours_silence = ecartJours(connecteDepuisDebut ? inscription.derniere_presence : debut, aujourdhui);
  const points_silence = jours_silence >= REGLES.SILENCE_JOURS ? REGLES.SILENCE_POINTS : 0;
  if (points_silence) {
    raisons.push(connecteDepuisDebut
      ? `Aucun cours ouvert depuis ${jours_silence} jours`
      : `Aucun cours ouvert depuis le début de la formation (${jours_silence} jours)`);
  }

  const nb_retards = Number(inscription.nb_retards) || 0;
  const montant_retard = Number(inscription.montant_retard) || 0;
  const points_paiement = Math.min(nb_retards, REGLES.RETARDS_POINTS_MAX);
  if (points_paiement) {
    raisons.push(`${pluriel(nb_retards, 'échéance')} en retard (${formatMontant(montant_retard)})`);
  }

  const score = points_assiduite + points_silence + points_paiement;
  let niveau = null;
  if (score >= REGLES.SEUIL_A_CONTACTER) niveau = NIVEAUX.A_CONTACTER;
  else if (score >= REGLES.SEUIL_A_SURVEILLER) niveau = NIVEAUX.A_SURVEILLER;

  return {
    score, niveau, raisons,
    taux_assiduite, jours_presents: joursPresents, jours_fenetre: fenetre.length,
    jours_silence, nb_retards, montant_retard,
    points: { assiduite: points_assiduite, silence: points_silence, paiement: points_paiement },
  };
}

const ORDRE_NIVEAU = { [NIVEAUX.A_CONTACTER]: 0, [NIVEAUX.A_SURVEILLER]: 1 };

/**
 * Évalue toutes les inscriptions et garde celles à risque, les plus urgentes d'abord :
 * à contacter, puis à surveiller ; dans chaque groupe, score puis silence décroissants.
 * `presencesParUtilisateur` : Map id_utilisateur -> jours de présence.
 */
function classerRisques(inscriptions, presencesParUtilisateur, aujourdhui) {
  return inscriptions
    .map((i) => {
      const evaluation = evaluerInscription(i, presencesParUtilisateur.get(Number(i.id_utilisateur)) || [], aujourdhui);
      return evaluation && { ...i, ...evaluation };
    })
    .filter((i) => i?.niveau)
    .sort((a, b) =>
      ORDRE_NIVEAU[a.niveau] - ORDRE_NIVEAU[b.niveau] ||
      b.score - a.score ||
      b.jours_silence - a.jours_silence ||
      `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`)
    );
}

// ─── Lecture ───

// Étudiants à risque (tableau de bord), sans l'e-mail (inutile à l'écran)
async function listerEtudiantsARisque(aujourdhui = versTexte(new Date())) {
  const inscriptions = await decrochageModel.getInscriptionsEnCours();
  // Assez de jours pour couvrir les 10 derniers jours de cours (deux semaines et une marge)
  const depuis = ajouterJours(aujourdhui, -21);
  const ids = [...new Set(inscriptions.map((i) => Number(i.id_utilisateur)))];
  const presencesParUtilisateur = new Map();
  for (const { id_utilisateur, jour } of await decrochageModel.getPresences(ids, depuis)) {
    const cle = Number(id_utilisateur);
    if (!presencesParUtilisateur.has(cle)) presencesParUtilisateur.set(cle, []);
    presencesParUtilisateur.get(cle).push(jour);
  }
  // eslint-disable-next-line no-unused-vars
  return classerRisques(inscriptions, presencesParUtilisateur, aujourdhui).map(({ email, ...ligne }) => ligne);
}

// Minuscules sans accents : « Rakotondrabé » est trouvé en tapant « rakotondrabe »
const sansAccents = (texte) => String(texte ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Chaque mot tapé doit se trouver dans le prénom, le nom ou la formation (n'importe où dans le mot)
function correspond(ligne, mots) {
  const texte = sansAccents(`${ligne.prenom} ${ligne.nom} ${ligne.formation_nom}`);
  return mots.every((mot) => texte.includes(mot));
}

// Une page du tableau de bord. Le risque est calculé en JS (pas en SQL) : on classe toute la liste
// (les plus urgents d'abord), puis filtre par niveau, recherche et découpe. Les compteurs portent
// sur toute la liste (ni le filtre, ni la recherche, ni la page).
async function listerPageARisque({ recherche = null, niveau = null } = {}, pagination, aujourdhui) {
  const toutes = await listerEtudiantsARisque(aujourdhui);
  const a_contacter = toutes.filter((e) => e.niveau === NIVEAUX.A_CONTACTER).length;

  const mots = sansAccents(recherche).split(/\s+/).filter(Boolean);
  const lignes = toutes.filter((ligne) => (!niveau || ligne.niveau === niveau) && correspond(ligne, mots));

  return {
    lignes: lignes.slice(pagination.offset, pagination.offset + pagination.limite),
    total: lignes.length,
    compteurs: { a_contacter, a_surveiller: toutes.length - a_contacter },
  };
}

// ─── Relance ───

// Bouton « Relancer » : notification in-app + e-mail bienveillant à l'étudiant (sans parler de
// « risque »), au plus une fois tous les DELAI_RELANCE_JOURS jours par inscription.
async function relancer(id_inscription, id_auteur = null) {
  await dependanceService.verifierInscription(id_inscription); // désactivée, étudiant ou formation désactivés : 409
  const i = await decrochageModel.getInscription(id_inscription);
  if (!Number(i.en_cours)) throw conflict("Cette formation n'est pas en cours : pas de relance.");

  if (!(await decrochageModel.reserverRelance(id_inscription, DELAI_RELANCE_JOURS))) {
    const date = new Date(i.derniere_relance).toLocaleDateString('fr-FR');
    throw conflict(`${i.prenom} ${i.nom} a déjà été relancé le ${date} : une relance tous les ${DELAI_RELANCE_JOURS} jours au plus.`);
  }

  const nbRetards = Number(i.nb_retards) || 0;
  const phrasePaiement = nbRetards
    ? ` Vous avez aussi ${pluriel(nbRetards, 'échéance')} en retard (${formatMontant(i.montant_retard)}) : nous pouvons en parler ensemble.`
    : '';

  return notifService.notifierEtudiant({
    id_utilisateur: i.id_utilisateur,
    email: i.email,
    message: `Nous ne vous avons pas vu sur la formation ${i.formation_nom} depuis quelque temps. Tout va bien ? ` +
      `L'équipe Imteaching Formation est là si vous avez besoin d'aide.${phrasePaiement}`,
    sujet: `Imteaching Formation — Des nouvelles de votre formation : ${i.formation_nom}`,
    contenuHtml: `${titre('Tout va bien ?')}
      ${salutation(i.prenom, i.nom)}
      <p>Nous ne vous avons pas vu sur la formation ${formation(i.formation_nom)} depuis quelque temps.
      Tout va bien ?</p>
      <p>Si vous rencontrez une difficulté, quelle qu'elle soit, <strong>n'hésitez pas à nous contacter</strong>
      ou à passer à l'Accueil : nous sommes là pour vous aider à aller au bout de votre formation.</p>
      ${nbRetards ? `<p>Vous avez aussi <strong>${pluriel(nbRetards, 'échéance')} en retard</strong>
      (${formatMontant(i.montant_retard)}). Si le paiement pose problème, parlons-en : nous trouverons
      ensemble une solution.</p>` : ''}`,
    id_auteur,
  });
}

module.exports = {
  NIVEAUX, REGLES, DELAI_RELANCE_JOURS,
  evaluerInscription, classerRisques, derniersJoursDeCours, listerEtudiantsARisque, listerPageARisque, relancer,
};
