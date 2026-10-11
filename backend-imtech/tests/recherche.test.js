require('./setup');
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../app');
const userModel = require('../models/userModel');
const presenceModel = require('../models/presenceModel');
const rechercheModel = require('../models/rechercheModel');
const { rechercher, motifLike } = require('../services/rechercheService');
const { ROLES } = require('../config/roles');

afterEach(() => mock.restoreAll());

// Faux models : chaque recherche renvoie un résultat qui indique ses arguments
function simulerModels() {
  const appels = {};
  for (const nom of [
    'chercherEtudiants', 'chercherFormations', 'chercherInscriptions', 'chercherUtilisateurs', 'chercherSupports',
    'chercherFormationsEtudiant', 'chercherSupportsEtudiant',
  ]) {
    appels[nom] = mock.method(rechercheModel, nom, async (...args) => [{ args }]);
  }
  return appels;
}

// ─── Service ────────────────────────────────

test('recherche : moins de 2 caractères = aucune requête', async () => {
  const appels = simulerModels();
  const r = await rechercher(' a ', { role: ROLES.SUPER_ADMIN, id: 1 });
  assert.deepEqual(Object.values(r).map((g) => g.length), [0, 0, 0, 0, 0]);
  assert.equal(appels.chercherEtudiants.mock.callCount(), 0);
});

test('recherche : % et _ tapés sont cherchés tels quels', () => {
  assert.equal(motifLike('50%_x'), '%50\\%\\_x%');
});

test('recherche Super Admin : étudiants, formations, inscriptions et utilisateurs', async () => {
  const appels = simulerModels();
  const r = await rechercher('rabe', { role: ROLES.SUPER_ADMIN, id: 1 });
  assert.equal(r.utilisateurs.length, 1);
  assert.equal(r.inscriptions.length, 1);
  assert.equal(r.supports.length, 0);
  // Pas de filtre formateur pour le personnel
  assert.equal(appels.chercherEtudiants.mock.calls[0].arguments[2], undefined);
});

test('recherche Accueil : pas de comptes utilisateurs', async () => {
  const appels = simulerModels();
  const r = await rechercher('rabe', { role: ROLES.ACCUEIL, id: 2 });
  assert.equal(r.utilisateurs.length, 0);
  assert.equal(appels.chercherUtilisateurs.mock.callCount(), 0);
  assert.equal(r.inscriptions.length, 1);
});

test('recherche Formateur : limitée à ses formations, ses étudiants et ses supports', async () => {
  const appels = simulerModels();
  const r = await rechercher('rabe', { role: ROLES.FORMATEUR, id: 3 });
  assert.equal(appels.chercherEtudiants.mock.calls[0].arguments[2], 3);
  assert.equal(appels.chercherFormations.mock.calls[0].arguments[2], 3);
  assert.equal(appels.chercherSupports.mock.calls[0].arguments[2], 3);
  assert.equal(appels.chercherInscriptions.mock.callCount(), 0);
  assert.equal(appels.chercherUtilisateurs.mock.callCount(), 0);
  assert.equal(r.inscriptions.length + r.utilisateurs.length, 0);
});

test('recherche Étudiant : seulement ses formations et les supports de ses formations', async () => {
  const appels = simulerModels();
  const r = await rechercher('web', { role: ROLES.ETUDIANT, id: 10, id_etudiant: 7 });
  assert.equal(appels.chercherFormationsEtudiant.mock.calls[0].arguments[2], 7);
  assert.equal(appels.chercherSupportsEtudiant.mock.calls[0].arguments[2], 7);
  for (const nom of ['chercherEtudiants', 'chercherFormations', 'chercherInscriptions', 'chercherUtilisateurs', 'chercherSupports']) {
    assert.equal(appels[nom].mock.callCount(), 0, nom);
  }
  assert.equal(r.formations.length + r.supports.length, 2);
  assert.equal(r.etudiants.length + r.inscriptions.length + r.utilisateurs.length, 0);
});

test('recherche Étudiant sans fiche étudiant : aucun résultat', async () => {
  const appels = simulerModels();
  const r = await rechercher('web', { role: ROLES.ETUDIANT, id: 11 });
  assert.deepEqual(Object.values(r).map((g) => g.length), [0, 0, 0, 0, 0]);
  assert.equal(appels.chercherFormationsEtudiant.mock.callCount(), 0);
});

// ─── Route ──────────────────────────────────

let server;
let baseUrl;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const token = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

test('GET /recherche : 401 sans connexion, 200 pour le personnel et pour un étudiant (ses résultats)', async () => {
  mock.method(userModel, 'findActiveSession', async () => ({ id_session: 1 }));
  mock.method(presenceModel, 'marquerPresence', async () => {});
  simulerModels();

  const appel = (t) => fetch(`${baseUrl}/recherche?q=rabe`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });

  assert.equal((await appel()).status, 401);
  const res = await appel(token({ id: 2, role: ROLES.ACCUEIL }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.formations.length, 1);
  const resEtudiant = await appel(token({ id: 10, role: ROLES.ETUDIANT, id_etudiant: 7 }));
  assert.equal(resEtudiant.status, 200);
  const data = (await resEtudiant.json()).data;
  assert.equal(data.supports.length, 1);
  assert.equal(data.etudiants.length, 0);
});
