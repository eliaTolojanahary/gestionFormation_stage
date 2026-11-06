require('./setup');
const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const attestationModel = require('../models/attestationModel');
const alerteModel = require('../models/alerteModel');
const documentService = require('../services/documentService');
const notifService = require('../services/notifService');
const attestationService = require('../services/attestationService');
const { verifierAlertes } = require('../services/alerteService');

afterEach(() => mock.restoreAll());

// Formation terminée : prête par défaut (note attribuée, tout payé)
function terminee(champs = {}) {
  return {
    id_inscription: 16, id_formateur: 5, formateur: 'Voahangy Rakotomalala',
    etudiant_prenom: 'Fitiavana', etudiant_nom: 'Rasolofo', formation_nom: 'Bureautique',
    note_presentation: '8.00', reste_a_payer: '0.00', ...champs,
  };
}

// Ni rappel d'échéance, ni alerte déjà envoyée, ni vraie notification
function simulerTache({ terminees }) {
  mock.method(alerteModel, 'getEcheancesARappeler', async () => []);
  mock.method(attestationModel, 'getInscriptionsTerminees', async () => terminees);
  mock.method(alerteModel, 'reserverAlerte', async () => true);
  return {
    personnel: mock.method(notifService, 'notifierPersonnel', async () => 2),
    formateur: mock.method(notifService, 'notifierInApp', async () => {}),
    envoyer: mock.method(documentService, 'envoyerAttestation', async () => ({ emailEnvoye: true })),
  };
}

test('attestation prête seulement si la note est attribuée et tout est payé', () => {
  assert.deepEqual(attestationService.raisonsBlocage(terminee()), []);
  assert.deepEqual(attestationService.raisonsBlocage(terminee({ note_presentation: null })),
    ['Note de présentation à attribuer par Voahangy Rakotomalala']);
  assert.deepEqual(attestationService.raisonsBlocage(terminee({ reste_a_payer: '50000.00' })),
    ['Reste à payer : 50 000 Ar']);
});

test("« Tout envoyer » envoie les prêtes, et un échec n'arrête pas les autres", async () => {
  mock.method(attestationModel, 'getInscriptionsTerminees', async () => [
    terminee(), terminee({ id_inscription: 17, etudiant_prenom: 'Sitraka' }), terminee({ id_inscription: 18, note_presentation: null }),
  ]);
  mock.method(documentService, 'envoyerAttestation', async (id) => {
    if (id === 17) throw new Error('SMTP en panne');
    return { emailEnvoye: true };
  });

  const { envoyees, echecs } = await attestationService.envoyerPretes();
  assert.deepEqual(envoyees.map((e) => e.id_inscription), [16]);
  assert.deepEqual(echecs.map((e) => e.id_inscription), [17]);
});

test("tâche horaire : les attestations prêtes partent toutes seules, l'accueil est prévenu", async () => {
  const { personnel, envoyer } = simulerTache({ terminees: [terminee()] });
  const resultat = await verifierAlertes();
  assert.equal(resultat.attestations, 1);
  assert.deepEqual(envoyer.mock.calls[0].arguments, [16]);
  assert.match(personnel.mock.calls[0].arguments[0], /1 attestation\(s\) envoyée\(s\) automatiquement : Fitiavana Rasolofo \(Bureautique\)/);
});

test("tâche horaire : une attestation bloquée (reste à payer) n'est pas envoyée", async () => {
  const { personnel, envoyer } = simulerTache({ terminees: [terminee({ reste_a_payer: '50000.00' })] });
  const resultat = await verifierAlertes();
  assert.equal(resultat.attestations, 0);
  assert.equal(envoyer.mock.callCount(), 0);
  assert.equal(personnel.mock.callCount(), 0);
});

test('tâche horaire : note manquante -> un seul message au formateur pour tous ses étudiants', async () => {
  const { formateur, envoyer } = simulerTache({
    terminees: [
      terminee({ note_presentation: null }),
      terminee({ id_inscription: 17, etudiant_prenom: 'Nomena', note_presentation: null }),
    ],
  });
  const resultat = await verifierAlertes();
  assert.equal(resultat.notesDemandees, 2);
  assert.equal(envoyer.mock.callCount(), 0);
  assert.equal(formateur.mock.callCount(), 1);
  const [idFormateur, message] = formateur.mock.calls[0].arguments;
  assert.equal(idFormateur, 5);
  assert.match(message, /Fitiavana Rasolofo \(Bureautique\), Nomena Rasolofo \(Bureautique\)/);
});
