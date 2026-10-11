require('./setup');
const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const paiementModel = require('../models/paiementModel');
const paiementService = require('../services/paiementService');
const notifService = require('../services/notifService');
const { ROLES } = require('../config/roles');

const etudiant = { id: 10, role: ROLES.ETUDIANT, id_etudiant: 7 };
const accueil = { id: 2, role: ROLES.ACCUEIL };

function echeance(situation = {}) {
  return { id_echeance: 1, montant_prevu: '50000.00', id_etudiant: 7, montant_valide: 0, nb_en_attente: 0, ...situation };
}

afterEach(() => mock.restoreAll());

test("un étudiant paie sa propre échéance : paiement EN ATTENTE au montant prévu (montant envoyé ignoré)", async () => {
  mock.method(paiementModel, 'getEcheanceAvecSituation', async () => echeance());
  const inserer = mock.method(paiementModel, 'insererPaiement', async () => 99);
  mock.method(paiementModel, 'getPaiementById', async () => ({
    montant: '50000.00', etudiant_prenom: 'Rova', etudiant_nom: 'Rakoto', formation_nom: 'Web', mode_paiement: 'Cash',
  }));
  const notifier = mock.method(notifService, 'notifierPersonnel', async () => 2);

  const id = await paiementService.enregistrerPaiement(
    { id_echeance: 1, id_mode_paiement: 2, montant: 1 /* tentative de triche */ },
    etudiant
  );

  assert.equal(id, 99);
  const [donnees] = inserer.mock.calls[0].arguments;
  assert.equal(donnees.statut, 'en_attente');
  assert.equal(donnees.montant, 50000);
  assert.match(notifier.mock.calls[0].arguments[0], /Rova Rakoto a payé 50.000 MGA/);
});

test("un étudiant ne peut pas payer l'échéance d'un autre étudiant", async () => {
  mock.method(paiementModel, 'getEcheanceAvecSituation', async () => echeance({ id_etudiant: 999 }));
  const inserer = mock.method(paiementModel, 'insererPaiement', async () => 1);

  await assert.rejects(
    paiementService.enregistrerPaiement({ id_echeance: 1, id_mode_paiement: 2 }, etudiant),
    (err) => err.status === 403
  );
  assert.equal(inserer.mock.callCount(), 0);
});

test('un étudiant ne peut pas envoyer deux paiements en attente sur la même échéance', async () => {
  mock.method(paiementModel, 'getEcheanceAvecSituation', async () => echeance({ nb_en_attente: 1 }));
  await assert.rejects(
    paiementService.enregistrerPaiement({ id_echeance: 1, id_mode_paiement: 2 }, etudiant),
    (err) => err.status === 409
  );
});

test("une échéance déjà réglée refuse tout nouveau paiement", async () => {
  mock.method(paiementModel, 'getEcheanceAvecSituation', async () => echeance({ montant_valide: '50000.00' }));
  await assert.rejects(
    paiementService.enregistrerPaiement({ id_echeance: 1, id_mode_paiement: 2, montant: 10 }, accueil),
    (err) => err.status === 409
  );
});

test("l'accueil enregistre un paiement partiel VALIDÉ directement", async () => {
  mock.method(paiementModel, 'getEcheanceAvecSituation', async () => echeance({ montant_valide: '20000.00' }));
  const inserer = mock.method(paiementModel, 'insererPaiement', async () => 5);

  await paiementService.enregistrerPaiement({ id_echeance: 1, id_mode_paiement: 1, montant: '30000' }, accueil);

  const [donnees] = inserer.mock.calls[0].arguments;
  assert.equal(donnees.statut, 'valide');
  assert.equal(donnees.montant, 30000);
});

test("l'accueil ne peut pas encaisser plus que le reste à payer", async () => {
  mock.method(paiementModel, 'getEcheanceAvecSituation', async () => echeance({ montant_valide: '20000.00' }));
  await assert.rejects(
    paiementService.enregistrerPaiement({ id_echeance: 1, id_mode_paiement: 1, montant: 30001 }, accueil),
    (err) => err.status === 400
  );
});

test("un étudiant sans fiche étudiant ne reçoit aucun paiement (jamais la liste complète)", async () => {
  const getAll = mock.method(paiementModel, 'getAllPaiements', async () => [{ id_paiement: 1 }]);
  const resultat = await paiementService.listerPaiements({ id: 10, role: ROLES.ETUDIANT, id_etudiant: null });
  assert.deepEqual(resultat, []);
  assert.equal(getAll.mock.callCount(), 0);
});

test('un étudiant ne liste que ses propres paiements', async () => {
  const getAll = mock.method(paiementModel, 'getAllPaiements', async () => []);
  await paiementService.listerPaiements(etudiant);
  assert.equal(getAll.mock.calls[0].arguments[0].id_etudiant, 7);
});

test("un paiement déjà traité ne peut pas être revalidé", async () => {
  mock.method(paiementModel, 'getPaiementById', async () => ({ id_paiement: 3, statut: 'valide' }));
  await assert.rejects(paiementService.validerPaiement(3), (err) => err.status === 409);
});

test('valider un paiement en attente le passe à "valide"', async () => {
  mock.method(paiementModel, 'getPaiementById', async () => ({ id_paiement: 3, statut: 'en_attente' }));
  const changer = mock.method(paiementModel, 'changerStatutPaiementEnAttente', async () => true);
  const notifier = mock.method(notifService, 'notifierInApp', async () => {});

  const resultat = await paiementService.validerPaiement(3);

  assert.equal(resultat.statut, 'valide');
  assert.deepEqual(changer.mock.calls[0].arguments, [3, 'valide']);
  assert.equal(notifier.mock.callCount(), 1, "l'étudiant est notifié");
});
