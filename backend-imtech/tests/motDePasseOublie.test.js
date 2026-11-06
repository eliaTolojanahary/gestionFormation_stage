require('./setup');
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../app');
const userModel = require('../models/userModel');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => server.close());

afterEach(() => mock.restoreAll());

async function reinitialiser(token) {
  const res = await fetch(`${baseUrl}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, nouveau_mot_de_passe: 'NouveauMdp123' }),
  });
  return { status: res.status, body: await res.json() };
}

// Simule la base : le code renvoyé par findResetToken, et les écritures
function base(ligne) {
  const find = mock.method(userModel, 'findResetToken', async () => ligne);
  const update = mock.method(userModel, 'updatePasswordHash', async () => true);
  mock.method(userModel, 'marquerTokenUtilise', async () => {});
  mock.method(userModel, 'deactivateAllSessions', async () => {});
  return { find, update };
}

test('code valide collé avec des espaces : mot de passe changé', async () => {
  const { find, update } = base({ id_reset: 1, id_utilisateur: 4, utilise: 0, expire: 0 });

  const res = await reinitialiser('  abc123\n');

  assert.equal(res.status, 200);
  assert.deepEqual(find.mock.calls[0].arguments, ['abc123']);
  assert.equal(update.mock.callCount(), 1);
});

test('code inconnu : « incorrect », pas « expiré »', async () => {
  const { update } = base(undefined);
  const res = await reinitialiser('faux');
  assert.equal(res.status, 400);
  assert.match(res.body.message, /incorrect/);
  assert.equal(update.mock.callCount(), 0);
});

test('code déjà utilisé', async () => {
  base({ id_reset: 1, id_utilisateur: 4, utilise: 1, expire: 0 });
  const res = await reinitialiser('abc123');
  assert.equal(res.status, 400);
  assert.match(res.body.message, /déjà été utilisé/);
});

test('code expiré', async () => {
  base({ id_reset: 1, id_utilisateur: 4, utilise: 0, expire: 1 });
  const res = await reinitialiser('abc123');
  assert.equal(res.status, 400);
  assert.match(res.body.message, /expiré/);
});
