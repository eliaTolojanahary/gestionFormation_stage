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

// ─── Modification d'une échéance par l'admin (planifierModification) ───
const { planifierModification } = require('../services/echeanceService');

// Inscription à 300 000 Ar en 3 échéances ; la 1re est déjà payée
const ECHEANCIER = [
  { id_echeance: 1, montant_prevu: 100000, date_echeance: '2026-12-01', etat: 1, montant_envoye: 100000 },
  { id_echeance: 2, montant_prevu: 100000, date_echeance: '2027-01-01', etat: 1, montant_envoye: 0 },
  { id_echeance: 3, montant_prevu: 100000, date_echeance: '2027-02-01', etat: 1, montant_envoye: 0 },
];
const total = (echeances, plan) => echeances.reduce((somme, e) => {
  const maj = plan.misesAJour.find((m) => m.id_echeance === e.id_echeance);
  return somme + (maj ? maj.montant_prevu : e.montant_prevu);
}, 0);

test('modifier la date seule : aucun report, montant inchangé', () => {
  const plan = planifierModification(ECHEANCIER, 2, { date_echeance: '2027-01-15' });
  assert.equal(plan.report, null);
  assert.deepEqual(plan.misesAJour.map((m) => [m.id_echeance, m.montant_prevu, m.date_echeance]), [[2, 100000, '2027-01-15']]);
});

test('baisser un montant : la différence va sur la dernière échéance non réglée, le total ne change pas', () => {
  const plan = planifierModification(ECHEANCIER, 2, { montant_prevu: 80000 });
  assert.equal(plan.report.id_echeance, 3);
  assert.equal(plan.report.montant_prevu, 120000);
  assert.equal(total(ECHEANCIER, plan), 300000);
});

test('modifier la dernière échéance : le report va sur la précédente non réglée', () => {
  const plan = planifierModification(ECHEANCIER, 3, { montant_prevu: 150000 });
  assert.equal(plan.report.id_echeance, 2);
  assert.equal(plan.report.montant_prevu, 50000);
  assert.equal(total(ECHEANCIER, plan), 300000);
});

test('une échéance déjà réglée ne se modifie plus : 409', () => {
  assert.throws(() => planifierModification(ECHEANCIER, 1, { date_echeance: '2026-12-20' }), (err) => err.status === 409);
});

test("montant trop élevé (l'autre échéance tomberait à 0) : 400 avec le maximum possible", () => {
  assert.throws(
    () => planifierModification(ECHEANCIER, 2, { montant_prevu: 200000 }),
    (err) => err.status === 400 && /199 999/.test(err.message)
  );
});

test("montant inférieur à ce que l'étudiant a déjà envoyé : 400", () => {
  const partiel = ECHEANCIER.map((e) => (e.id_echeance === 2 ? { ...e, montant_envoye: 60000 } : e));
  assert.throws(() => planifierModification(partiel, 2, { montant_prevu: 50000 }), (err) => err.status === 400);
});

test("sans autre échéance non réglée, seul le montant est refusé (409), la date reste modifiable", () => {
  const seule = [ECHEANCIER[0], ECHEANCIER[1], { ...ECHEANCIER[2], montant_envoye: 100000 }];
  assert.throws(() => planifierModification(seule, 2, { montant_prevu: 90000 }), (err) => err.status === 409);
  assert.equal(planifierModification(seule, 2, { date_echeance: '2027-01-20' }).report, null);
});

test('date invalide, montant <= 0 ou aucune modification : 400', () => {
  for (const donnees of [{ date_echeance: '2027-02-31' }, { date_echeance: '15/01/2027' }, { montant_prevu: 0 }, { montant_prevu: 'abc' }, {}]) {
    assert.throws(() => planifierModification(ECHEANCIER, 2, donnees), (err) => err.status === 400);
  }
});
