require('./setup');
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../app');
const documentModel = require('../models/documentModel');
const { nomEtudiant } = require('../utils/pageVerification');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => server.close());
afterEach(() => mock.restoreAll());

const UUID = '0748eb17-5207-4d87-be55-ed3a806db250';
const NAVIGATEUR = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';

function attestationTrouvee(champs = {}) {
  mock.method(documentModel, 'findAttestationParUuid', async () => [{
    prenom: 'paul', nom: 'Rakotomalala', formation_nom: 'Bureautique', duree: '1 mois',
    date_delivrance: new Date(2026, 10, 9, 10, 0), ...champs,
  }]);
}

const verifier = (accept) => fetch(`${baseUrl}/verification/${UUID}`, { headers: accept ? { Accept: accept } : {} });

test('QR code scanné (navigateur) : page « Attestation authentique » avec le nom, la formation et la date', async () => {
  attestationTrouvee();
  const res = await verifier(NAVIGATEUR);
  const html = await res.text();

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(html, /Attestation authentique/);
  assert.match(html, /Paul RAKOTOMALALA/);
  assert.match(html, /Bureautique/);
  assert.match(html, /9 novembre 2026/);
  assert.match(html, new RegExp(UUID));
});

test('appel sans navigateur : JSON, avec le nom de l\'étudiant', async () => {
  attestationTrouvee();
  const res = await verifier();
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.message, 'Document authentique');
  assert.equal(body.etudiant, 'paul Rakotomalala');
  assert.equal(body.formation, 'Bureautique');
});

test('QR code inconnu : page « Document non reconnu » (404) au navigateur, erreur JSON sinon', async () => {
  mock.method(documentModel, 'findAttestationParUuid', async () => []);

  const page = await verifier(NAVIGATEUR);
  assert.equal(page.status, 404);
  assert.match(await page.text(), /Document non reconnu/);

  const json = await verifier();
  assert.equal(json.status, 404);
  assert.equal((await json.json()).status, 'error');
});

test('les noms venant de la base sont échappés dans la page', async () => {
  attestationTrouvee({ nom: '<script>alert(1)</script>', formation_nom: 'Web & "Design"' });
  const html = await (await verifier(NAVIGATEUR)).text();

  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;SCRIPT&gt;/);
  assert.match(html, /Web &amp; &quot;Design&quot;/);
});

test('nom affiché comme sur l\'attestation : Prénom NOM', () => {
  assert.equal(nomEtudiant('jean-marc', 'rabe'), 'Jean-Marc RABE');
  assert.equal(nomEtudiant('ÉLIA', 'nantenaina'), 'Élia NANTENAINA');
});
