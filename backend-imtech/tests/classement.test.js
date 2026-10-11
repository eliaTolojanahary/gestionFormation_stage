require('./setup');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculerClassement, joursOuvres } = require('../services/classementService');

// Formation de 90 jours commençant un lundi (05/01/2026) :
// 65 jours de cours, 55 jusqu'à 2 semaines avant la fin, moitié = 32,5
const LUNDI = new Date(2026, 0, 5);

function etudiant(nom, nb_presences, nb_echeances_en_retard = 0, note_presentation = null) {
  return {
    id_inscription: nom, nom, prenom: '',
    date_debut: LUNDI, duree_jours: 90,
    nb_presences, nb_echeances_en_retard, note_presentation,
  };
}

const parNom = (classement) => Object.fromEntries(classement.map((e) => [e.nom, e]));

test('jours de cours : les week-ends sont retirés sur les vraies dates', () => {
  assert.equal(joursOuvres(LUNDI, 7), 5);
  assert.equal(joursOuvres(LUNDI, 90), 65);            // 12 semaines (60) + 6 jours du lundi au samedi (5)
  assert.equal(joursOuvres(new Date(2026, 0, 10), 2), 0); // un samedi et un dimanche
  assert.equal(joursOuvres(LUNDI, 0), 0);
});

test('paiement : 5 si régulier, 2 sinon', () => {
  const c = parNom(calculerClassement([etudiant('Regulier', 0, 0), etudiant('Retard', 0, 1)]));
  assert.equal(c.Regulier.points_paiement, 5);
  assert.equal(c.Retard.points_paiement, 2);
});

test('présence : 2 sous la moitié, 3 à partir de la moitié, 5 jusqu\'à 2 semaines avant la fin', () => {
  const c = parNom(calculerClassement([
    etudiant('Absent', 32),     // < 32,5
    etudiant('Moitie', 33),     // >= 32,5 et < 55
    etudiant('Presque', 54),
    etudiant('Assidu', 55),     // présent jusqu'à 2 semaines avant la fin
  ]));
  assert.equal(c.Absent.points_presence, 2);
  assert.equal(c.Moitie.points_presence, 3);
  assert.equal(c.Presque.points_presence, 3);
  assert.equal(c.Assidu.points_presence, 5);
  assert.equal(c.Assidu.jours_requis, 65);
  assert.equal(c.Assidu.jours_jusqu_avant_fin, 55);
});

test('note système sur 10 : de 4 (retard + absent) à 10 (régulier + assidu)', () => {
  const c = parNom(calculerClassement([etudiant('Min', 0, 1), etudiant('Max', 60, 0)]));
  assert.equal(c.Min.note_suggeree, 4);
  assert.equal(c.Max.note_suggeree, 10);
});

test('note finale = note système + présentation, inconnue tant que le formateur n\'a pas noté', () => {
  const c = parNom(calculerClassement([etudiant('Note', 60, 0, '7.5'), etudiant('PasNote', 60, 0)]));
  assert.equal(c.Note.note_finale, 17.5);
  assert.equal(c.PasNote.note_finale, null);
});

test('classement : note système puis présences, ex æquo au même rang', () => {
  const classement = calculerClassement([etudiant('A', 40), etudiant('B', 60), etudiant('C', 40)]);
  assert.deepEqual(classement.map((e) => [e.nom, e.rang]), [['B', 1], ['A', 2], ['C', 2]]);
});

test('formation sans étudiant : classement vide', () => {
  assert.deepEqual(calculerClassement([]), []);
});
