require('./setup');
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../app');
const db = require('../config/db');
const userModel = require('../models/userModel');
const etudiantModel = require('../models/etudiantModel');
const echeanceModel = require('../models/echeanceModel');
const paiementModel = require('../models/paiementModel');
const inscriptionModel = require('../models/inscriptionModel');
const vitrineModel = require('../models/vitrineModel');
const notifModel = require('../models/notifModel');
const notifService = require('../services/notifService');
const inscriptionService = require('../services/inscriptionService');
const { verifierDemande, inscriptionEnLigne } = require('../services/vitrineService');

afterEach(() => mock.restoreAll());

// Fausse connexion pour avecTransaction (aucune requête SQL réelle)
function simulerTransaction() {
  const connexion = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    query: async () => [[]],
  };
  mock.method(db, 'getConnection', async () => connexion);
}

const demande = (formations) => ({
  nom: 'Rabe', prenom: 'Lova', email: 'Lova@Mail.mg', telephone: '0340000000',
  mot_de_passe: 'motdepasse', id_mode_paiement: 2, reference_virement: 'VIR-42', formations,
});

// ─── Vérification du formulaire ─────────────

test('formulaire : champs requis, mot de passe de 8 caractères, 1 à 4 tranches', () => {
  assert.throws(() => verifierDemande({ ...demande([{ id_formation: 1 }]), nom: '' }), /nom/);
  assert.throws(() => verifierDemande({ ...demande([{ id_formation: 1 }]), email: 'pas-un-mail' }), /e-mail/);
  assert.throws(() => verifierDemande({ ...demande([{ id_formation: 1 }]), mot_de_passe: 'court' }), /8 caractères/);
  assert.throws(() => verifierDemande(demande([])), /au moins une formation/);
  assert.throws(() => verifierDemande(demande([{ id_formation: 1, nombre_tranches: 5 }])), /tranches/);
});

test('formulaire : une formation choisie deux fois ne compte qu\'une fois', () => {
  const formations = verifierDemande(demande([
    { id_formation: 1, nombre_tranches: 2 },
    { id_formation: 1, nombre_tranches: 3 },
    { id_formation: 2 },
  ]));
  assert.deepEqual(formations, [
    { id_formation: 1, nombre_tranches: 3 },
    { id_formation: 2, nombre_tranches: 1 },
  ]);
});

// ─── Inscription multiple ───────────────────

test('inscription à 2 formations : 2 inscriptions « en ligne » et 2 premiers paiements en attente', async () => {
  simulerTransaction();
  mock.method(userModel, 'findUserByEmail', async () => undefined);
  mock.method(vitrineModel, 'modePaiementExiste', async () => true);
  const compte = mock.method(etudiantModel, 'insertUtilisateurEtEtudiant', async () => 7);
  let prochainId = 100;
  const inscrire = mock.method(inscriptionService, 'creerInscriptionDans', async () => prochainId++);
  mock.method(echeanceModel, 'getEcheancesByInscription', async (id) => [{ id_echeance: id * 10, montant_prevu: '50000.00' }]);
  const payer = mock.method(paiementModel, 'insererPaiement', async () => 1);
  mock.method(inscriptionModel, 'getIdUtilisateurByEtudiant', async () => 30);
  const personnel = mock.method(notifService, 'notifierPersonnel', async () => 2);
  mock.method(notifModel, 'insertNotificationInApp', async () => {});

  const resultat = await inscriptionEnLigne(demande([{ id_formation: 1, nombre_tranches: 2 }, { id_formation: 2 }]));

  assert.equal(compte.mock.calls[0].arguments[1].email, 'lova@mail.mg');
  assert.equal(inscrire.mock.callCount(), 2);
  assert.equal(inscrire.mock.calls[0].arguments[1].origine, 'en_ligne');
  assert.equal(inscrire.mock.calls[0].arguments[1].nombre_tranches, 2);
  assert.equal(payer.mock.callCount(), 2);
  assert.equal(payer.mock.calls[1].arguments[0].statut, 'en_attente');
  assert.equal(payer.mock.calls[1].arguments[0].id_echeance, 1010);
  assert.equal(resultat.total_premier_paiement, 100000);
  assert.equal(personnel.mock.callCount(), 1);
});

test('e-mail déjà utilisé : 409, rien n\'est créé', async () => {
  mock.method(userModel, 'findUserByEmail', async () => ({ id_utilisateur: 1 }));
  const compte = mock.method(etudiantModel, 'insertUtilisateurEtEtudiant', async () => 7);

  await assert.rejects(inscriptionEnLigne(demande([{ id_formation: 1 }])), { status: 409 });
  assert.equal(compte.mock.callCount(), 0);
});

// ─── Validation par l'Accueil ───────────────

test('validation d\'une inscription en ligne : le paiement déclaré est validé, pas de second paiement', async () => {
  simulerTransaction();
  mock.method(echeanceModel, 'getEcheancesByInscription', async () => [{ id_echeance: 5, montant_prevu: 50000 }]);
  mock.method(inscriptionModel, 'setInscriptionValidee', async () => true);
  mock.method(paiementModel, 'getPaiementEnAttenteEcheance', async () => ({ id_paiement: 9 }));
  const valider = mock.method(paiementModel, 'validerPaiementDeclare', async () => true);
  const inserer = mock.method(paiementModel, 'insererPaiement', async () => 10);

  const resultat = await inscriptionService.validerInscription(3, 1, 'REF');

  assert.deepEqual(resultat, { id_inscription: 3, id_paiement: 9 });
  assert.equal(valider.mock.callCount(), 1);
  assert.equal(inserer.mock.callCount(), 0);
});

// ─── Routes publiques ───────────────────────

let server;
let baseUrl;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

test('inscription en ligne : accessible sans connexion, limitée à 5 essais par heure', async () => {
  const envoyer = () => fetch(`${baseUrl}/public/inscriptions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
  });

  for (let i = 0; i < 5; i++) assert.equal((await envoyer()).status, 400); // formulaire vide
  assert.equal((await envoyer()).status, 429);
});
