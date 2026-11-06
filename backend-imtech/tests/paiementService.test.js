require('./setup');
const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const paiementModel = require('../models/paiementModel');
const paiementService = require('../services/paiementService');
const notifService = require('../services/notifService');
const documentService = require('../services/documentService');
const etatService = require('../services/etatService');
const dependanceModel = require('../models/dependanceModel');
const documentModel = require('../models/documentModel');
const db = require('../config/db');
const { ROLES } = require('../config/roles');
const { simulerDependances } = require('./simulerDependances');

const etudiant = { id: 10, role: ROLES.ETUDIANT, id_etudiant: 7 };
const accueil = { id: 2, role: ROLES.ACCUEIL };

function echeance(situation = {}) {
  return { id_echeance: 1, montant_prevu: '50000.00', id_etudiant: 7, montant_valide: 0, nb_en_attente: 0, ...situation };
}

// Fausse connexion pour avecTransaction (aucune requête SQL réelle)
function simulerTransaction() {
  const connexion = {
    requetes: [],
    query: async (sql) => { connexion.requetes.push(sql); return [[]]; },
    beginTransaction: async () => {},
    commit: mock.fn(async () => {}),
    rollback: mock.fn(async () => {}),
    release: () => {},
  };
  mock.method(db, 'getConnection', async () => connexion);
  return connexion;
}

let transaction;
beforeEach(() => {
  simulerDependances(); // échéance, inscription, étudiant et formation actifs
  transaction = simulerTransaction();
  mock.method(paiementModel, 'getEcheanceAvecSituation', async () => echeance());
});
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
  assert.deepEqual(changer.mock.calls[0].arguments.slice(0, 2), [3, 'valide']);
  assert.equal(changer.mock.calls[0].arguments[3], null); // sans auteur connu
  assert.equal(changer.mock.calls[0].arguments[2], transaction);
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

// ─── Double paiement et facture en double ──

test("enregistrer un paiement verrouille l'échéance avant de lire le reste à payer", async () => {
  const lecture = mock.method(paiementModel, 'getEcheanceAvecSituation', async () => echeance());
  const inserer = mock.method(paiementModel, 'insererPaiement', async () => 8);
  simulerDependances();

  await paiementService.enregistrerPaiement({ id_echeance: 1, id_mode_paiement: 1, montant: 10000 }, accueil);

  assert.match(transaction.requetes[0], /FOR UPDATE/);
  assert.equal(lecture.mock.calls[0].arguments[1], transaction);
  assert.equal(inserer.mock.calls[0].arguments[1], transaction);
  assert.equal(transaction.commit.mock.callCount(), 1);
});

test("montant trop élevé au guichet : la transaction est annulée", async () => {
  await assert.rejects(
    paiementService.enregistrerPaiement({ id_echeance: 1, id_mode_paiement: 1, montant: 60000 }, accueil),
    (err) => err.status === 400
  );
  assert.equal(transaction.rollback.mock.callCount(), 1);
});

test("reste à payer arrondi au centime : le dernier centime reste payable", async () => {
  mock.method(paiementModel, 'getEcheanceAvecSituation', async () =>
    echeance({ montant_prevu: '33333.34', montant_valide: '33333.33' }));
  const inserer = mock.method(paiementModel, 'insererPaiement', async () => 8);
  simulerDependances();

  await paiementService.enregistrerPaiement({ id_echeance: 1, id_mode_paiement: 1, montant: 0.01 }, accueil);
  assert.equal(inserer.mock.callCount(), 1);
});

test("valider un paiement alors que l'échéance a été réglée entre-temps est refusé", async () => {
  const facture = simulerDependances();
  mock.method(paiementModel, 'getPaiementById', async () => ({ id_paiement: 3, id_echeance: 1, statut: 'en_attente', montant: '50000.00' }));
  mock.method(paiementModel, 'getEcheanceAvecSituation', async () => echeance({ montant_valide: '50000.00' }));
  const changer = mock.method(paiementModel, 'changerStatutPaiementEnAttente', async () => true);

  await assert.rejects(paiementService.validerPaiement(3), (err) => err.status === 409 && /dépasse le reste à payer/.test(err.message));
  assert.equal(changer.mock.callCount(), 0);
  assert.equal(facture.mock.callCount(), 0);
});

