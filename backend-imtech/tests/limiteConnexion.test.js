require('./setup');
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../app');
const authService = require('../services/authService');
const userService = require('../services/userService');

let server;
let baseUrl;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());
afterEach(() => mock.restoreAll());

const post = (chemin, body) => fetch(`${baseUrl}${chemin}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const connexion = (email, mot_de_passe = 'mauvais') => post('/auth/login', { email, mot_de_passe });

// Les tests partagent les compteurs (même serveur) : chacun utilise ses propres adresses e-mail

test('connexion : 5 mauvais mots de passe pour un compte, puis 429', async () => {
  mock.method(authService, 'authentifier', async () => null);
  for (let i = 0; i < 5; i++) assert.equal((await connexion('cible@test.mg')).status, 401);
  const bloque = await connexion('cible@test.mg');
  assert.equal(bloque.status, 429);
  assert.match((await bloque.json()).message, /15 minutes/);
  // Majuscules / espaces : même compte
  assert.equal((await connexion('  CIBLE@test.mg ')).status, 429);
  // Un autre compte depuis la même adresse reste possible
  assert.equal((await connexion('autre@test.mg')).status, 401);
});

test('connexion : une réussite remet le compteur du compte à zéro', async () => {
  let reussir = false;
  mock.method(authService, 'authentifier', async () => (reussir ? { token: 't', user: {} } : null));
  for (let i = 0; i < 4; i++) assert.equal((await connexion('oubli@test.mg')).status, 401);
  reussir = true;
  assert.equal((await connexion('oubli@test.mg', 'bon')).status, 200);
  reussir = false;
  for (let i = 0; i < 5; i++) assert.equal((await connexion('oubli@test.mg')).status, 401);
  assert.equal((await connexion('oubli@test.mg')).status, 429);
});

test('connexion : au-delà de 20 échecs depuis une adresse IP, tous les comptes sont bloqués', async () => {
  mock.method(authService, 'authentifier', async () => null);
  // Les 2 tests précédents ont déjà compté des échecs pour cette IP : on complète jusqu'au blocage
  let statut = 401;
  for (let i = 0; i < 40 && statut !== 429; i++) {
    statut = (await connexion(`compte${i}@test.mg`)).status;
  }
  assert.equal(statut, 429);
  assert.equal((await connexion('jamais-essaye@test.mg')).status, 429);
});

test('mot de passe oublié : 5 demandes par heure, puis 429', async () => {
  mock.method(userService, 'demanderReinitialisation', async () => null);
  for (let i = 0; i < 5; i++) {
    assert.notEqual((await post('/auth/forgot-password', { email: `x${i}@test.mg` })).status, 429);
  }
  assert.equal((await post('/auth/forgot-password', { email: 'x@test.mg' })).status, 429);
});
