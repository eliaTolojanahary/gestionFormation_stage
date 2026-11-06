require('./setup');
const { test, mock, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const dashboardModel = require('../models/dashboardModel');
const dashboardService = require('../services/dashboardService');

beforeEach(() => {
  mock.restoreAll();
  dashboardService.viderCache();
});

// ─── Cache des statistiques du tableau de bord ──────────────────────────

test('tableau de bord : même période redemandée = un seul calcul, autre période = nouveau calcul', async () => {
  const getKPI = mock.method(dashboardModel, 'getKPI', async (periode) => ({ montant_encaisse: periode.debut || 'tout' }));

  assert.deepEqual(await dashboardService.recupererKPI({ debut: null, fin: null }), { montant_encaisse: 'tout' });
  await dashboardService.recupererKPI({ debut: null, fin: null });
  assert.equal(getKPI.mock.callCount(), 1);

  assert.deepEqual(await dashboardService.recupererKPI({ debut: '2026-07-01', fin: null }), { montant_encaisse: '2026-07-01' });
  assert.equal(getKPI.mock.callCount(), 2);
});

test('tableau de bord : demandes simultanées partagent le même calcul', async () => {
  const getTop = mock.method(dashboardModel, 'getTopInscriptions', async () => [{ formation: 'Python' }]);

  const [a, b] = await Promise.all([
    dashboardService.getTopInscriptions({}),
    dashboardService.getTopInscriptions({}),
  ]);
  assert.deepEqual(a, b);
  assert.equal(getTop.mock.callCount(), 1);
});

test('tableau de bord : une erreur n\'est pas gardée en cache', async () => {
  let essais = 0;
  mock.method(dashboardModel, 'getDonneesInscriptionsParMois', async () => {
    essais += 1;
    if (essais === 1) throw new Error('base indisponible');
    return [{ periode: '2026-10', total: 3 }];
  });

  await assert.rejects(dashboardService.getDonneesInscriptionsParMois({}), /base indisponible/);
  assert.deepEqual(await dashboardService.getDonneesInscriptionsParMois({}), [{ periode: '2026-10', total: 3 }]);
  assert.equal(essais, 2);
});

test('tableau de bord : le cache expire après une minute', async () => {
  mock.timers.enable({ apis: ['Date'], now: 0 });
  const getEvolution = mock.method(dashboardModel, 'getEvolution', async () => []);

  await dashboardService.recupererEvolution('annuel');
  mock.timers.tick(59 * 1000);
  await dashboardService.recupererEvolution('annuel');
  assert.equal(getEvolution.mock.callCount(), 1);

  mock.timers.tick(2 * 1000);
  await dashboardService.recupererEvolution('annuel');
  assert.equal(getEvolution.mock.callCount(), 2);
  mock.timers.reset();
});
