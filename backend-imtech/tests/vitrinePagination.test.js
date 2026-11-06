require('./setup');
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../app');
const db = require('../config/db');
const userModel = require('../models/userModel');
const presenceModel = require('../models/presenceModel');
const etudiantModel = require('../models/etudiantModel');
const echeanceModel = require('../models/echeanceModel');
const paiementModel = require('../models/paiementModel');
const inscriptionModel = require('../models/inscriptionModel');
const vitrineModel = require('../models/vitrineModel');
const reactionService = require('../services/reactionService');
const notifService = require('../services/notifService');
const inscriptionService = require('../services/inscriptionService');
const { inscriptionCompteExistant } = require('../services/vitrineService');
const { conflict } = require('../utils/errors');
const { ROLES } = require('../config/roles');

afterEach(() => mock.restoreAll());

// Fausse connexion pour avecTransaction : on retient si la transaction est validée ou annulée
function simulerTransaction() {
  const etat = { commit: 0, rollback: 0 };
  const connexion = {
    beginTransaction: async () => {},
    commit: async () => { etat.commit += 1; },
    rollback: async () => { etat.rollback += 1; },
    release: () => {},
    query: async () => [[]],
  };
  mock.method(db, 'getConnection', async () => connexion);
  return etat;
}

const DOSSIER_COMPLET = {
  photo_1: 'etudiants/p1.jpg', photo_2: 'etudiants/p2.jpg',
  photocopie_cin: 'etudiants/cin.pdf', certificat_residence: 'etudiants/cr.jpg',
};

function simulerEtudiant() {
  mock.method(etudiantModel, 'getEtudiantById', async () => ({
    id_etudiant: 7, id_utilisateur: 10, prenom: 'Andry', nom: 'Rakoto', email: 'andry@mail.mg', ...DOSSIER_COMPLET,
  }));
  mock.method(vitrineModel, 'modePaiementExiste', async () => true);
  mock.method(echeanceModel, 'getEcheancesByInscription', async (id) => [{ id_echeance: id * 10, montant_prevu: '40000.00' }]);
  mock.method(inscriptionModel, 'getInscriptionById', async (id) => ({ nom_formation: `Formation ${id}` }));
  mock.method(notifService, 'notifierEtudiant', async () => ({ emailEnvoye: true }));
  return mock.method(notifService, 'notifierPersonnel', async () => 2);
}

// ─── Inscription avec un compte existant ────

test('compte existant : une inscription « en ligne » par formation, sans créer de compte', async () => {
  simulerTransaction();
  const personnel = simulerEtudiant();
  const compte = mock.method(etudiantModel, 'insertUtilisateurEtEtudiant', async () => 99);
  let prochainId = 200;
  const inscrire = mock.method(inscriptionService, 'creerInscriptionDans', async () => prochainId++);
  const payer = mock.method(paiementModel, 'insererPaiement', async () => 1);

  const resultat = await inscriptionCompteExistant(7, {
    formations: [{ id_formation: 3, nombre_tranches: 2 }, { id_formation: 5 }], id_mode_paiement: 2,
  });

  assert.equal(compte.mock.callCount(), 0);
  assert.equal(inscrire.mock.callCount(), 2);
  assert.equal(inscrire.mock.calls[0].arguments[1].id_etudiant, 7);
  assert.equal(inscrire.mock.calls[0].arguments[1].origine, 'en_ligne');
  assert.equal(payer.mock.calls[1].arguments[0].statut, 'en_attente');
  assert.equal(resultat.total_premier_paiement, 80000);
  assert.match(personnel.mock.calls[0].arguments[0], /étudiant déjà inscrit/);
  assert.match(personnel.mock.calls[0].arguments[0], /Dossier complet/);
});

test('compte existant : déjà inscrit à une des formations → 409 et tout est annulé', async () => {
  const transaction = simulerTransaction();
  simulerEtudiant();
  let appel = 0;
  mock.method(inscriptionService, 'creerInscriptionDans', async () => {
    appel += 1;
    if (appel === 2) throw conflict('Cet étudiant est déjà inscrit à cette formation.');
    return 200;
  });
  mock.method(paiementModel, 'insererPaiement', async () => 1);

  await assert.rejects(
    inscriptionCompteExistant(7, { formations: [{ id_formation: 3 }, { id_formation: 5 }], id_mode_paiement: 2 }),
    { status: 409 }
  );
  assert.equal(transaction.rollback, 1);
  assert.equal(transaction.commit, 0);
});

