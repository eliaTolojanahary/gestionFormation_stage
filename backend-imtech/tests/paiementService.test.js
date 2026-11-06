require('./setup');
const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const paiementModel = require('../models/paiementModel');
const paiementService = require('../services/paiementService');
const notifService = require('../services/notifService');
const { ROLES } = require('../config/roles');
const { simulerDependances } = require('./simulerDependances');

const etudiant = { id: 10, role: ROLES.ETUDIANT, id_etudiant: 7 };
const accueil = { id: 2, role: ROLES.ACCUEIL };

function echeance(situation = {}) {
  return { id_echeance: 1, montant_prevu: '50000.00', id_etudiant: 7, montant_valide: 0, nb_en_attente: 0, ...situation };
}

beforeEach(() => simulerDependances()); // échéance, inscription, étudiant et formation actifs
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
  assert.match(notifier.mock.calls[0].arguments[0], /Rova Rakoto a payé 50 000 Ar/);
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

test('valider un paiement en attente le passe à "valide" et envoie la facture', async () => {
  const facture = simulerDependances();
  mock.method(paiementModel, 'getPaiementById', async () => ({ id_paiement: 3, statut: 'en_attente' }));
  const changer = mock.method(paiementModel, 'changerStatutPaiementEnAttente', async () => true);
  const notifier = mock.method(notifService, 'notifierInApp', async () => {});

  const resultat = await paiementService.validerPaiement(3);

  assert.equal(resultat.statut, 'valide');
  assert.deepEqual(changer.mock.calls[0].arguments, [3, 'valide']);
  // La notification de l'étudiant accompagne la facture : pas de seconde notification
  // (sans auteur : l'e-mail est signé par le contact de l'Accueil)
  assert.deepEqual(facture.mock.calls[0].arguments, [3, null]);
  assert.equal(notifier.mock.callCount(), 0);
});

test("facture impossible : l'étudiant reçoit quand même la notification de validation", async () => {
  const facture = simulerDependances();
  facture.mock.mockImplementation(async () => { throw new Error('SMTP en panne'); });
  mock.method(console, 'warn', () => {});
  mock.method(paiementModel, 'getPaiementById', async () => ({
    id_paiement: 3, statut: 'en_attente', montant: '50000.00', formation_nom: 'Web', id_utilisateur_etudiant: 10,
  }));
  mock.method(paiementModel, 'changerStatutPaiementEnAttente', async () => true);
  const notifier = mock.method(notifService, 'notifierInApp', async () => {});

  await paiementService.validerPaiement(3);
  await new Promise((resolve) => setImmediate(resolve)); // laisse l'envoi en arrière-plan échouer

  assert.deepEqual(notifier.mock.calls[0].arguments, [10, 'Votre paiement de 50 000 Ar (Web) a été validé.']);
});

test("un paiement au guichet est validé tout de suite et sa facture envoyée", async () => {
  const facture = simulerDependances();
  mock.method(paiementModel, 'getEcheanceAvecSituation', async () => echeance());
  mock.method(paiementModel, 'insererPaiement', async () => 8);

  await paiementService.enregistrerPaiement({ id_echeance: 1, id_mode_paiement: 1, montant: 10000 }, accueil);
  // La facture est signée par le membre du personnel qui a encaissé
  assert.deepEqual(facture.mock.calls[0].arguments, [8, accueil.id]);
});

test("refuser un paiement prévient l'étudiant par notification ET par e-mail, signé par l'auteur", async () => {
  mock.method(paiementModel, 'getPaiementById', async () => ({
    id_paiement: 3, statut: 'en_attente', montant: '50000.00', formation_nom: 'Web', mode_paiement: 'Virement bancaire',
    id_utilisateur_etudiant: 10, email_etudiant: 'rova@mail.mg', etudiant_prenom: 'rova', etudiant_nom: 'Rakoto',
    reference_virement: 'VIR-1', date_paiement: '2026-10-21T10:00:00',
  }));
  mock.method(paiementModel, 'changerStatutPaiementEnAttente', async () => true);
  const notifier = mock.method(notifService, 'notifierEtudiant', async () => ({ emailEnvoye: true }));

  const resultat = await paiementService.refuserPaiement(3, accueil.id);

  assert.equal(resultat.statut, 'refuse');
  const envoi = notifier.mock.calls[0].arguments[0];
  assert.equal(envoi.email, 'rova@mail.mg');
  assert.equal(envoi.id_auteur, accueil.id);
  assert.match(envoi.sujet, /Paiement non validé/);
  assert.match(envoi.contenuHtml, /Rova RAKOTO/);
});
