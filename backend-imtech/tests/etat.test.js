require('./setup');
const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { lireEtat, conditionEtat } = require('../utils/etat');
const db = require('../config/db');
const dependanceModel = require('../models/dependanceModel');
// Vraie fonction : des tests la remplacent deux fois de suite, ce que restoreAll ne défait pas
const changerEtatReel = dependanceModel.changerEtat;
const inscriptionModel = require('../models/inscriptionModel');
const paiementModel = require('../models/paiementModel');
const documentModel = require('../models/documentModel');
const supportModel = require('../models/supportModel');
const userModel = require('../models/userModel');
const etatService = require('../services/etatService');
const paiementService = require('../services/paiementService');
const userService = require('../services/userService');
const etudiantService = require('../services/etudiantService');
const formationService = require('../services/formationService');
const inscriptionService = require('../services/inscriptionService');
const documentService = require('../services/documentService');
const supportService = require('../services/supportService');
const { simulerDependances } = require('./simulerDependances');

afterEach(() => mock.restoreAll());

// ─── Filtre ?etat= ──────────────────────────

test('filtre des listes : actif par défaut, inactif ou tous sur demande', () => {
  assert.equal(lireEtat({}), 'actif');
  assert.equal(lireEtat({ etat: 'inactif' }), 'inactif');
  assert.equal(lireEtat({ etat: 'tous' }), 'tous');
  assert.equal(lireEtat({ etat: 'n_importe_quoi' }), 'actif');
  assert.equal(conditionEtat('e.etat', 'actif'), 'e.etat = true');
  assert.equal(conditionEtat('e.etat', 'inactif'), 'e.etat = false');
  assert.equal(conditionEtat('e.etat', 'tous'), null);
});

test("sans le droit (étudiant, formateur), seuls les éléments actifs sont visibles", () => {
  assert.equal(lireEtat({ etat: 'inactif' }, false), 'actif');
  assert.equal(lireEtat({ etat: 'tous' }, false), 'actif');
});

// ─── Action sur un élément dont un parent est désactivé ──

test("payer l'échéance d'un étudiant désactivé : refusé avec un message qui dit quoi réactiver", async () => {
  simulerDependances({ etudiant_actif: 0 });
  const inserer = mock.method(paiementModel, 'insererPaiement', async () => 1);

  await assert.rejects(
    paiementService.enregistrerPaiement({ id_echeance: 1, id_mode_paiement: 1, montant: 1000 }, { role: 'Accueil' }),
    (err) => err.status === 409 && /étudiant Rova Rakoto est désactivé.*Réactivez-le/.test(err.message)
  );
  assert.equal(inserer.mock.callCount(), 0);
});

test("formation désactivée : le message nomme la formation", async () => {
  simulerDependances({ formation_active: 0 });
  await assert.rejects(
    paiementService.validerPaiement(3),
    (err) => err.status === 409 && /formation « Web » est désactivée/.test(err.message)
  );
});

test("l'élément lui-même est contrôlé avant ses parents", async () => {
  simulerDependances({ paiement_actif: 0, etudiant_actif: 0 });
  await assert.rejects(
    paiementService.validerPaiement(3),
    (err) => /Ce paiement est désactivé/.test(err.message)
  );
});

// ─── Réactivation ───────────────────────────

