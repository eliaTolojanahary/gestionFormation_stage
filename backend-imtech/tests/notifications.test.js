require('./setup');
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../app');
const userModel = require('../models/userModel');
const notifModel = require('../models/notifModel');
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

const etudiant = jwt.sign({ id: 10, role: ROLES.ETUDIANT, id_etudiant: 7 }, process.env.JWT_SECRET, { expiresIn: '1h' });

function sessionActive() {
  mock.method(userModel, 'findActiveSession', async () => ({ id_session: 1 }));
  mock.method(presenceModel, 'marquerPresence', async () => {});
}

// Simule la base : `nb` notifications, ids décroissants à partir de `nb`
function notifsSimulees(nb) {
  return Array.from({ length: nb }, (_, i) => ({ id_notification: nb - i, message: 'x', lu: 0 }));
}

async function appel(methode, chemin) {
  const res = await fetch(`${baseUrl}${chemin}`, {
    method: methode,
    headers: { Authorization: `Bearer ${etudiant}` },
  });
  return { status: res.status, body: await res.json() };
}

test('GET /notifications?limite=2 : une page, encorePlus et les totaux', async () => {
  sessionActive();
  const find = mock.method(notifModel, 'notifFindByUtilisateur', async () => notifsSimulees(3));
  mock.method(notifModel, 'countByUtilisateur', async () => ({ total: 5, nonLues: 2 }));

  const res = await appel('GET', '/notifications?limite=2&avant=9');

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 2);
  assert.deepEqual(res.body.meta, { encorePlus: true, total: 5, nonLues: 2 });
  // Une ligne de plus que la limite est demandée pour savoir s'il en reste
  const [idUtilisateur, options] = find.mock.calls[0].arguments;
  assert.equal(idUtilisateur, 10);
  assert.equal(options.limite, 3);
  assert.equal(options.avant, 9);
});

test('GET /notifications?apres=… : seulement les nouvelles, sans limite', async () => {
  sessionActive();
  const find = mock.method(notifModel, 'notifFindByUtilisateur', async () => notifsSimulees(1));
  mock.method(notifModel, 'countByUtilisateur', async () => ({ total: 1, nonLues: 1 }));

  const res = await appel('GET', '/notifications?apres=4&nonLues=1');

  assert.equal(res.status, 200);
  assert.equal(res.body.meta.encorePlus, false);
  const options = find.mock.calls[0].arguments[1];
  assert.equal(options.apres, 4);
  assert.equal(options.nonLues, true);
  assert.equal(options.limite, undefined);
});

test('GET /notifications sans paramètre : toute la liste', async () => {
  sessionActive();
  const find = mock.method(notifModel, 'notifFindByUtilisateur', async () => notifsSimulees(30));
  mock.method(notifModel, 'countByUtilisateur', async () => ({ total: 30, nonLues: 0 }));

  const res = await appel('GET', '/notifications');

  assert.equal(res.body.data.length, 30);
  assert.equal(find.mock.calls[0].arguments[1].limite, undefined);
});

test('GET /notifications?limite=abc : 400', async () => {
  sessionActive();
  const res = await appel('GET', '/notifications?limite=abc');
  assert.equal(res.status, 400);
});

test('GET /notifications/compteur et PUT /notifications/lu-tout : limités à ses propres notifications', async () => {
  sessionActive();
  mock.method(notifModel, 'countByUtilisateur', async () => ({ total: 4, nonLues: 1 }));
  const toutLu = mock.method(notifModel, 'updateToutLu', async () => 1);

  const compteur = await appel('GET', '/notifications/compteur');
  assert.deepEqual(compteur.body.data, { total: 4, nonLues: 1 });

  const res = await appel('PUT', '/notifications/lu-tout');
  assert.equal(res.status, 200);
  assert.deepEqual(toutLu.mock.calls[0].arguments, [10]);
});
