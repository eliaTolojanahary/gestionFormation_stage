require('./setup');
const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const supportModel = require('../models/supportModel');
const notifModel = require('../models/notifModel');
const supportService = require('../services/supportService');
const programme = require('../services/supportProgrammeService');
const { ROLES } = require('../config/roles');

afterEach(() => mock.restoreAll());

const MAINTENANT = new Date(2026, 9, 10, 13, 30);
const DANS = (minutes) => new Date(MAINTENANT.getTime() + minutes * 60 * 1000);

function brouillon(id, dateEnvoi) {
  return {
    id_support: id, titre: `Cours ${id}`, id_formation: 4, nom_formation: 'React',
    id_utilisateur: 3, prof_prenom: 'Jean', prof_nom: 'Rakoto', date_envoi_prevue: dateEnvoi,
  };
}

// Simule la base : renvoie les notifications envoyées [destinataires, message]
function simulerBase({ aPublier = [], aAnnoncer = [], dejaFait = false } = {}) {
  mock.method(supportModel, 'getSupportsAPublier', async () => aPublier);
  mock.method(supportModel, 'getSupportsAAnnoncer', async () => aAnnoncer);
  mock.method(supportModel, 'publierSupport', async () => !dejaFait);
  mock.method(supportModel, 'marquerAnnonceEnvoyee', async () => !dejaFait);
  mock.method(supportModel, 'getIdsUtilisateursInscrits', async () => [20, 21]);
  return mock.method(notifModel, 'insertNotificationsInApp', async () => {});
}

test('délai annoncé : « dans une heure », « dans 20 minutes », « dans un instant »', () => {
  assert.equal(programme.formatDelai(DANS(60), MAINTENANT), 'dans une heure');
  assert.equal(programme.formatDelai(DANS(20), MAINTENANT), 'dans 20 minutes');
  assert.equal(programme.formatDelai(DANS(1), MAINTENANT), 'dans un instant');
});

test('1 h avant : les étudiants inscrits sont prévenus', async () => {
  const notifs = simulerBase({ aAnnoncer: [brouillon(1, DANS(60))] });

  const resultat = await programme.verifierSupportsProgrammes(MAINTENANT);

  assert.deepEqual(resultat, { envois: 0, annonces: 1 });
  const [destinataires, message] = notifs.mock.calls[0].arguments;
  assert.deepEqual(destinataires, [20, 21]);
  assert.match(message, /^Jean Rakoto va envoyer le support « Cours 1 » dans la formation React dans une heure/);
});

test("à l'heure : publication, étudiants ET formateur prévenus", async () => {
  const notifs = simulerBase({ aPublier: [brouillon(2, MAINTENANT)] });

  const resultat = await programme.verifierSupportsProgrammes(MAINTENANT);

  assert.deepEqual(resultat, { envois: 1, annonces: 0 });
  const [destinataires, message] = notifs.mock.calls[0].arguments;
  assert.deepEqual(destinataires, [20, 21, 3]);
  assert.equal(message, 'Le support « Cours 2 » a été envoyé dans la formation React.');
});

test('annonce ou envoi déjà fait (autre vérification) : aucune notification en double', async () => {
  const notifs = simulerBase({
    aPublier: [brouillon(2, MAINTENANT)],
    aAnnoncer: [brouillon(1, DANS(30))],
    dejaFait: true,
  });

  assert.deepEqual(await programme.verifierSupportsProgrammes(MAINTENANT), { envois: 0, annonces: 0 });
  assert.equal(notifs.mock.callCount(), 0);
});

test("date d'envoi : vide = immédiat, passée ou invalide = refusée", () => {
  assert.equal(supportService.lireDateEnvoi(''), null);
  assert.equal(supportService.lireDateEnvoi(undefined), null);
  assert.throws(() => supportService.lireDateEnvoi('pas une date'), /invalide/);
  assert.throws(() => supportService.lireDateEnvoi('2020-01-01T10:00'), /futur/);
  assert.ok(supportService.lireDateEnvoi('2099-01-01T10:00') instanceof Date);
});

test("un formateur ne modifie pas le brouillon d'un autre ; un support envoyé n'est plus modifiable", async () => {
  const autre = { id: 99, role: ROLES.FORMATEUR };
  mock.method(supportModel, 'getSupportProgramme', async () => brouillon(1, DANS(60)));
  await assert.rejects(supportService.modifierSupportProgramme(1, { titre: 'X' }, autre), { status: 403 });

  mock.restoreAll();
  mock.method(supportModel, 'getSupportProgramme', async () => null);
  mock.method(supportModel, 'getSupportById', async () => ({ id_support: 1 }));
  await assert.rejects(
    supportService.modifierSupportProgramme(1, { titre: 'X' }, { id: 3, role: ROLES.FORMATEUR }),
    { status: 409 }
  );
});
