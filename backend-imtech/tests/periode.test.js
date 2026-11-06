require('./setup');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { lirePeriode, paramsPeriode } = require('../utils/periode');
const { periodesAffichees } = require('../services/dashboardService');

// ─── Filtre ?debut=&fin= des états ──────────────────────────

test('période des états : sans dates = tout, bornes facultatives', () => {
  assert.deepEqual(lirePeriode({}), { debut: null, fin: null });
  assert.deepEqual(lirePeriode({ debut: '2026-07-01' }), { debut: '2026-07-01', fin: null });
  assert.deepEqual(lirePeriode({ debut: '2026-07-01', fin: '2026-09-30' }), { debut: '2026-07-01', fin: '2026-09-30' });
  assert.deepEqual(paramsPeriode({ debut: '2026-07-01', fin: '2026-09-30' }), ['2026-07-01', '2026-07-01', '2026-09-30', '2026-09-30']);
});

test('période des états : date mal écrite ou début après la fin refusés (400)', () => {
  for (const query of [{ debut: '01/07/2026' }, { fin: '2026-13-01' }, { debut: '2026-10-05', fin: '2026-10-01' }]) {
    assert.throws(() => lirePeriode(query), (err) => err.status === 400);
  }
});

// ─── Évolution des encaissements ──────────────────────────

test('évolution : 7 jours, 8 semaines (lundis), 12 mois ; pas de fenêtre pour l\'année', () => {
  const mardi = new Date(2026, 9, 27);
  const jours = periodesAffichees('quotidien', mardi);
  assert.equal(jours.length, 7);
  assert.equal(jours[6], '2026-10-27');
  const semaines = periodesAffichees('hebdomadaire', mardi);
  assert.equal(semaines.length, 8);
  assert.equal(semaines[7], '2026-10-26');
  assert.equal(semaines[0], '2026-09-07');
  const mois = periodesAffichees('mensuel', mardi);
  assert.equal(mois.length, 12);
  assert.deepEqual([mois[0], mois[11]], ['2025-11', '2026-10']);
  assert.deepEqual(periodesAffichees('annuel', mardi), []);
});
