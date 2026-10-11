require('./setup');
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../app');
const userModel = require('../models/userModel');
const paiementModel = require('../models/paiementModel');
const notifService = require('../services/notifService');
const assistanceModel = require('../models/assistanceModel');
const classementModel = require('../models/classementModel');
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

// Par défaut toutes les sessions sont actives ; un test peut surcharger ce comportement.
afterEach(() => mock.restoreAll());

function tokenPour(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const etudiant = tokenPour({ id: 10, role: ROLES.ETUDIANT, id_etudiant: 7 });
const accueil = tokenPour({ id: 2, role: ROLES.ACCUEIL });
const admin = tokenPour({ id: 1, role: ROLES.SUPER_ADMIN });
const formateur = tokenPour({ id: 3, role: ROLES.FORMATEUR });

function sessionActive() {
  mock.method(userModel, 'findActiveSession', async () => ({ id_session: 1 }));
  mock.method(presenceModel, 'marquerPresence', async () => {});
}

async function appel(methode, chemin, { token, body } = {}) {
  const res = await fetch(`${baseUrl}${chemin}`, {
    method: methode,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

test('sans token : 401 au format JSON standard', async () => {
  const res = await appel('GET', '/paiements');
  assert.equal(res.status, 401);
  assert.equal(res.body.status, 'error');
});

test('un token valide mais dont la session est révoquée (logout) est refusé', async () => {
  mock.method(userModel, 'findActiveSession', async () => null);
  const res = await appel('GET', '/notifications', { token: accueil });
  assert.equal(res.status, 401);
});

test("un étudiant ne peut pas modifier le compte d'un autre utilisateur", async () => {
  sessionActive();
  const updateUser = mock.method(userModel, 'updateUser', async () => true);

  const res = await appel('PUT', '/utilisateurs/1', { token: etudiant, body: { id_role: 1 } });

  assert.equal(res.status, 403);
  assert.equal(updateUser.mock.callCount(), 0);
});

test('un étudiant qui modifie son profil ne peut pas changer son rôle ni son mot de passe', async () => {
  sessionActive();
  const updateUser = mock.method(userModel, 'updateUser', async () => true);

  const res = await appel('PUT', '/utilisateurs/10', {
    token: etudiant,
    body: { nom: 'Rakoto', id_role: 1, mot_de_passe: 'pirate123' },
  });

  assert.equal(res.status, 200);
  const [, donnees] = updateUser.mock.calls[0].arguments;
  assert.equal(donnees.nom, 'Rakoto');
  assert.equal(donnees.id_role, undefined);
  assert.equal(donnees.mot_de_passe_hash, undefined);
});

test('le Super Admin peut changer le rôle d\'un utilisateur', async () => {
  sessionActive();
  const updateUser = mock.method(userModel, 'updateUser', async () => true);

  const res = await appel('PUT', '/utilisateurs/10', { token: admin, body: { id_role: 2 } });

  assert.equal(res.status, 200);
  assert.equal(updateUser.mock.calls[0].arguments[1].id_role, 2);
});

test("un étudiant ne peut pas consulter le tableau de paiement d'un autre étudiant", async () => {
  sessionActive();
  const res = await appel('GET', '/etudiants/8/dashboard-paiement', { token: etudiant });
  assert.equal(res.status, 403);
});

test("un étudiant ne peut pas valider un paiement", async () => {
  sessionActive();
  const res = await appel('PUT', '/paiements/3/valider', { token: etudiant });
  assert.equal(res.status, 403);
});

test("l'accueil valide un paiement en attente", async () => {
  sessionActive();
  mock.method(paiementModel, 'getPaiementById', async () => ({ id_paiement: 3, statut: 'en_attente' }));
  mock.method(paiementModel, 'changerStatutPaiementEnAttente', async () => true);
  mock.method(notifService, 'notifierInApp', async () => {});

  const res = await appel('PUT', '/paiements/3/valider', { token: accueil });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.statut, 'valide');
});

test('champ obligatoire manquant : 400 avec un message explicite', async () => {
  sessionActive();
  const res = await appel('POST', '/paiements', { token: accueil, body: { id_echeance: 1 } });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /id_mode_paiement/);
});

test("la liste des sessions ne renvoie jamais les tokens", async () => {
  sessionActive();
  mock.method(userModel, 'findSessionsByUser', async () => [
    { id_session: 1, user_agent: 'Firefox', ip: '::1', actif: 1, est_courante: 1 },
  ]);

  const res = await appel('GET', '/auth/sessions', { token: accueil });

  assert.equal(res.status, 200);
  assert.equal(res.body.sessions[0].token, undefined);
  assert.equal(res.body.sessions[0].est_courante, true);
});

test('une erreur inattendue renvoie 500 sans divulguer son détail', async () => {
  sessionActive();
  mock.method(paiementModel, 'getAllPaiements', async () => {
    throw new Error("ER_BAD_FIELD_ERROR: Unknown column 'secret'");
  });
  mock.method(console, 'error', () => {}); // évite de polluer la sortie des tests

  const res = await appel('GET', '/paiements', { token: accueil });

  assert.equal(res.status, 500);
  assert.equal(res.body.message, 'Erreur serveur.');
});

// ─── Assistance ─────────────────────────────

test("un étudiant envoie une demande d'assistance et l'accueil est prévenu", async () => {
  sessionActive();
  const inserer = mock.method(assistanceModel, 'insertAssistance', async () => 12);
  mock.method(assistanceModel, 'getAssistanceById', async () => ({
    id_assistance: 12, objet: 'Accès', statut: 'En attente', etudiant_prenom: 'Rova', etudiant_nom: 'Rakoto',
  }));
  const notifier = mock.method(notifService, 'notifierPersonnel', async () => 1);

  const res = await appel('POST', '/assistances', { token: etudiant, body: { objet: 'Accès', contenu: 'Je ne vois pas mes supports' } });

  assert.equal(res.status, 201);
  assert.equal(inserer.mock.calls[0].arguments[0].id_etudiant, 7, "l'id_etudiant vient du token");
  assert.match(notifier.mock.calls[0].arguments[0], /Rova Rakoto a envoyé une demande d'assistance/);
});

test("un étudiant ne peut pas résoudre une demande", async () => {
  sessionActive();
  const res = await appel('PUT', '/assistances/12/resoudre', { token: etudiant });
  assert.equal(res.status, 403);
});

test("l'accueil résout une demande en attente et l'étudiant est notifié", async () => {
  sessionActive();
  const demande = { id_assistance: 12, objet: 'Accès', statut: 'En attente', id_utilisateur_etudiant: 10 };
  mock.method(assistanceModel, 'getAssistanceById', async () => demande);
  const resoudre = mock.method(assistanceModel, 'resoudreAssistance', async () => true);
  const notifier = mock.method(notifService, 'notifierInApp', async () => {});

  const res = await appel('PUT', '/assistances/12/resoudre', { token: accueil });

  assert.equal(res.status, 200);
  assert.deepEqual(resoudre.mock.calls[0].arguments, ['12', 2]);
  assert.equal(notifier.mock.calls[0].arguments[0], 10);
});

test('une demande déjà résolue ne peut pas être résolue à nouveau', async () => {
  sessionActive();
  mock.method(assistanceModel, 'getAssistanceById', async () => ({ id_assistance: 12, statut: 'Résolu' }));
  const res = await appel('PUT', '/assistances/12/resoudre', { token: accueil });
  assert.equal(res.status, 409);
});

test("un étudiant ne liste que ses propres demandes", async () => {
  sessionActive();
  const lister = mock.method(assistanceModel, 'getAssistances', async () => []);
  await appel('GET', '/assistances', { token: etudiant });
  assert.equal(lister.mock.calls[0].arguments[0].id_etudiant, 7);
});

// ─── Notes d'attestation ────────────────────

test("un formateur ne peut pas noter un étudiant d'une formation qui n'est pas la sienne", async () => {
  sessionActive();
  mock.method(classementModel, 'getInscriptionAvecFormateur', async () => ({ id_inscription: 5, id_formateur: 99 }));
  const setNote = mock.method(classementModel, 'setNotePresentation', async () => {});

  const res = await appel('PUT', '/inscriptions/5/note', { token: formateur, body: { note_presentation: 8 } });

  assert.equal(res.status, 403);
  assert.equal(setNote.mock.callCount(), 0);
});

test('le formateur de la formation note la présentation (sur 10 au maximum)', async () => {
  sessionActive();
  mock.method(classementModel, 'getInscriptionAvecFormateur', async () => ({ id_inscription: 5, id_formateur: 3 }));
  const setNote = mock.method(classementModel, 'setNotePresentation', async () => {});

  const invalide = await appel('PUT', '/inscriptions/5/note', { token: formateur, body: { note_presentation: 11 } });
  assert.equal(invalide.status, 400);
  assert.match(invalide.body.message, /10 au maximum/);

  const ok = await appel('PUT', '/inscriptions/5/note', { token: formateur, body: { note_presentation: '7,5' } });
  assert.equal(ok.status, 200);
  assert.deepEqual(setNote.mock.calls[0].arguments, ['5', 7.5]);
});

test("une requête d'étudiant le marque présent ; pas celle du personnel", async () => {
  sessionActive();
  const presence = presenceModel.marquerPresence;
  // Routes refusées (403) juste après l'authentification : aucune requête SQL
  await appel('PUT', '/inscriptions/5/note', { token: accueil, body: {} });
  assert.equal(presence.mock.callCount(), 0);
  await appel('GET', '/etudiants/999/dashboard-paiement', { token: etudiant });
  assert.deepEqual(presence.mock.calls[0].arguments, [10]);
});

test("l'accueil ne peut pas noter la présentation", async () => {
  sessionActive();
  const res = await appel('PUT', '/inscriptions/5/note', { token: accueil, body: { note_presentation: 8 } });
  assert.equal(res.status, 403);
});

// ─── Avis sur les formateurs ────────────────

test("un étudiant ou un formateur ne voit pas l'avis sur les formateurs", async () => {
  sessionActive();
  assert.equal((await appel('GET', '/formateurs/avis', { token: etudiant })).status, 403);
  assert.equal((await appel('GET', '/formateurs/avis', { token: formateur })).status, 403);
});
