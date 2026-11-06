require('./setup');
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../app');
const userModel = require('../models/userModel');
const presenceModel = require('../models/presenceModel');
const formationModel = require('../models/formationModel');
const documentModel = require('../models/documentModel');
const assistanceModel = require('../models/assistanceModel');
const { ROLES } = require('../config/roles');

afterEach(() => mock.restoreAll());

let server;
let baseUrl;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const jeton = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
const superAdmin = jeton(1, ROLES.SUPER_ADMIN);
const accueil = jeton(2, ROLES.ACCUEIL);
const formateur = jeton(3, ROLES.FORMATEUR);

function session() {
  mock.method(userModel, 'findActiveSession', async () => ({ id_session: 1 }));
  mock.method(presenceModel, 'marquerPresence', async () => {});
}

async function get(chemin, token) {
  const res = await fetch(`${baseUrl}${chemin}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, body: await res.json() };
}

// ─── Utilisateurs ───────────────────────────

test('GET /utilisateurs?page=2 : recherche et rôle transmis, rôle inconnu ignoré', async () => {
  session();
  const lister = mock.method(userModel, 'findAllUsers', async () => [{ id_utilisateur: 4 }]);
  mock.method(userModel, 'compterUsers', async () => 18);

  const { body } = await get(`/utilisateurs?page=2&limite=10&recherche=%20rabe%20&role=${encodeURIComponent('Formateur')}`, superAdmin);
  assert.deepEqual(lister.mock.calls[0].arguments, [
    { etat: 'actif', role: 'Formateur', recherche: 'rabe' },
    { page: 2, limite: 10, offset: 10 },
  ]);
  assert.deepEqual(body.pagination, { page: 2, limite: 10, total: 18, pages: 2 });

  await get('/utilisateurs?page=1&role=Pirate', superAdmin);
  assert.equal(lister.mock.calls[1].arguments[0].role, undefined);
});

test('GET /utilisateurs sans page : toute la liste, comme avant (choix du formateur d\'une formation)', async () => {
  session();
  mock.method(userModel, 'findAllUsers', async () => [{ id_utilisateur: 1 }, { id_utilisateur: 2 }]);
  const { body } = await get('/utilisateurs', superAdmin);
  assert.equal(body.data.length, 2);
  assert.equal(body.pagination, undefined);
});

// ─── Formations ─────────────────────────────

test('GET /formations?page=1 : un formateur ne reçoit que ses formations, et jamais les désactivées', async () => {
  session();
  const lister = mock.method(formationModel, 'getAllFormations', async () => []);
  mock.method(formationModel, 'compterFormations', async () => 0);

  await get('/formations?page=1&recherche=web&etat=inactif', formateur);
  assert.deepEqual(lister.mock.calls[0].arguments[0], { idUtilisateur: 3, etat: 'actif', recherche: 'web' });

  await get('/formations?page=1&etat=inactif', superAdmin);
  assert.deepEqual(lister.mock.calls[1].arguments[0], { idUtilisateur: undefined, etat: 'inactif', recherche: null });
});

// ─── Documents ──────────────────────────────

test('GET /documents?page=1 : documents et supports réunis, filtres lus, valeurs inconnues ignorées', async () => {
  session();
  const lister = mock.method(documentModel, 'getTousDocuments', async () => [{ id_document: 1, type_document: 'Support' }]);
  mock.method(documentModel, 'compterTousDocuments', async () => 12);

  const { body } = await get('/documents?page=1&limite=10&type=Support&extension=pdf&recherche=html', accueil);
  assert.deepEqual(lister.mock.calls[0].arguments[0], {
    etat: 'actif', type: 'Support', extension: 'PDF', recherche: 'html', id_formateur: undefined,
  });
  assert.equal(body.pagination.total, 12);

  await get('/documents?page=1&type=Autre&extension=pdf;DROP', formateur);
  const filtres = lister.mock.calls[1].arguments[0];
  assert.equal(filtres.type, undefined);
  assert.equal(filtres.extension, undefined);
  // Un formateur ne voit que les supports de ses formations
  assert.equal(filtres.id_formateur, 3);
});

test('GET /documents sans page : documents administratifs seuls, réponse `documents` comme avant', async () => {
  session();
  mock.method(documentModel, 'getDocuments', async () => [{ id_document: 1 }]);
  const { body } = await get('/documents', accueil);
  assert.deepEqual(body.documents, [{ id_document: 1 }]);
});

// ─── Assistance ─────────────────────────────

test('GET /assistances?page=1 : page, total et nombre de demandes en attente', async () => {
  session();
  const lister = mock.method(assistanceModel, 'getAssistances', async () => []);
  const compter = mock.method(assistanceModel, 'compterAssistances', async (f) => (f.statut === 'En attente' ? 5 : 10));

  const { body } = await get(`/assistances?page=1&statut=${encodeURIComponent('Résolu')}&recherche=attestation`, accueil);
  assert.deepEqual(lister.mock.calls[0].arguments[0], { statut: 'Résolu', recherche: 'attestation' });
  assert.equal(body.pagination.total, 10);
  assert.deepEqual(body.compteurs, { en_attente: 5 });
  assert.equal(compter.mock.callCount(), 2);

  await get('/assistances?page=1&statut=Pirate', accueil);
  assert.equal(lister.mock.calls[1].arguments[0].statut, undefined);
});
