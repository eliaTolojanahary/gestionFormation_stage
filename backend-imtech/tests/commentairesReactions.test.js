require('./setup');
const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const commentaireModel = require('../models/commentaireModel');
const supportModel = require('../models/supportModel');
const formationModel = require('../models/formationModel');
const reactionModel = require('../models/reactionModel');
const { construireFil, creerCommentaire } = require('../services/commentaireService');
const { evaluerFormateurs, ajouterOuModifReaction, AVIS } = require('../services/reactionService');
const { ROLES } = require('../config/roles');

afterEach(() => mock.restoreAll());

const commentaire = (id, date, id_parent = null) => ({
  id_commentaire: id, id_parent, date_commentaire: `2026-10-10T${date}:00`,
});

// ─── Fil de discussion ──────────────────────

test('fil : commentaires principaux du plus récent au plus ancien, réponses dans l\'ordre', () => {
  const fil = construireFil([
    commentaire(1, '10:00'),
    commentaire(2, '11:00'),
    commentaire(3, '12:00', 1),
    commentaire(4, '10:30', 1),
  ]);

  assert.deepEqual(fil.map((c) => c.id_commentaire), [2, 1]);
  assert.deepEqual(fil[1].reponses.map((c) => c.id_commentaire), [4, 3]);
  assert.equal(fil[1].nb_reponses, 2);
  assert.equal(fil[0].nb_reponses, 0);
});

test('fil : une réponse dont le commentaire principal est supprimé disparaît', () => {
  const fil = construireFil([commentaire(1, '10:00'), commentaire(5, '11:00', 99)]);
  assert.deepEqual(fil.map((c) => c.id_commentaire), [1]);
  assert.equal(fil[0].nb_reponses, 0);
});

test('répondre à un commentaire d\'un autre support est refusé', async () => {
  mock.method(supportModel, 'getSupportById', async () => ({ id_support: 1 }));
  mock.method(commentaireModel, 'getCommentaireParent', async () => ({ id_commentaire: 7, id_support: 2, id_parent: null }));

  await assert.rejects(
    creerCommentaire({ idSupport: 1, idParent: 7, contenu: 'Merci' }, { id: 3, role: ROLES.FORMATEUR }),
    { status: 404 }
  );
});

// ─── Mentions ───────────────────────────────

const supportFormation = { id_support: 1, id_formation: 5, id_formateur: 3 };

test('mention : un étudiant ne peut pas mentionner (il répond)', async () => {
  mock.method(supportModel, 'getSupportById', async () => supportFormation);
  await assert.rejects(
    creerCommentaire({ idSupport: 1, contenu: 'Salut @Jean', mentions: [8] }, { id: 20, role: ROLES.ETUDIANT, id_etudiant: 9 }),
    { status: 403 }
  );
});

test('mention : un formateur ne mentionne pas dans la formation d\'un autre', async () => {
  mock.method(supportModel, 'getSupportById', async () => supportFormation);
  await assert.rejects(
    creerCommentaire({ idSupport: 1, contenu: 'Bonjour', mentions: [8] }, { id: 4, role: ROLES.FORMATEUR }),
    { status: 403 }
  );
});

test('mention : seuls les étudiants inscrits à la formation sont acceptés', async () => {
  mock.method(supportModel, 'getSupportById', async () => supportFormation);
  mock.method(formationModel, 'getEtudiantsByFormation', async () => [{ id_etudiant: 8 }]);
  await assert.rejects(
    creerCommentaire({ idSupport: 1, contenu: 'Bonjour', mentions: [8, 42] }, { id: 3, role: ROLES.FORMATEUR }),
    { status: 400 }
  );
});

// ─── Réactions ──────────────────────────────

test('réaction : type inconnu refusé, support non publié introuvable', async () => {
  mock.method(reactionModel, 'getTypeReaction', async () => null);
  await assert.rejects(ajouterOuModifReaction(1, 10, { nom: 'bof' }), { status: 400 });

  mock.restoreAll();
  mock.method(reactionModel, 'getTypeReaction', async () => ({ id_type_reaction: 4, nom: 'dislike' }));
  mock.method(supportModel, 'getSupportById', async () => null);
  await assert.rejects(ajouterOuModifReaction(1, 10, { nom: 'dislike' }), { status: 404 });
});

test('réaction « dislike » enregistrée avec son id en base', async () => {
  mock.method(reactionModel, 'getTypeReaction', async () => ({ id_type_reaction: 4, nom: 'dislike' }));
  mock.method(supportModel, 'getSupportById', async () => ({ id_support: 1 }));
  const ajout = mock.method(reactionModel, 'ajouterOuModifierReaction', async () => {});

  await ajouterOuModifReaction(1, 10, { nom: 'dislike' });
  assert.deepEqual(ajout.mock.calls[0].arguments, [1, 10, 4]);
});

// ─── Avis sur les formateurs ────────────────

const formateur = (nom, nb_like, nb_coeur, nb_utile, nb_dislike) =>
  ({ nom, nb_supports: 2, nb_like, nb_coeur, nb_utile, nb_dislike });

test('avis : compétent à partir de 60 % de réactions positives, avec au moins 5 réactions', () => {
  const avis = Object.fromEntries(evaluerFormateurs([
    formateur('Bon', 3, 1, 2, 4),       // 6 / 10 = 60 %
    formateur('Moyen', 2, 1, 1, 5),     // 4 / 9 = 44 %
    formateur('Nouveau', 2, 0, 0, 0),   // 2 réactions seulement
  ]).map((f) => [f.nom, f]));

  assert.equal(avis.Bon.avis, AVIS.COMPETENT);
  assert.equal(avis.Bon.taux_positif, 60);
  assert.equal(avis.Moyen.avis, AVIS.NON_COMPETENT);
  assert.equal(avis.Nouveau.avis, AVIS.PAS_ASSEZ);
});

test('avis : compétents d\'abord, puis non compétents, puis pas assez d\'avis', () => {
  const ordre = evaluerFormateurs([
    formateur('SansAvis', 0, 0, 0, 0),
    formateur('NonCompetent', 1, 0, 0, 9),
    formateur('Competent', 9, 0, 0, 1),
  ]).map((f) => f.nom);
  assert.deepEqual(ordre, ['Competent', 'NonCompetent', 'SansAvis']);
});
