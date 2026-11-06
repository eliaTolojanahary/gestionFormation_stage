require('./setup');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculerClassement, joursOuvres } = require('../services/classementService');

// Formation de 90 jours commençant un lundi (05/01/2026), terminée à la date du calcul :
// 65 jours de cours
const LUNDI = new Date(2026, 0, 5);
const APRES_LA_FIN = new Date(2026, 5, 1);

function etudiant(nom, nb_presences, { retards = 0, nonReglees = 0, presentation = null } = {}) {
  return {
    id_inscription: nom, nom, prenom: '',
    date_debut: LUNDI, duree_jours: 90,
    nb_presences, nb_payees_en_retard: retards, nb_non_reglees: nonReglees, note_presentation: presentation,
  };
}

const classer = (etudiants, aujourdhui = APRES_LA_FIN) =>
  Object.fromEntries(calculerClassement(etudiants, aujourdhui).map((e) => [e.nom, e]));

test('jours de cours : les week-ends sont retirés sur les vraies dates', () => {
  assert.equal(joursOuvres(LUNDI, 7), 5);
  assert.equal(joursOuvres(LUNDI, 90), 65);            // 12 semaines (60) + 6 jours du lundi au samedi (5)
  assert.equal(joursOuvres(new Date(2026, 0, 10), 2), 0); // un samedi et un dimanche
  assert.equal(joursOuvres(LUNDI, 0), 0);
});

test('présence : 0 à partir de 90 %, −1 à partir de 75 %, −2 à partir de 50 %, −4 en dessous', () => {
  const c = classer([
    etudiant('Assidu', 59),   // 91 %
    etudiant('Bien', 52),     // 80 %
    etudiant('Moyen', 33),    // 51 %
    etudiant('Absent', 32),   // 49 %
  ]);
  assert.equal(c.Assidu.jours_requis, 65);
  assert.deepEqual([c.Assidu, c.Bien, c.Moyen, c.Absent].map((e) => [e.taux_presence, e.points_presence]),
    [[91, 0], [80, -1], [51, -2], [49, -4]]);
});

test('formation en cours : seuls les jours de cours déjà passés comptent', () => {
  // Vendredi de la 2e semaine : 10 jours de cours passés, 9 présences = 90 %
  const c = classer([etudiant('EnCours', 9)], new Date(2026, 0, 16));
  assert.equal(c.EnCours.jours_requis, 10);
  assert.equal(c.EnCours.points_presence, 0);
});

test('paiement : −1 par échéance payée en retard, −2 par échéance non réglée, au plus −4', () => {
  const c = classer([
    etudiant('ATemps', 65),
    etudiant('Retard', 65, { retards: 1 }),
    etudiant('Impaye', 65, { retards: 1, nonReglees: 1 }),
    etudiant('Plafond', 65, { nonReglees: 3 }),
  ]);
  assert.deepEqual([c.ATemps, c.Retard, c.Impaye, c.Plafond].map((e) => e.points_paiement), [0, -1, -3, -4]);
  assert.equal(c.ATemps.paiement_regulier, true);
  assert.equal(c.Retard.paiement_regulier, false);
});

test('exemple : présence 80 % et une échéance payée en retard → 10 − 1 − 1 = 8, puis 15/20 avec 7 en présentation', () => {
  const c = classer([etudiant('Exemple', 52, { retards: 1, presentation: '7' })]);
  assert.equal(c.Exemple.note_suggeree, 8);
  assert.equal(c.Exemple.note_finale, 15);
});

test('note système : 10 pour un étudiant assidu et à jour, 2 au pire (absent et impayés)', () => {
  const c = classer([etudiant('Max', 65), etudiant('Min', 0, { nonReglees: 2 })]);
  assert.equal(c.Max.note_suggeree, 10);
  assert.equal(c.Min.note_suggeree, 2);
});

test('note finale inconnue tant que le formateur n\'a pas noté', () => {
  assert.equal(classer([etudiant('PasNote', 65)]).PasNote.note_finale, null);
});

test('classement : note système puis présences, ex æquo au même rang', () => {
  const classement = calculerClassement([etudiant('A', 40), etudiant('B', 60), etudiant('C', 40)], APRES_LA_FIN);
  assert.deepEqual(classement.map((e) => [e.nom, e.rang]), [['B', 1], ['A', 2], ['C', 2]]);
});

test('formation sans étudiant : classement vide', () => {
  assert.deepEqual(calculerClassement([]), []);
});
