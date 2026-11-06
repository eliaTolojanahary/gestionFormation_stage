require('./setup');
const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const attestationModel = require('../models/attestationModel');
const formateurNoteModel = require('../models/formateurNoteModel');
const alerteModel = require('../models/alerteModel');
const documentService = require('../services/documentService');
const notifService = require('../services/notifService');
const documentModel = require('../models/documentModel');
const classementModel = require('../models/classementModel');
const classementService = require('../services/classementService');
const dependanceModel = require('../models/dependanceModel');
const attestationService = require('../services/attestationService');
const { verifierAlertes } = require('../services/alerteService');

afterEach(() => mock.restoreAll());

// Formation terminée : prête par défaut (note attribuée, tout payé)
function terminee(champs = {}) {
  return {
    id_inscription: 16, id_formateur: 5, formateur: 'Voahangy Rakotomalala',
    etudiant_prenom: 'Fitiavana', etudiant_nom: 'Rasolofo', formation_nom: 'Bureautique',
    note_presentation: '8.00', reste_a_payer: '0.00', formateur_commente: 1, ...champs,
  };
}

// Ni rappel d'échéance, ni alerte déjà envoyée, ni vraie notification
function simulerTache({ terminees }) {
  mock.method(alerteModel, 'getEcheancesARappeler', async () => []);
  mock.method(attestationModel, 'getInscriptionsTerminees', async () => terminees);
  mock.method(alerteModel, 'reserverAlerte', async () => true);
  mock.method(formateurNoteModel, 'getInscriptionsARappeler', async () => []);
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
  assert.deepEqual(attestationService.raisonsBlocage(terminee({ formateur_commente: 0 })),
    ["Commentaire sur le formateur à écrire par l'étudiant (application mobile)"]);
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

// ─── Une seule attestation par inscription ──

function inscriptionActive() {
  mock.method(dependanceModel, 'etatsInscription', async () => ({
    id_inscription: 16, inscription_active: 1, etudiant_actif: 1, formation_active: 1,
  }));
}

test("attestation déjà délivrée : on renvoie la même, sans en créer une autre ni recalculer la note", async () => {
  inscriptionActive();
  mock.method(documentModel, 'findAttestation', async () => ({ uuid_verification: 'abc', fichier_pdf: 'documents/a.pdf' }));
  const donnees = mock.method(documentModel, 'findInscriptionPourAttestation', async () => ({}));
  const inserer = mock.method(documentModel, 'insertAttestation', async () => {});

  assert.deepEqual(await documentService.creerAttestation(16), { cheminRelatif: 'documents/a.pdf', uuid: 'abc' });
  assert.equal(donnees.mock.callCount(), 0);
  assert.equal(inserer.mock.callCount(), 0);
});

test("attestation délivrée : la note de présentation ne peut plus changer", async () => {
  inscriptionActive();
  mock.method(classementModel, 'getInscriptionAvecFormateur', async () => ({ id_inscription: 16, id_formateur: 5 }));
  mock.method(documentModel, 'findAttestation', async () => ({ uuid_verification: 'abc' }));
  const enregistrer = mock.method(classementModel, 'setNotePresentation', async () => {});

  await assert.rejects(
    classementService.definirNote(16, 9, { id: 5, role: 'Formateur' }),
    (err) => err.status === 409 && /déjà été délivrée/.test(err.message)
  );
  assert.equal(enregistrer.mock.callCount(), 0);
});

test("sans attestation, la note de présentation reste modifiable", async () => {
  inscriptionActive();
  mock.method(classementModel, 'getInscriptionAvecFormateur', async () => ({ id_inscription: 16, id_formateur: 5 }));
  mock.method(documentModel, 'findAttestation', async () => null);
  const enregistrer = mock.method(classementModel, 'setNotePresentation', async () => {});

  await classementService.definirNote(16, '7,5', { id: 5, role: 'Formateur' });
  assert.deepEqual(enregistrer.mock.calls[0].arguments, [16, 7.5]);
});

// ─── Commentaire obligatoire et rappel à J-1 ──

test("attestation refusée tant que l'étudiant n'a pas commenté son formateur", async () => {
  inscriptionActive();
  mock.method(documentModel, 'findAttestation', async () => null);
  mock.method(formateurNoteModel, 'commentaireExiste', async () => false);
  const donnees = mock.method(documentModel, 'findInscriptionPourAttestation', async () => ({}));

  await assert.rejects(documentService.creerAttestation(16), (err) => err.status === 409 && /commenter son formateur/.test(err.message));
  assert.equal(donnees.mock.callCount(), 0);
});

test("à J-1, l'étudiant est prévenu une seule fois", async () => {
  simulerTache({ terminees: [] });
  mock.method(formateurNoteModel, 'getInscriptionsARappeler', async () => [
    { id_inscription: 16, id_utilisateur: 9, email: 'e@mail.mg', prenom: 'Rova', nom: 'Rakoto', formation_nom: 'Web', formateur_prenom: 'Aina', formateur_nom: 'Rabe' },
    { id_inscription: 17, id_utilisateur: 10, email: 'f@mail.mg', prenom: 'Soa', nom: 'Rasoa', formation_nom: 'Web', formateur_prenom: 'Aina', formateur_nom: 'Rabe' },
  ]);
  mock.method(alerteModel, 'reserverAlerte', async (_type, id) => id === 16); // la 17 est déjà partie
  const prevenir = mock.method(notifService, 'notifierEtudiant', async () => ({ emailEnvoye: true }));

  const { commentairesDemandes } = await verifierAlertes();

  assert.equal(commentairesDemandes, 1);
  assert.equal(prevenir.mock.callCount(), 1);
  assert.match(prevenir.mock.calls[0].arguments[0].message, /commentez votre formateur, Aina Rabe.*obligatoire/);
});
