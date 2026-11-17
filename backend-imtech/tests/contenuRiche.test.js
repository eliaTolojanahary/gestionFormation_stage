require('./setup');
const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const { nettoyerContenu } = require('../utils/contenuRiche');
const supportModel = require('../models/supportModel');
const formationModel = require('../models/formationModel');
const supportProgrammeService = require('../services/supportProgrammeService');
const supportService = require('../services/supportService');
const { ROLES } = require('../config/roles');

afterEach(() => mock.restoreAll());

const FORMATEUR = { id: 3, role: ROLES.FORMATEUR };

test('texte mis en forme : gras, italique, listes et titres sont gardés', () => {
  const html = '<h2>Chapitre 1</h2><p><strong>Important</strong> et <em>à retenir</em></p><ul><li>un</li></ul>';
  assert.equal(nettoyerContenu(html), html);
});

test("balises de l'éditeur du navigateur ramenées aux balises autorisées", () => {
  assert.equal(
    nettoyerContenu('<div><b>gras</b> <i>italique</i> <strike>barré</strike></div>'),
    '<p><strong>gras</strong> <em>italique</em> <s>barré</s></p>'
  );
});

test('XSS : script, attributs on* et liens javascript: sont supprimés', () => {
  const propre = nettoyerContenu(
    '<p onclick="voler()">Texte<script>alert(1)</script><img src=x onerror="voler()"></p>' +
    '<a href="javascript:voler()">piège</a><style>body{}</style>'
  );
  assert.doesNotMatch(propre, /script|onclick|onerror|<img|javascript|style/i);
  assert.match(propre, /Texte/);
});

test("un lien web s'ouvre dans un nouvel onglet, sans accès à la page d'origine", () => {
  assert.equal(
    nettoyerContenu('<a href="https://developer.mozilla.org">MDN</a>'),
    '<a href="https://developer.mozilla.org" target="_blank" rel="noopener noreferrer">MDN</a>'
  );
});

test("contenu vide laissé par l'éditeur = pas de texte", () => {
  assert.equal(nettoyerContenu('<p><br></p>'), null);
  assert.equal(nettoyerContenu('<p>&nbsp;</p>'), null);
  assert.equal(nettoyerContenu(undefined), null);
});

function simulerCreation() {
  mock.method(formationModel, 'getFormationById', async () => ({ id_formation: 4, id_utilisateur: 3, nom: 'React' }));
  mock.method(supportProgrammeService, 'notifierSupportEnvoye', async () => {});
  return mock.method(supportModel, 'createSupport', async () => 10);
}

test('support texte seul : un support créé sans fichier', async () => {
  const creation = simulerCreation();

  const { ids } = await supportService.creerSupports(
    { id_formation: 4, titre: 'Consignes', contenu: '<p><b>Lire</b> le chapitre 2</p>' },
    FORMATEUR
  );

  assert.deepEqual(ids, [10]);
  const support = creation.mock.calls[0].arguments[0];
  assert.equal(support.fichier, null);
  assert.equal(support.contenu, '<p><strong>Lire</strong> le chapitre 2</p>');
});

test('support sans texte ni fichier, ou texte sans titre : refusé', async () => {
  simulerCreation();
  await assert.rejects(
    supportService.creerSupports({ id_formation: 4, titre: 'Vide', contenu: '<p><br></p>' }, FORMATEUR),
    /texte ou joignez un fichier/
  );
  await assert.rejects(
    supportService.creerSupports({ id_formation: 4, titre: ' ', contenu: '<p>Bonjour</p>' }, FORMATEUR),
    /titre est obligatoire/
  );
});

test("brouillon sans fichier : on ne peut pas lui retirer son texte", async () => {
  mock.method(supportModel, 'getSupportProgramme', async () => ({
    id_support: 7, id_utilisateur: 3, titre: 'Consignes', contenu: '<p>Texte</p>', fichier: null,
  }));
  const maj = mock.method(supportModel, 'updateSupportProgramme', async () => true);

  await assert.rejects(
    supportService.modifierSupportProgramme(7, { contenu: '' }, FORMATEUR),
    /garder un texte/
  );
  assert.equal(maj.mock.callCount(), 0);
});

test('plusieurs fichiers : un support par fichier, titre « titre — nom du fichier »', async () => {
  const creation = simulerCreation();
  const fichiers = [
    { originalname: 'cours.pdf', filename: '1-cours.pdf' },
    { originalname: 'schema.png', filename: '2-schema.png' },
  ];

  const { ids } = await supportService.creerSupports(
    { id_formation: 4, titre: 'Chapitre 2', contenu: '<p>À lire</p>', fichiers },
    FORMATEUR
  );

  assert.deepEqual(ids, [10, 10]);
  const crees = creation.mock.calls.map((c) => c.arguments[0]);
  assert.deepEqual(crees.map((s) => s.titre), ['Chapitre 2 — cours.pdf', 'Chapitre 2 — schema.png']);
  assert.deepEqual(crees.map((s) => s.fichier), ['supports/1-cours.pdf', 'supports/2-schema.png']);
  assert.ok(crees.every((s) => s.contenu === '<p>À lire</p>'), 'le texte va avec chaque fichier');
  // Envoi immédiat : les inscrits sont prévenus pour chaque support
  assert.equal(supportProgrammeService.notifierSupportEnvoye.mock.callCount(), 2);
});

test('un seul fichier : le titre reste tel quel, ou le nom du fichier sans titre', async () => {
  const creation = simulerCreation();
  const fichier = { originalname: 'cours.pdf', filename: '1-cours.pdf' };

  await supportService.creerSupports({ id_formation: 4, titre: 'Chapitre 2', fichiers: [fichier] }, FORMATEUR);
  await supportService.creerSupports({ id_formation: 4, titre: ' ', fichiers: [fichier] }, FORMATEUR);

  assert.deepEqual(creation.mock.calls.map((c) => c.arguments[0].titre), ['Chapitre 2', 'cours.pdf']);
});
