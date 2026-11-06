require('./setup');
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = require('../app');
const userModel = require('../models/userModel');
const parametreModel = require('../models/parametreModel');
const presenceModel = require('../models/presenceModel');
const { ROLES } = require('../config/roles');

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
const admin = tokenPour({ id: 1, role: ROLES.SUPER_ADMIN });
const accueil = tokenPour({ id: 2, role: ROLES.ACCUEIL });

function sessionActive() {
  mock.method(userModel, 'findActiveSession', async () => ({ id_session: 1 }));
  mock.method(presenceModel, 'marquerPresence', async () => {});
}

// Petite image PNG envoyée en multipart (champ "image")
function formulaireImage() {
  const formData = new FormData();
  formData.append('image', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' }), 'logo.png');
  return formData;
}

async function appel(methode, chemin, { token, body } = {}) {
  const res = await fetch(`${baseUrl}${chemin}`, {
    method: methode,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
  return { status: res.status, body: await res.json() };
}

test('GET /public/logo : lisible sans connexion', async () => {
  mock.method(parametreModel, 'getParametre', async () => 'vitrine/logo.png');
  const res = await appel('GET', '/public/logo');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, { logo: 'vitrine/logo.png' });
});

test("PUT /parametres/logo : refusé à l'accueil", async () => {
  sessionActive();
  const set = mock.method(parametreModel, 'setParametre', async () => {});
  const res = await appel('PUT', '/parametres/logo', { token: accueil, body: formulaireImage() });
  assert.equal(res.status, 403);
  assert.equal(set.mock.callCount(), 0);
});

test('PUT /parametres/logo : le Super Admin remplace le logo pour tout le monde', async () => {
  sessionActive();
  mock.method(parametreModel, 'getParametre', async () => null);
  const set = mock.method(parametreModel, 'setParametre', async () => {});

  const res = await appel('PUT', '/parametres/logo', { token: admin, body: formulaireImage() });

  assert.equal(res.status, 200);
  assert.match(res.body.logo, /^vitrine\//);
  assert.deepEqual(set.mock.calls[0].arguments, ['logo', res.body.logo]);
  await fs.unlink(path.join(__dirname, '..', 'uploads', res.body.logo)).catch(() => {});
});

test('DELETE /parametres/logo : retour au logo par défaut', async () => {
  sessionActive();
  mock.method(parametreModel, 'getParametre', async () => null);
  const set = mock.method(parametreModel, 'setParametre', async () => {});

  const res = await appel('DELETE', '/parametres/logo', { token: admin });

  assert.equal(res.status, 200);
  assert.deepEqual(set.mock.calls[0].arguments, ['logo', null]);
});