test('compte existant : mode de paiement et formations requis', async () => {
  await assert.rejects(inscriptionCompteExistant(7, { formations: [{ id_formation: 3 }] }), /mode de paiement/);
  await assert.rejects(inscriptionCompteExistant(7, { formations: [], id_mode_paiement: 2 }), /au moins une formation/);
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

const etudiant = jwt.sign({ id: 10, role: ROLES.ETUDIANT, id_etudiant: 7 }, process.env.JWT_SECRET, { expiresIn: '1h' });

function session() {
  mock.method(userModel, 'findActiveSession', async () => ({ id_session: 1 }));
  mock.method(presenceModel, 'marquerPresence', async () => {});
}

async function appeler(chemin, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${baseUrl}${chemin}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

test('GET /public/formations?page=2 : 5 formations par défaut, sans connexion', async () => {
  const lister = mock.method(vitrineModel, 'getFormationsPubliques', async () => [{ id_formation: 6, id_formateur: 3, tarif: '1', nb_inscrits: 0 }]);
  mock.method(vitrineModel, 'compterFormationsPubliques', async () => 7);
  mock.method(reactionService, 'avisFormateurs', async () => []);

  const { status, body } = await appeler('/public/formations?page=2');
  assert.equal(status, 200);
  assert.deepEqual(lister.mock.calls[0].arguments, [{}, { page: 2, limite: 5, offset: 5 }]);
  assert.deepEqual(body.pagination, { page: 2, limite: 5, total: 7, pages: 2 });
  assert.equal(body.data[0].avis_formateur, reactionService.AVIS.PAS_ASSEZ);
});

test('GET /public/formateurs : seulement les compétents, découpés par page', async () => {
  const avis = [1, 2, 3, 4, 5, 6, 7].map((id) => ({
    id_utilisateur: id, nom: `N${id}`, prenom: `P${id}`, taux_positif: 90, total_reactions: 10,
    avis: id === 4 ? reactionService.AVIS.NON_COMPETENT : reactionService.AVIS.COMPETENT,
  }));
  mock.method(reactionService, 'avisFormateurs', async () => avis);
  const formations = mock.method(vitrineModel, 'getFormationsDesFormateurs', async () => [{ id_formateur: 7, nom: 'Excel' }]);

  const { body } = await appeler('/public/formateurs?page=2&limite=5');
  assert.equal(body.pagination.total, 6);
  assert.deepEqual(body.data.map((f) => f.id_formateur), [7]);
  assert.deepEqual(body.data[0].formations, ['Excel']);
  assert.deepEqual(formations.mock.calls[0].arguments[0], [7]);
});

test('formations disponibles : sans celles où l\'étudiant est déjà inscrit, et seulement pour lui', async () => {
  session();
  const lister = mock.method(vitrineModel, 'getFormationsPubliques', async () => []);
  mock.method(vitrineModel, 'compterFormationsPubliques', async () => 0);
  mock.method(reactionService, 'avisFormateurs', async () => []);

  const { status } = await appeler('/etudiants/7/formations-disponibles?page=1', { token: etudiant });
  assert.equal(status, 200);
  assert.deepEqual(lister.mock.calls[0].arguments[0], { id_etudiant: 7 });

  const autre = await appeler('/etudiants/8/formations-disponibles', { token: etudiant });
  assert.equal(autre.status, 403);
});

test('POST /etudiants/:id/inscriptions : refusé sans connexion et pour un autre étudiant', async () => {
  const anonyme = await appeler('/etudiants/7/inscriptions', { method: 'POST', body: {} });
  assert.equal(anonyme.status, 401);

  session();
  const autre = await appeler('/etudiants/8/inscriptions', {
    method: 'POST', token: etudiant, body: { formations: [{ id_formation: 1 }], id_mode_paiement: 2 },
  });
  assert.equal(autre.status, 403);
});

test('validation à l\'Accueil, dossier incomplet : validée avec un avertissement', async () => {
  session();
  const accueil = jwt.sign({ id: 2, role: ROLES.ACCUEIL }, process.env.JWT_SECRET, { expiresIn: '1h' });
  mock.method(inscriptionService, 'validerInscription', async () => ({
    id_inscription: 3, id_paiement: 10, pieces_manquantes: ['Photocopie de la CIN'],
  }));

  const { status, body } = await appeler('/inscriptions/3/valid', { method: 'POST', token: accueil, body: { id_mode_paiement: 1 } });
  assert.equal(status, 200);
  assert.match(body.avertissement, /Dossier incomplet : Photocopie de la CIN/);
});
