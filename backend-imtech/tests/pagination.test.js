require('./setup');
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../app');
const userModel = require('../models/userModel');
const presenceModel = require('../models/presenceModel');
const etudiantModel = require('../models/etudiantModel');
const paiementModel = require('../models/paiementModel');
const inscriptionModel = require('../models/inscriptionModel');
const echeanceModel = require('../models/echeanceModel');
const { lirePagination, reponsePaginee, LIMITE_MAX } = require('../utils/pagination');
const { ROLES } = require('../config/roles');

afterEach(() => mock.restoreAll());

// ─── Utilitaires ────────────────────────────

test('pagination : sans ?page, la liste n\'est pas paginée', () => {
  assert.equal(lirePagination({}), null);
  assert.equal(lirePagination({ recherche: 'x' }), null);
});

test('pagination : page et limite lues, bornées et converties en offset', () => {
  assert.deepEqual(lirePagination({ page: '3', limite: '10' }), { page: 3, limite: 10, offset: 20 });
  assert.deepEqual(lirePagination({ page: '1' }), { page: 1, limite: 20, offset: 0 });
  assert.equal(lirePagination({ page: '0' }).page, 1);
  assert.equal(lirePagination({ page: 'abc' }).page, 1);
  assert.equal(lirePagination({ page: '1', limite: '5000' }).limite, LIMITE_MAX);
});

test('pagination : nombre de pages calculé (au moins 1)', () => {
  const pagination = { page: 1, limite: 20, offset: 0 };
  assert.equal(reponsePaginee({ lignes: [], total: 0 }, pagination).pagination.pages, 1);
  assert.equal(reponsePaginee({ lignes: [], total: 41 }, pagination).pagination.pages, 3);
  assert.deepEqual(reponsePaginee({ lignes: [1], total: 1, compteurs: { a: 1 } }, pagination).compteurs, { a: 1 });
});

// ─── Routes ─────────────────────────────────

let server;
let baseUrl;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const accueil = jwt.sign({ id: 2, role: ROLES.ACCUEIL }, process.env.JWT_SECRET, { expiresIn: '1h' });
const etudiant = jwt.sign({ id: 10, role: ROLES.ETUDIANT, id_etudiant: 7 }, process.env.JWT_SECRET, { expiresIn: '1h' });

function session() {
  mock.method(userModel, 'findActiveSession', async () => ({ id_session: 1 }));
  mock.method(presenceModel, 'marquerPresence', async () => {});
}

async function get(chemin, token = accueil) {
  const res = await fetch(`${baseUrl}${chemin}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, body: await res.json() };
}

test('GET /etudiants?page=2&limite=5 : page demandée au model + total', async () => {
  session();
  const lister = mock.method(etudiantModel, 'getAllEtudiants', async () => [{ id_etudiant: 6 }]);
  mock.method(etudiantModel, 'compterEtudiants', async () => 12);

  const { status, body } = await get('/etudiants?page=2&limite=5&recherche=%20rabe%20');
  assert.equal(status, 200);
  assert.deepEqual(body.pagination, { page: 2, limite: 5, total: 12, pages: 3 });
  assert.deepEqual(lister.mock.calls[0].arguments, [{ recherche: 'rabe' }, { page: 2, limite: 5, offset: 5 }]);
});

test('GET /etudiants sans page : toute la liste, comme avant (mobile, tableau de bord)', async () => {
  session();
  mock.method(etudiantModel, 'getAllEtudiants', async () => [{ id_etudiant: 1 }, { id_etudiant: 2 }]);
  const { body } = await get('/etudiants');
  assert.equal(body.data.length, 2);
  assert.equal(body.pagination, undefined);
});

test('GET /paiements paginé : filtres transmis et nombre de paiements en attente', async () => {
  session();
  const lister = mock.method(paiementModel, 'getAllPaiements', async () => []);
  const compter = mock.method(paiementModel, 'compterPaiements', async (f) => (f.statut === 'en_attente' ? 3 : 8));

  const { body } = await get('/paiements?page=1&statut=valide&mode=Cash&recherche=web');
  assert.deepEqual(lister.mock.calls[0].arguments[0], { statut: 'valide', mode: 'Cash', recherche: 'web' });
  assert.equal(body.pagination.total, 8);
  assert.deepEqual(body.compteurs, { en_attente: 3 });
  assert.equal(compter.mock.callCount(), 2);
});

test('GET /paiements paginé pour un étudiant : limité à ses paiements', async () => {
  session();
  const lister = mock.method(paiementModel, 'getAllPaiements', async () => []);
  mock.method(paiementModel, 'compterPaiements', async () => 0);
  await get('/paiements?page=1', etudiant);
  assert.equal(lister.mock.calls[0].arguments[0].id_etudiant, 7);
});

test('GET /inscriptions et /echeances : valeurs de filtre inconnues ignorées', async () => {
  session();
  const inscriptions = mock.method(inscriptionModel, 'getAllInscriptions', async () => []);
  mock.method(inscriptionModel, 'compterInscriptions', async () => 0);
  const echeances = mock.method(echeanceModel, 'getAllEcheances', async () => []);
  mock.method(echeanceModel, 'compterEcheances', async () => 0);

  await get('/inscriptions?page=1&valide=non&origine=en_ligne');
  assert.deepEqual(inscriptions.mock.calls[0].arguments[0], { recherche: null, valide: false, origine: 'en_ligne' });
  await get('/inscriptions?page=1&valide=peut-etre&origine=pirate');
  assert.deepEqual(inscriptions.mock.calls[1].arguments[0], { recherche: null, valide: undefined, origine: undefined });

  await get('/echeances?page=1&statut=ROUGE');
  assert.equal(echeances.mock.calls[0].arguments[0].statut, 'ROUGE');
  await get('/echeances?page=1&statut=VIOLET');
  assert.equal(echeances.mock.calls[1].arguments[0].statut, undefined);
});