test("on peut toujours refuser un paiement devenu trop élevé", async () => {
  mock.method(paiementModel, 'getPaiementById', async () => ({ id_paiement: 3, id_echeance: 1, statut: 'en_attente', montant: '50000.00' }));
  mock.method(paiementModel, 'getEcheanceAvecSituation', async () => echeance({ montant_valide: '50000.00' }));
  const changer = mock.method(paiementModel, 'changerStatutPaiementEnAttente', async () => true);
  mock.method(notifService, 'notifierEtudiant', async () => {});

  await paiementService.refuserPaiement(3);
  assert.equal(changer.mock.calls[0].arguments[1], 'refuse');
});

test("deux validations simultanées : la seconde est refusée, une seule facture part", async () => {
  const facture = simulerDependances();
  mock.method(paiementModel, 'getPaiementById', async () => ({ id_paiement: 3, id_echeance: 1, statut: 'en_attente', montant: '50000.00' }));
  mock.method(paiementModel, 'changerStatutPaiementEnAttente', async () => false);

  await assert.rejects(paiementService.validerPaiement(3), (err) => err.status === 409 && /déjà été traité/.test(err.message));
  assert.equal(facture.mock.callCount(), 0);
});

test("facture déjà émise : on renvoie la même, sans en créer une autre", async () => {
  mock.method(documentModel, 'findPaiementPourFacture', async () => ({ statut: 'valide' }));
  mock.method(documentModel, 'findFacture', async () => ({ numero_facture: 'FAC-2026-0003', fichier_pdf: 'documents/f.pdf' }));
  const inserer = mock.method(documentModel, 'insertFacture', async () => {});

  assert.deepEqual(await documentService.creerFacture(3), { cheminRelatif: 'documents/f.pdf', numeroFacture: 'FAC-2026-0003' });
  assert.equal(inserer.mock.callCount(), 0);
});

// ─── Plafond : correction et réactivation ──

function simulerControle(paiement, situation) {
  mock.method(paiementModel, 'getPaiementPourControle', async () => ({ montant: '20000.00', statut: 'valide', etat: 1, ...paiement }));
  mock.method(paiementModel, 'getEcheanceAvecSituation', async () => echeance(situation));
}

test("corriger un paiement validé : son ancien montant ne compte pas dans le plafond", async () => {
  simulerControle({}, { montant_valide: '20000.00' });
  const modifier = mock.method(paiementModel, 'updatePaiement', async () => true);

  await paiementService.modifierPaiement(3, { montant: 50000 });
  assert.equal(modifier.mock.calls[0].arguments[2], transaction);
  assert.match(transaction.requetes[0], /FOR UPDATE/);
});

test("corriger un paiement au-delà du reste à payer est refusé", async () => {
  simulerControle({}, { montant_valide: '20000.00' });
  const modifier = mock.method(paiementModel, 'updatePaiement', async () => true);

  await assert.rejects(
    paiementService.modifierPaiement(3, { montant: 50001 }),
    (err) => err.status === 400 && /dépasse le reste à payer \(50000\)/.test(err.message)
  );
  assert.equal(modifier.mock.callCount(), 0);
});

test("un montant en attente est plafonné au reste à payer complet", async () => {
  simulerControle({ statut: 'en_attente' }, { montant_valide: '30000.00' });
  mock.method(paiementModel, 'updatePaiement', async () => true);

  await assert.rejects(paiementService.modifierPaiement(3, { montant: 30000 }), (err) => err.status === 400);
  await paiementService.modifierPaiement(3, { montant: 20000 });
});

test("corriger la référence seule ne contrôle pas le montant", async () => {
  simulerControle({}, { montant_valide: '90000.00' });
  const lecture = mock.method(paiementModel, 'getEcheanceAvecSituation', async () => echeance());
  const modifier = mock.method(paiementModel, 'updatePaiement', async () => true);

  await paiementService.modifierPaiement(3, { reference_virement: 'VIR-2' });
  assert.equal(lecture.mock.callCount(), 0);
  assert.equal(modifier.mock.callCount(), 1);
});

test("montant corrigé invalide ou paiement refusé", async () => {
  simulerControle({ statut: 'refuse' }, { montant_valide: '50000.00' });
  const modifier = mock.method(paiementModel, 'updatePaiement', async () => true);

  await assert.rejects(paiementService.modifierPaiement(3, { montant: -5 }), (err) => err.status === 400);
  await paiementService.modifierPaiement(3, { montant: 90000 }); // refusé : ne compte pas dans l'encaissé
  assert.equal(modifier.mock.callCount(), 1);
});

