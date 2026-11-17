require('./setup');
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

const app = require('../app');
const userModel = require('../models/userModel');
const fichierModel = require('../models/fichierModel');
const presenceModel = require('../models/presenceModel');
const supportModel = require('../models/supportModel');
const { ROLES } = require('../config/roles');

let server;
let baseUrl;

// Fichiers de test créés dans les vrais dossiers d'upload, supprimés à la fin
const UPLOADS = path.join(__dirname, '..', 'uploads');
const PDF_SUPPORT = `test-${Date.now()}-cours.pdf`;
const PNG_SUPPORT = `test-${Date.now()}-schema.png`;
const DOC_ADMIN = `test-${Date.now()}-reglement.pdf`;
const JPG_COUVERTURE = `test-${Date.now()}-couverture.jpg`;
const crees = [];

async function creerPdf() {
  const pdf = await PDFDocument.create();
  pdf.addPage([595, 842]);
  return Buffer.from(await pdf.save());
}

function ecrire(dossier, nom, contenu) {
  const chemin = path.join(UPLOADS, dossier, nom);
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  fs.writeFileSync(chemin, contenu);
  crees.push(chemin);
}

before(async () => {
  ecrire('supports', PDF_SUPPORT, await creerPdf());
  ecrire('supports', PNG_SUPPORT, await sharp({
    create: { width: 400, height: 300, channels: 3, background: '#ffffff' },
  }).png().toBuffer());
  ecrire('documents', DOC_ADMIN, await creerPdf());
  ecrire('formations', JPG_COUVERTURE, await sharp({
    create: { width: 80, height: 100, channels: 3, background: '#072e4c' },
  }).jpeg().toBuffer());

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => {
  server.closeAllConnections();
  server.close();
  crees.forEach((chemin) => fs.rmSync(chemin, { force: true }));
});

afterEach(() => mock.restoreAll());

function tokenPour(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const etudiant = tokenPour({ id: 10, role: ROLES.ETUDIANT, id_etudiant: 7 });
const accueil = tokenPour({ id: 2, role: ROLES.ACCUEIL });
const formateur = tokenPour({ id: 3, role: ROLES.FORMATEUR });

function sessionActive() {
  mock.method(userModel, 'findActiveSession', async () => ({ id_session: 1 }));
  mock.method(presenceModel, 'marquerPresence', async () => {});
  mock.method(userModel, 'findUserById', async (id) => ({
    id_utilisateur: id, nom: 'Rakoto', prenom: 'Jean', email: 'jean@imtech.mg',
  }));
}

function get(chemin, token) {
  return fetch(`${baseUrl}${chemin}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
}

test("un fichier n'est plus accessible sans être connecté", async () => {
  const res = await get(`/supports/${PDF_SUPPORT}`);
  assert.equal(res.status, 401);
});

test("un étudiant ne peut pas ouvrir le support d'une formation où il n'est pas inscrit", async () => {
  sessionActive();
  mock.method(fichierModel, 'etudiantPeutVoirSupport', async () => false);

  const res = await get(`/supports/${PDF_SUPPORT}`, etudiant);
  assert.equal(res.status, 403);
});

test('un étudiant inscrit reçoit le PDF filigrané, sans cache', async () => {
  sessionActive();
  const verif = mock.method(fichierModel, 'etudiantPeutVoirSupport', async () => true);

  const res = await get(`/supports/${PDF_SUPPORT}`, etudiant);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/pdf/);
  assert.match(res.headers.get('cache-control'), /no-store/);
  assert.deepEqual(verif.mock.calls[0].arguments, [`supports/${PDF_SUPPORT}`, 7]);
  // Ouvrir le fichier d'un support compte comme présence (middlewares/presence.js)
  assert.deepEqual(presenceModel.marquerPresence.mock.calls.map((c) => c.arguments), [[10]]);

  const original = fs.readFileSync(path.join(UPLOADS, 'supports', PDF_SUPPORT));
  const recu = Buffer.from(await res.arrayBuffer());
  assert.ok(recu.length > original.length, 'le PDF servi doit contenir le filigrane');
  await PDFDocument.load(recu); // toujours un PDF valide
});

test("le token peut être passé dans l'URL (lien, <img>, WebView)", async () => {
  sessionActive();
  const res = await fetch(`${baseUrl}/supports/${PNG_SUPPORT}?token=${accueil}`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /image\/png/);

  // L'image filigranée garde ses dimensions
  const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
  assert.equal(meta.width, 400);
  assert.equal(meta.height, 300);
});

test('les documents administratifs sont refusés aux étudiants', async () => {
  sessionActive();
  assert.equal((await get(`/documents/${DOC_ADMIN}`, etudiant)).status, 403);
  assert.equal((await get(`/documents/${DOC_ADMIN}`, formateur)).status, 200);
  // Ni un accès refusé, ni un document qui n'est pas un cours ne comptent comme présence
  assert.equal(presenceModel.marquerPresence.mock.callCount(), 0);
});

test("les routes de l'API sous le même préfixe fonctionnent toujours", async () => {
  sessionActive();
  mock.method(supportModel, 'getSupportById', async () => ({ id_support: 5, titre: 'Cours 1' }));

  const res = await get('/supports/5', accueil);
  assert.equal(res.status, 200);
});

test('impossible de sortir du dossier avec ../', async () => {
  sessionActive();
  // Ce n'est pas un fichier du dossier : la requête part vers la route GET /supports/:id
  mock.method(supportModel, 'getSupportById', async () => null);
  const res = await get(`/supports/..%2Fdocuments%2F${DOC_ADMIN}`, etudiant);
  assert.equal(res.status, 404);
});

test("un support qui n'est ni un PDF, ni une image, ni un audio / une vidéo est refusé à l'upload", async () => {
  sessionActive();
  const form = new FormData();
  form.append('id_formation', '1');
  form.append('fichier', new Blob(['contenu'], { type: 'application/msword' }), 'cours.doc');

  const res = await fetch(`${baseUrl}/supports`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${formateur}` },
    body: form,
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /PDF, une image, un audio/);
});