test("réactiver l'inscription d'un étudiant désactivé est refusé", async () => {
  simulerDependances({ inscription_active: 0, etudiant_actif: 0 });
  const changer = mock.method(dependanceModel, 'changerEtat', async () => true);

  await assert.rejects(etatService.reactiverInscription(3), /Réactivez-le d'abord/);
  assert.equal(changer.mock.callCount(), 0);
});

test("réactiver une inscription alors qu'une autre est déjà active à la même formation est refusé", async () => {
  simulerDependances({ inscription_active: 0 });
  mock.method(inscriptionModel, 'inscriptionActiveExiste', async () => true);
  const changer = mock.method(dependanceModel, 'changerEtat', async () => true);

  await assert.rejects(etatService.reactiverInscription(3), /déjà une inscription active/);
  assert.equal(changer.mock.callCount(), 0);
});

test('réactiver une inscription dont tout dépend est actif', async () => {
  simulerDependances({ inscription_active: 0 });
  mock.method(inscriptionModel, 'inscriptionActiveExiste', async () => false);
  const changer = mock.method(dependanceModel, 'changerEtat', async () => true);

  await etatService.reactiverInscription(3);
  assert.deepEqual(changer.mock.calls[0].arguments, ['inscription', 3, true]);
});

test("support : un formateur ne réactive que les siens, et pas dans une formation désactivée", async () => {
  const changer = mock.method(dependanceModel, 'changerEtat', async () => true);
  const support = { id_support: 4, id_utilisateur: 3, support_actif: 0, formation_active: 1, formation_nom: 'Web' };

  mock.method(dependanceModel, 'etatsSupport', async () => support);
  await assert.rejects(etatService.reactiverSupport(4, { id: 99, role: 'Formateur' }), (err) => err.status === 403);

  mock.method(dependanceModel, 'etatsSupport', async () => ({ ...support, formation_active: 0 }));
  await assert.rejects(etatService.reactiverSupport(4, { id: 3, role: 'Formateur' }), /formation « Web » est désactivée/);
  assert.equal(changer.mock.callCount(), 0);

  mock.method(dependanceModel, 'etatsSupport', async () => support);
  await etatService.reactiverSupport(4, { id: 3, role: 'Formateur' });
  assert.deepEqual(changer.mock.calls[0].arguments, ['support', 4, true]);
});

test('réactiver un élément déjà actif : 409 ; inexistant : 404', async () => {
  mock.method(dependanceModel, 'changerEtat', async () => false);
  mock.method(dependanceModel, 'existe', async () => true);
  await assert.rejects(etatService.reactiverEtudiant(1), (err) => err.status === 409 && /déjà actif/.test(err.message));

  mock.method(dependanceModel, 'existe', async () => false);
  await assert.rejects(etatService.reactiverEtudiant(1), (err) => err.status === 404);
});

test("compte utilisateur : réactivé dans la table utilisateur ; déjà actif : 409", async () => {
  const changer = mock.method(dependanceModel, 'changerEtat', async () => true);
  await etatService.reactiverUtilisateur(5);
  assert.deepEqual(changer.mock.calls[0].arguments, ['utilisateur', 5, true]);

  mock.method(dependanceModel, 'changerEtat', async () => false);
  mock.method(dependanceModel, 'existe', async () => true);
  await assert.rejects(etatService.reactiverUtilisateur(5), (err) => err.status === 409 && /déjà actif/.test(err.message));
});

// ─── Historique des désactivations et réactivations ──


// Connexion simulée : la première requête (UPDATE) touche `lignes` ligne(s)
function simulerConnexion(lignes, { erreurInsert = false } = {}) {
  const requetes = [];
  const connexion = {
    beginTransaction: async () => {},
    commit: mock.fn(async () => {}),
    rollback: mock.fn(async () => {}),
    release: () => {},
    query: async (sql) => {
      requetes.push(sql);
      if (erreurInsert && sql.startsWith('INSERT')) throw new Error('insertion impossible');
      return [{ affectedRows: lignes }];
    },
  };
  mock.method(db, 'getConnection', async () => connexion);
  return { connexion, requetes };
}

test("changer l'état écrit l'historique avec l'élément et le sens du changement", async () => {
  const { connexion, requetes } = simulerConnexion(1);

  assert.equal(await changerEtatReel('paiement', 9, false), true);
  assert.equal(requetes.length, 2);
  assert.match(requetes[1], /INSERT INTO historique_etat/);
  assert.equal(connexion.commit.mock.callCount(), 1);
});

test("élément inexistant ou déjà dans cet état : rien dans l'historique", async () => {
  const { requetes } = simulerConnexion(0);

  assert.equal(await changerEtatReel('paiement', 9, false), false);
  assert.equal(requetes.length, 1);
});

test("historique impossible à écrire : le changement d'état est annulé", async () => {
  const { connexion } = simulerConnexion(1, { erreurInsert: true });

  await assert.rejects(changerEtatReel('paiement', 9, false), /insertion impossible/);
  assert.equal(connexion.rollback.mock.callCount(), 1);
  assert.equal(connexion.commit.mock.callCount(), 0);
});

test("chaque désactivation passe par changerEtat (donc par l'historique)", async () => {
  const changer = mock.method(dependanceModel, 'changerEtat', async () => true);
  mock.method(userModel, 'deactivateAllSessions', async () => {});
  mock.method(supportModel, 'getSupportPourSuppression', async () => ({ id_utilisateur: 3 }));
  mock.method(documentModel, 'findFacture', async () => null);

  await userService.supprimerUtilisateur(1);
  await etudiantService.supprimerEtudiant(2);
  await formationService.supprimerFormation(3);
  await inscriptionService.supprimerInscription(4);
  await documentService.supprimerDocument(5);
  await supportService.supprimerSupport(6, { id: 3, role: 'Formateur' });
  await etatService.desactiverEcheance(7);
  await etatService.desactiverPaiement(8);

  assert.deepEqual(changer.mock.calls.map((c) => c.arguments), [
    ['utilisateur', 1, false], ['etudiant', 2, false], ['formation', 3, false], ['inscription', 4, false],
    ['document_administratif', 5, false], ['support', 6, false], ['echeance', 7, false], ['paiement', 8, false],
  ]);
});

test('désactiver un élément déjà désactivé : 409 ; inexistant : 404', async () => {
  mock.method(dependanceModel, 'changerEtat', async () => false);
  mock.method(dependanceModel, 'existe', async () => true);
  await assert.rejects(formationService.supprimerFormation(1), (err) => err.status === 409 && /déjà désactivée/.test(err.message));

  mock.method(dependanceModel, 'existe', async () => false);
  await assert.rejects(formationService.supprimerFormation(1), (err) => err.status === 404);
});

test("un paiement facturé ne peut pas être désactivé", async () => {
  const changer = mock.method(dependanceModel, 'changerEtat', async () => true);
  mock.method(documentModel, 'findFacture', async () => ({ numero_facture: 'FAC-2026-0003' }));

  await assert.rejects(etatService.desactiverPaiement(3), (err) => err.status === 409 && /a une facture/.test(err.message));
  assert.equal(changer.mock.callCount(), 0);
});
