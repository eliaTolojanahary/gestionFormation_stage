require('./setup');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculerEcheancier } = require('../services/echeanceService');

test('la somme des tranches est exactement égale au tarif (arrondi absorbé par la dernière)', () => {
  const echeances = calculerEcheancier({ tarifTotal: 100000, dureeJours: 90, nombreTranches: 3 });
  assert.equal(echeances.length, 3);
  assert.deepEqual(echeances.map((e) => e.montant), [33333.33, 33333.33, 33333.34]);
  const total = echeances.reduce((somme, e) => somme + Math.round(e.montant * 100), 0) / 100;
  assert.equal(total, 100000);
});

test('les dates sont espacées de duree_jours / nombre_tranches', () => {
  const dateDebut = new Date('2026-01-01T00:00:00Z');
  const echeances = calculerEcheancier({ tarifTotal: 300, dureeJours: 30, nombreTranches: 3, dateDebut });
  assert.deepEqual(echeances.map((e) => e.date), ['2026-01-11', '2026-01-21', '2026-01-31']);
});

test('une seule tranche = tarif complet', () => {
  const [unique] = calculerEcheancier({ tarifTotal: 1500.5, dureeJours: 10, nombreTranches: 1 });
  assert.equal(unique.montant, 1500.5);
});

test('un nombre de tranches invalide est refusé avec une erreur 400', () => {
  for (const nombreTranches of [0, -2, 1.5, 'abc']) {
    assert.throws(
      () => calculerEcheancier({ tarifTotal: 100, dureeJours: 10, nombreTranches }),
      (err) => err.status === 400
    );
  }
});