test('couverture de formation : publique (vitrine sans connexion), sans filigrane', async () => {
  const res = await get(`/formations/${JPG_COUVERTURE}`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /image\/jpeg/);
  const original = fs.readFileSync(path.join(UPLOADS, 'formations', JPG_COUVERTURE));
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), original);
});

test('les routes /formations/:id restent protégées malgré le dossier public', async () => {
  const res = await get('/formations/1');
  assert.equal(res.status, 401);
});

// POST /supports avec plusieurs fichiers (champ « fichier » répété)
const formationModel = require('../models/formationModel');
const supportProgrammeService = require('../services/supportProgrammeService');

function envoyerSupport(fichiers, token = formateur) {
  const form = new FormData();
  form.append('id_formation', '4');
  form.append('titre', 'Chapitre 3');
  fichiers.forEach((nom) => form.append('fichier', new Blob([Buffer.from('%PDF-1.4 test')], { type: 'application/pdf' }), nom));
  return fetch(`${baseUrl}/supports`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
}

function fichiersRecus(creation) {
  return creation.mock.calls.map((c) => path.join(UPLOADS, c.arguments[0].fichier));
}

test('un formateur publie 3 fichiers en une fois : 3 supports créés', async () => {
  sessionActive();
  mock.method(formationModel, 'getFormationById', async () => ({ id_formation: 4, id_utilisateur: 3, nom: 'React' }));
  mock.method(supportProgrammeService, 'notifierSupportEnvoye', async () => {});
  let id = 100;
  const creation = mock.method(supportModel, 'createSupport', async () => id++);

  const res = await envoyerSupport(['partie-1.pdf', 'partie-2.pdf', 'partie-3.pdf']);
  const corps = await res.json();
  const chemins = fichiersRecus(creation);
  crees.push(...chemins);

  assert.equal(res.status, 201);
  assert.deepEqual(corps.ids, [100, 101, 102]);
  assert.deepEqual(
    creation.mock.calls.map((c) => c.arguments[0].titre),
    ['Chapitre 3 — partie-1.pdf', 'Chapitre 3 — partie-2.pdf', 'Chapitre 3 — partie-3.pdf']
  );
  assert.ok(chemins.every((c) => fs.existsSync(c)), 'les fichiers sont enregistrés dans uploads/supports');
});

test("plus de 10 fichiers : refusé (400), rien n'est créé", async () => {
  sessionActive();
  const creation = mock.method(supportModel, 'createSupport', async () => 1);

  const res = await envoyerSupport(Array.from({ length: 11 }, (_, i) => `p${i}.pdf`));
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /Trop de fichiers/);
  assert.equal(creation.mock.callCount(), 0);
});

test("formation d'un autre formateur : refusé (403) et fichiers reçus supprimés du disque", async () => {
  sessionActive();
  mock.method(formationModel, 'getFormationById', async () => ({ id_formation: 4, id_utilisateur: 99, nom: 'React' }));
  const avant = new Set(fs.readdirSync(path.join(UPLOADS, 'supports')));

  const res = await envoyerSupport(['intrus-1.pdf', 'intrus-2.pdf']);
  assert.equal(res.status, 403);
  const nouveaux = fs.readdirSync(path.join(UPLOADS, 'supports')).filter((n) => !avant.has(n));
  assert.deepEqual(nouveaux, []);
});
