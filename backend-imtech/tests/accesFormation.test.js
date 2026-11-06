require('./setup');
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../app');
const userModel = require('../models/userModel');
const presenceModel = require('../models/presenceModel');
const fichierModel = require('../models/fichierModel');
const supportModel = require('../models/supportModel');
const { ROLES } = require('../config/roles');

// Un étudiant n'accède aux supports, commentaires et réactions d'une formation
// que si son inscription est validée par l'Accueil (middlewares/accesFormation.js).

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => server.close());
afterEach(() => mock.restoreAll());

const tokenPour = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
const etudiant = tokenPour({ id: 10, role: ROLES.ETUDIANT, id_etudiant: 3 });
const formateur = tokenPour({ id: 3, role: ROLES.FORMATEUR });

// Session active ; `valide` = statut de l'inscription (null : pas inscrit)
function preparer(valide) {
  mock.method(userModel, 'findActiveSession', async () => ({ id_session: 1 }));
  mock.method(presenceModel, 'marquerPresence', async () => {});
  mock.method(fichierModel, 'inscriptionEtudiantFormation', async () => (valide === null ? null : { valide }));
  mock.method(fichierModel, 'formationDuSupport', async () => 6);
  return mock.method(supportModel, 'getSupportsByFormation', async () => [{ id_support: 14, titre: 'TCD' }]);
}

async function appel(methode, chemin, token, body) {
  const res = await fetch(`${baseUrl}${chemin}`, {
    method: methode,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

test('inscription en attente : supports de la formation refusés, avec un message clair', async () => {
  const lister = preparer(0);
  const res = await appel('GET', '/formations/6/supports', etudiant);
  assert.equal(res.status, 403);
  assert.match(res.body.message, /pas encore validée par l'Accueil/);
  assert.equal(lister.mock.callCount(), 0);
});

test('inscription validée : les supports sont renvoyés', async () => {
  preparer(1);
  const res = await appel('GET', '/formations/6/supports', etudiant);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
});

test("formation où l'étudiant n'est pas inscrit : refusé", async () => {
  preparer(null);
  const res = await appel('GET', '/formations/6/supports', etudiant);
  assert.equal(res.status, 403);
  assert.match(res.body.message, /pas inscrit/);
});

test('inscription en attente : support, commentaires et réactions refusés aussi', async () => {
  preparer(0);
  for (const [methode, chemin, body] of [
    ['GET', '/supports/14'],
    ['GET', '/supports/14/commentaires'],
    ['GET', '/supports/14/reactions'],
    ['POST', '/supports/14/reactions', { type_reaction: 'like' }],
    ['POST', '/commentaires', { id_support: 14, contenu: 'Bonjour' }],
  ]) {
    const res = await appel(methode, chemin, etudiant, body);
    assert.equal(res.status, 403, `${methode} ${chemin}`);
  }
});

test("le formateur n'est pas concerné par ce contrôle", async () => {
  const inscription = mock.method(fichierModel, 'inscriptionEtudiantFormation', async () => null);
  mock.method(userModel, 'findActiveSession', async () => ({ id_session: 1 }));
  mock.method(supportModel, 'getSupportsByFormation', async () => []);
  const res = await appel('GET', '/formations/6/supports', formateur);
  assert.equal(res.status, 200);
  assert.equal(inscription.mock.callCount(), 0);
});
