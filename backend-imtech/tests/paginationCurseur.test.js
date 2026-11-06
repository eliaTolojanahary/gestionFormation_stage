require('./setup');
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../app');
const userModel = require('../models/userModel');
const presenceModel = require('../models/presenceModel');
const fichierModel = require('../models/fichierModel');
const supportModel = require('../models/supportModel');
const commentaireModel = require('../models/commentaireModel');
const { lireCurseur, clauseCurseur, reponseCurseur, LIMITE_MAX } = require('../utils/pagination');
const { ROLES } = require('../config/roles');

afterEach(() => mock.restoreAll());

// ─── Utilitaires ────────────────────────────

test('curseur : sans ?limite ni ?avant, la liste n\'est pas paginée', () => {
  assert.equal(lireCurseur({}), null);
  assert.equal(lireCurseur({ etat: 'tous' }), null);
});

test('curseur : limite bornée, avant invalide ignoré', () => {
  assert.deepEqual(lireCurseur({ limite: '5' }), { limite: 5, avant: null });
  assert.deepEqual(lireCurseur({ limite: '5', avant: '42' }), { limite: 5, avant: 42 });
  assert.equal(lireCurseur({ limite: '5000' }).limite, LIMITE_MAX);
  assert.equal(lireCurseur({ avant: 'abc' }).avant, null);
});

test('curseur : SQL lit une ligne de plus, et part de l\'élément `avant`', () => {
  const page = clauseCurseur({ limite: 5, avant: 9 }, { table: 'support', alias: 's', date: 'date_publication', id: 'id_support' });
  assert.match(page.where, /\(s\.date_publication, s\.id_support\) < \(SELECT date_publication, id_support FROM support WHERE id_support = \?\)/);
  assert.deepEqual(page.whereParams, [9]);
  assert.deepEqual(page.limiteParams, [6]);
  assert.equal(clauseCurseur(null, {}).limite, '');
});

test('curseur : la ligne en trop est retirée et donne l\'id suivant', () => {
  const curseur = { limite: 2, avant: null };
  const suite = reponseCurseur({ lignes: [{ id: 9 }, { id: 8 }, { id: 7 }], total: 3 }, curseur, 'id');
  assert.deepEqual(suite.data, [{ id: 9 }, { id: 8 }]);
  assert.deepEqual(suite.curseur, { limite: 2, suivant: 8, total: 3 });
  const fin = reponseCurseur({ lignes: [{ id: 6 }], total: 3 }, curseur, 'id');
  assert.equal(fin.curseur.suivant, null);
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

const formateur = jwt.sign({ id: 3, role: ROLES.FORMATEUR }, process.env.JWT_SECRET, { expiresIn: '1h' });
const etudiant = jwt.sign({ id: 10, role: ROLES.ETUDIANT, id_etudiant: 7 }, process.env.JWT_SECRET, { expiresIn: '1h' });

function session() {
  mock.method(userModel, 'findActiveSession', async () => ({ id_session: 1 }));
  mock.method(presenceModel, 'marquerPresence', async () => {});
}

async function get(chemin, token = formateur) {
  const res = await fetch(`${baseUrl}${chemin}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, body: await res.json() };
}

const principal = (id) => ({ id_commentaire: id, id_parent: null, date_commentaire: `2026-10-${10 + id}T10:00:00` });

test('GET /formations/:id/supports?limite=2 : une page, le total et le curseur suivant', async () => {
  session();
  const lister = mock.method(supportModel, 'getSupportsByFormation', async () => [{ id_support: 9 }, { id_support: 8 }, { id_support: 7 }]);
  mock.method(supportModel, 'compterSupportsByFormation', async () => 5);

  const { body } = await get('/formations/1/supports?limite=2&avant=10');
  assert.deepEqual(body.data.map((s) => s.id_support), [9, 8]);
  assert.deepEqual(body.curseur, { limite: 2, suivant: 8, total: 5 });
  assert.deepEqual(lister.mock.calls[0].arguments, ['1', 'actif', { limite: 2, avant: 10 }]);
});

test('GET /formations/:id/supports sans curseur : toute la liste, comme avant', async () => {
  session();
  mock.method(supportModel, 'getSupportsByFormation', async () => [{ id_support: 1 }, { id_support: 2 }]);
  const { body } = await get('/formations/1/supports');
  assert.equal(body.data.length, 2);
  assert.equal(body.curseur, undefined);
});

test('GET /formations/:id/commentaires?limite=2 : réponses chargées pour la page seulement', async () => {
  session();
  mock.method(commentaireModel, 'getCommentairesPrincipaux', async () => [principal(5), principal(4), principal(3)]);
  mock.method(commentaireModel, 'compterCommentaires', async () => ({ principaux: 3, echanges: 4 }));
  const reponses = mock.method(commentaireModel, 'getReponses', async () => [
    { id_commentaire: 6, id_parent: 4, date_commentaire: '2026-10-20T10:00:00' },
  ]);

  const { body } = await get('/formations/1/commentaires?limite=2');
  assert.deepEqual(body.data.map((c) => c.id_commentaire), [5, 4]);
  assert.equal(body.data[1].nb_reponses, 1);
  assert.deepEqual(body.curseur, { limite: 2, suivant: 4, total: 3 });
  assert.equal(body.total_echanges, 4);
  // Seulement les 2 commentaires affichés : pas la ligne lue en trop
  assert.deepEqual(reponses.mock.calls[0].arguments[0], [5, 4]);
});

test('GET /formations/:id/commentaires : refusé à un étudiant non inscrit', async () => {
  session();
  mock.method(fichierModel, 'inscriptionEtudiantFormation', async () => null);
  const { status } = await get('/formations/1/commentaires?limite=5', etudiant);
  assert.equal(status, 403);
});

test('GET /supports : un étudiant ne voit que ses formations, un formateur que les siennes', async () => {
  session();
  const lister = mock.method(supportModel, 'getSupports', async () => []);
  mock.method(supportModel, 'compterSupports', async () => 0);

  await get('/supports?page=1&limite=5&id_formateur=99', etudiant);
  assert.equal(lister.mock.calls[0].arguments[0].id_etudiant, 7);

  await get('/supports?page=1&limite=5&id_formateur=99');
  // Le formateur ne peut pas lire les supports d'un autre en changeant ?id_formateur=
  assert.equal(lister.mock.calls[1].arguments[0].id_formateur, 3);
});

test('GET /supports : filtres lus, valeurs inconnues ignorées, page et total renvoyés', async () => {
  session();
  const lister = mock.method(supportModel, 'getSupports', async () => [{ id_support: 1 }]);
  mock.method(supportModel, 'compterSupports', async () => 11);

  const { body } = await get('/supports?page=2&limite=5&recherche=%20html%20&type=pdf&tri=titre&id_formation=4');
  assert.deepEqual(lister.mock.calls[0].arguments, [
    { recherche: 'html', id_formation: 4, id_formateur: 3, type: 'pdf', tri: 'titre' },
    { page: 2, limite: 5, offset: 5 },
  ]);
  assert.deepEqual(body.pagination, { page: 2, limite: 5, total: 11, pages: 3 });

  await get('/supports?page=1&type=exe&tri=pirate');
  assert.equal(lister.mock.calls[1].arguments[0].type, undefined);
  assert.equal(lister.mock.calls[1].arguments[0].tri, 'recents');
});
