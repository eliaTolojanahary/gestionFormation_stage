require('./setup');
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../app');
const db = require('../config/db');
const userModel = require('../models/userModel');
const etudiantModel = require('../models/etudiantModel');
const presenceModel = require('../models/presenceModel');
const notifService = require('../services/notifService');
const etudiantService = require('../services/etudiantService');
const { piecesManquantes, etatDossier } = require('../config/dossier');
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

const token = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
const etudiant = token({ id: 10, role: ROLES.ETUDIANT, id_etudiant: 7 });
const accueil = token({ id: 2, role: ROLES.ACCUEIL });

function sessionActive() {
  mock.method(userModel, 'findActiveSession', async () => ({ id_session: 1 }));
  mock.method(presenceModel, 'marquerPresence', async () => {});
}

// Fausse connexion pour avecTransaction (aucune requête SQL réelle)
function simulerTransaction() {
  const connexion = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    query: async () => [[]],
  };
  mock.method(db, 'getConnection', async () => connexion);
}

const COMPLET = {
  photo_1: 'etudiants/p1.jpg', photo_2: 'etudiants/p2.jpg',
  photocopie_cin: 'etudiants/cin.pdf', certificat_residence: 'etudiants/cr.jpg',
};

test('dossier : 4 pièces obligatoires, les manquantes sont listées', () => {
  assert.deepEqual(piecesManquantes(COMPLET), []);
  assert.deepEqual(piecesManquantes({ photo_1: 'etudiants/p1.jpg' }), [
    "Photo d'identité n°2", 'Photocopie de la CIN', 'Certificat de résidence',
  ]);
  const dossier = etatDossier({ photo_1: 'etudiants/p1.jpg', photo_2: '' });
  assert.equal(dossier.fournies, 1);
  assert.equal(dossier.complet, false);
});

test('dépôt d\'une pièce manquante et remplacement d\'une autre : enregistrées, Accueil notifié', async () => {
  simulerTransaction();
  mock.method(etudiantModel, 'getEtudiantById', async () => ({
    prenom: 'Lova', nom: 'Rabe', photo_1: 'etudiants/ancienne.jpg', photo_2: 'etudiants/p2.jpg', photocopie_cin: 'etudiants/cin.pdf',
  }));
  const modifier = mock.method(etudiantModel, 'updateEtudiant', async () => true);
  const notif = mock.method(notifService, 'notifierPersonnel', async () => 2);

  const dossier = await etudiantService.deposerPieces(7, {
    photo_1: 'etudiants/nouvelle.jpg', certificat_residence: 'etudiants/cr.jpg',
  });

  assert.equal(modifier.mock.calls[0].arguments[2].photo_1, 'etudiants/nouvelle.jpg');
  assert.equal(dossier.complet, true);
  const message = notif.mock.calls[0].arguments[0];
  assert.match(message, /Lova Rabe a déposé : Certificat de résidence/);
  assert.match(message, /a remplacé : Photo d'identité n°1/);
  assert.match(message, /Dossier complet/);
});

test('dépôt sans aucun fichier : 400', async () => {
  await assert.rejects(etudiantService.deposerPieces(7, {}), { status: 400 });
});

test('Mon dossier : réservé à l\'étudiant connecté, qui ne voit que le sien', async () => {
  sessionActive();
  const lire = mock.method(etudiantModel, 'getEtudiantById', async () => ({ ...COMPLET, photo_2: null }));

  const res = await fetch(`${baseUrl}/mon-dossier`, { headers: { Authorization: `Bearer ${etudiant}` } });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(lire.mock.calls[0].arguments[0], 7); // id_etudiant du token, jamais un paramètre
  assert.equal(body.data.fournies, 3);
  assert.equal(body.data.complet, false);

  const refus = await fetch(`${baseUrl}/mon-dossier`, { headers: { Authorization: `Bearer ${accueil}` } });
  assert.equal(refus.status, 403);
  const sansToken = await fetch(`${baseUrl}/mon-dossier`);
  assert.equal(sansToken.status, 401);
});

test('Mon dossier : un autre format qu\'une photo ou un PDF est refusé (400)', async () => {
  sessionActive();
  const form = new FormData();
  form.append('photocopie_cin', new Blob(['texte'], { type: 'text/plain' }), 'cin.txt');

  const res = await fetch(`${baseUrl}/mon-dossier`, {
    method: 'PUT', headers: { Authorization: `Bearer ${etudiant}` }, body: form,
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /photo .* ou un PDF/);
});