test("réactiver un paiement validé alors que l'échéance a été repayée est refusé", async () => {
  simulerControle({ etat: 0, montant: '50000.00' }, { montant_valide: '50000.00' });
  const changer = mock.method(dependanceModel, 'changerEtat', async () => true);

  await assert.rejects(etatService.reactiverPaiement(3), (err) => err.status === 409 && /dépasse le reste à payer/.test(err.message));
  assert.equal(changer.mock.callCount(), 0);
});

test("réactiver un paiement validé qui tient dans le reste : dans la transaction de l'échéance", async () => {
  simulerControle({ etat: 0, montant: '20000.00' }, { montant_valide: '30000.00' });
  const changer = mock.method(dependanceModel, 'changerEtat', async () => true);

  await etatService.reactiverPaiement(3);
  assert.deepEqual(changer.mock.calls[0].arguments, ['paiement', 3, true, transaction]);
});

test("réactiver un paiement en attente ou refusé ne contrôle pas le reste (validation plafonnée ensuite)", async () => {
  simulerControle({ etat: 0, statut: 'en_attente', montant: '50000.00' }, { montant_valide: '50000.00' });
  const changer = mock.method(dependanceModel, 'changerEtat', async () => true);

  await etatService.reactiverPaiement(3);
  assert.equal(changer.mock.callCount(), 1);
});

test("réactiver un paiement déjà actif : 409", async () => {
  simulerControle({ etat: 1 });
  await assert.rejects(etatService.reactiverPaiement(3), (err) => err.status === 409 && /déjà actif/.test(err.message));
});

// ─── Paiement facturé ──

function simulerFacture(paiement = {}) {
  simulerControle({ id_mode_paiement: 1, ...paiement }, { montant_valide: '20000.00' });
  mock.method(documentModel, 'findFacture', async () => ({ numero_facture: 'FAC-2026-0003' }));
  return mock.method(paiementModel, 'updatePaiement', async () => true);
}

test("paiement facturé : le montant ne peut plus changer", async () => {
  const modifier = simulerFacture();

  await assert.rejects(paiementService.modifierPaiement(3, { montant: 25000 }), (err) => err.status === 409 && /a une facture/.test(err.message));
  assert.equal(modifier.mock.callCount(), 0);
});

test("paiement facturé : le mode ne peut plus changer, car il figure sur la facture", async () => {
  const modifier = simulerFacture();

  await assert.rejects(paiementService.modifierPaiement(3, { id_mode_paiement: 2 }), (err) => err.status === 409);
  assert.equal(modifier.mock.callCount(), 0);
});

test("paiement facturé : la référence se corrige, et renvoyer les mêmes valeurs passe", async () => {
  const modifier = simulerFacture();

  await paiementService.modifierPaiement(3, { reference_virement: 'VIR-2' });
  await paiementService.modifierPaiement(3, { montant: '20000.00', id_mode_paiement: '1', reference_virement: 'VIR-3' });
  assert.equal(modifier.mock.callCount(), 2);
});

// ─── Agent responsable ──

test("un paiement au guichet retient l'agent ; une déclaration d'étudiant n'a pas encore d'agent", async () => {
  const inserer = mock.method(paiementModel, 'insererPaiement', async () => 8);
  mock.method(paiementModel, 'getPaiementById', async () => ({ montant: '50000.00' }));
  mock.method(notifService, 'notifierPersonnel', async () => 1);
  simulerDependances();

  await paiementService.enregistrerPaiement({ id_echeance: 1, id_mode_paiement: 1, montant: 10000 }, accueil);
  await paiementService.enregistrerPaiement({ id_echeance: 1, id_mode_paiement: 1 }, etudiant);

  assert.equal(inserer.mock.calls[0].arguments[0].id_utilisateur, accueil.id);
  assert.equal(inserer.mock.calls[1].arguments[0].id_utilisateur, undefined);
});

test("valider ou refuser retient l'agent qui traite le paiement", async () => {
  mock.method(paiementModel, 'getPaiementById', async () => ({ id_paiement: 3, id_echeance: 1, statut: 'en_attente', montant: '50000.00' }));
  const changer = mock.method(paiementModel, 'changerStatutPaiementEnAttente', async () => true);
  mock.method(notifService, 'notifierEtudiant', async () => {});
  simulerDependances();

  await paiementService.validerPaiement(3, accueil.id);
  await paiementService.refuserPaiement(3, accueil.id);

  assert.equal(changer.mock.calls[0].arguments[3], accueil.id);
  assert.equal(changer.mock.calls[1].arguments[3], accueil.id);
});
