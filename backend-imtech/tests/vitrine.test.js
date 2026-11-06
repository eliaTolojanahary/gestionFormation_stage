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
const parametreModel = require('../models/parametreModel');
const notifService = require('../services/notifService');
const inscriptionService = require('../services/inscriptionService');
const { simulerDependances } = require('./simulerDependances');
const { verifierDemande, inscriptionEnLigne, modifierFondVitrine, reinitialiserFondVitrine } = require('../services/vitrineService');

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
  mot_de_passe: 'motdepasse', confirmation_mot_de_passe: 'motdepasse', id_mode_paiement: 2, reference_virement: 'VIR-42', formations,
});

// ─── Vérification du formulaire ─────────────

test('formulaire : champs requis, mot de passe de 8 caractères, 1 à 4 tranches', () => {
  assert.throws(() => verifierDemande({ ...demande([{ id_formation: 1 }]), nom: '' }), /nom/);
  assert.throws(() => verifierDemande({ ...demande([{ id_formation: 1 }]), email: 'pas-un-mail' }), /e-mail/);
  assert.throws(() => verifierDemande({ ...demande([{ id_formation: 1 }]), mot_de_passe: 'court' }), /8 caractères/);
  assert.throws(() => verifierDemande({ ...demande([{ id_formation: 1 }]), confirmation_mot_de_passe: 'autre' }), /ne correspondent pas/);
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
  mock.method(inscriptionModel, 'getInscriptionById', async (id) => ({ nom_formation: `Formation ${id}` }));
  const accuse = mock.method(notifService, 'notifierEtudiant', async () => ({ emailEnvoye: true }));

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
  // Accusé de réception envoyé à l'étudiant, avec les deux formations
  const envoi = accuse.mock.calls[0].arguments[0];
  assert.equal(envoi.email, 'lova@mail.mg');
  assert.match(envoi.contenuHtml, /Formation 100/);
  assert.match(envoi.contenuHtml, /Formation 101/);
});

test('inscription avec les pièces jointes : enregistrées dans le dossier, Accueil prévenu du dossier complet', async () => {
  simulerTransaction();
  mock.method(userModel, 'findUserByEmail', async () => undefined);
  mock.method(vitrineModel, 'modePaiementExiste', async () => true);
  const compte = mock.method(etudiantModel, 'insertUtilisateurEtEtudiant', async () => 7);
  mock.method(inscriptionService, 'creerInscriptionDans', async () => 100);
  mock.method(echeanceModel, 'getEcheancesByInscription', async () => [{ id_echeance: 1, montant_prevu: '50000.00' }]);
  mock.method(paiementModel, 'insererPaiement', async () => 1);
  mock.method(inscriptionModel, 'getIdUtilisateurByEtudiant', async () => 30);
  const personnel = mock.method(notifService, 'notifierPersonnel', async () => 2);
  mock.method(inscriptionModel, 'getInscriptionById', async () => ({ nom_formation: 'Web' }));
  mock.method(notifService, 'notifierEtudiant', async () => ({ emailEnvoye: true }));

  const pieces = {
    photo_1: 'etudiants/p1.jpg', photo_2: 'etudiants/p2.jpg',
    photocopie_cin: 'etudiants/cin.pdf', certificat_residence: 'etudiants/cr.jpg',
  };
  await inscriptionEnLigne({ ...demande([{ id_formation: 1 }]), pieces });

  assert.equal(compte.mock.calls[0].arguments[1].photocopie_cin, 'etudiants/cin.pdf');
  assert.match(personnel.mock.calls[0].arguments[0], /Dossier complet/);
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
  simulerDependances({ origine: 'en_ligne' });
  mock.method(etudiantModel, 'getEtudiantById', async () => ({
    photo_1: 'etudiants/p1.jpg', photo_2: 'etudiants/p2.jpg',
    photocopie_cin: 'etudiants/cin.pdf', certificat_residence: 'etudiants/cr.jpg',
  }));
  mock.method(echeanceModel, 'getEcheancesByInscription', async () => [{ id_echeance: 5, montant_prevu: 50000 }]);
  mock.method(inscriptionModel, 'setInscriptionValidee', async () => true);
  mock.method(paiementModel, 'getPaiementEnAttenteEcheance', async () => ({ id_paiement: 9 }));
  const valider = mock.method(paiementModel, 'validerPaiementDeclare', async () => true);
  const inserer = mock.method(paiementModel, 'insererPaiement', async () => 10);

  const resultat = await inscriptionService.validerInscription(3, 1, 'REF');

  assert.deepEqual(resultat, { id_inscription: 3, id_paiement: 9, pieces_manquantes: [] });
  assert.equal(valider.mock.callCount(), 1);
  assert.equal(inserer.mock.callCount(), 0);
});

test('inscription en ligne, dossier incomplet : validation refusée (409) avec les pièces manquantes', async () => {
  simulerTransaction();
  simulerDependances({ origine: 'en_ligne' });
  mock.method(etudiantModel, 'getEtudiantById', async () => ({ photo_1: 'etudiants/p1.jpg', photo_2: 'etudiants/p2.jpg' }));
  const valider = mock.method(inscriptionModel, 'setInscriptionValidee', async () => true);

  await assert.rejects(inscriptionService.validerInscription(3, 1, 'REF'), (error) => {
    assert.equal(error.status, 409);
    assert.match(error.message, /Photocopie de la CIN, Certificat de résidence/);
    return true;
  });
  assert.equal(valider.mock.callCount(), 0);
});

test('inscription faite à l\'Accueil : validée même si le dossier est incomplet, pièces manquantes signalées', async () => {
  simulerTransaction();
  simulerDependances({ origine: 'accueil' });
  mock.method(etudiantModel, 'getEtudiantById', async () => ({ photo_1: 'etudiants/p1.jpg', photo_2: 'etudiants/p2.jpg' }));
  mock.method(echeanceModel, 'getEcheancesByInscription', async () => [{ id_echeance: 5, montant_prevu: 50000 }]);
  mock.method(inscriptionModel, 'setInscriptionValidee', async () => true);
  mock.method(paiementModel, 'getPaiementEnAttenteEcheance', async () => null);
  mock.method(paiementModel, 'insererPaiement', async () => 10);

  const resultat = await inscriptionService.validerInscription(3, 1, 'REF');

  assert.deepEqual(resultat, {
    id_inscription: 3, id_paiement: 10, pieces_manquantes: ['Photocopie de la CIN', 'Certificat de résidence'],
  });
});

// ─── Fond du bandeau « Découvrir » ──────────

test('fond de la vitrine : enregistré dans vitrine/, image obligatoire, retour au fond par défaut', async () => {
  mock.method(parametreModel, 'getParametre', async () => null);
  const enregistrer = mock.method(parametreModel, 'setParametre', async () => {});

  assert.equal(await modifierFondVitrine({ filename: '123-neurones.jpg' }), 'vitrine/123-neurones.jpg');
  assert.deepEqual(enregistrer.mock.calls[0].arguments, ['fond_vitrine', 'vitrine/123-neurones.jpg']);

  await assert.rejects(modifierFondVitrine(undefined), /Aucune image/);

  await reinitialiserFondVitrine();
  assert.deepEqual(enregistrer.mock.calls.at(-1).arguments, ['fond_vitrine', null]);
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

test('fond de la vitrine : modification refusée sans connexion', async () => {
  assert.equal((await fetch(`${baseUrl}/vitrine/fond`, { method: 'PUT' })).status, 401);
  assert.equal((await fetch(`${baseUrl}/vitrine/fond`, { method: 'DELETE' })).status, 401);
});
