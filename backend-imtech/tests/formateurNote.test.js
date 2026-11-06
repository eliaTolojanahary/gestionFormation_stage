require('./setup');
const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const formateurNoteModel = require('../models/formateurNoteModel');
const notifService = require('../services/notifService');
const service = require('../services/formateurNoteService');

afterEach(() => mock.restoreAll());

const etudiant = { id: 10, id_etudiant: 7 };

function inscription(champs = {}) {
  return {
    id_inscription: 3, id_etudiant: 7, valide: 1, ouvert: 1, commentaire_existe: 0, id_formateur: 5,
    formation_nom: 'Web', etudiant_prenom: 'Rova', etudiant_nom: 'Rakoto', formateur_prenom: 'Aina', formateur_nom: 'Rabe',
    ...champs,
  };
}

test("l'étudiant commente son formateur : enregistré pour le formateur de la formation, personnel prévenu", async () => {
  mock.method(formateurNoteModel, 'getInscriptionACommenter', async () => inscription());
  const inserer = mock.method(formateurNoteModel, 'insererCommentaire', async () => 1);
  const prevenir = mock.method(notifService, 'notifierPersonnel', async () => 2);

  await service.commenter(3, '  Très clair  ', etudiant);

  assert.deepEqual(inserer.mock.calls[0].arguments[0], { id_utilisateur: 5, id_etudiant: 7, id_inscription: 3, commentaire: 'Très clair' });
  assert.match(prevenir.mock.calls[0].arguments[0], /Rova Rakoto a commenté Aina Rabe \(Web\)/);
});

test('commentaire refusé : vide, trop long, autre étudiant, trop tôt ou déjà écrit', async () => {
  const lire = mock.method(formateurNoteModel, 'getInscriptionACommenter', async () => inscription());
  const inserer = mock.method(formateurNoteModel, 'insererCommentaire', async () => 1);

  await assert.rejects(service.commenter(3, '   ', etudiant), (err) => err.status === 400);
  await assert.rejects(service.commenter(3, 'x'.repeat(2001), etudiant), (err) => err.status === 400);
  await assert.rejects(service.commenter(3, 'Bien', { id_etudiant: 99 }), (err) => err.status === 403);

  lire.mock.mockImplementation(async () => inscription({ ouvert: 0 }));
  await assert.rejects(service.commenter(3, 'Bien', etudiant), (err) => err.status === 409 && /veille/.test(err.message));
  lire.mock.mockImplementation(async () => inscription({ commentaire_existe: 1 }));
  await assert.rejects(service.commenter(3, 'Bien', etudiant), (err) => err.status === 409 && /déjà/.test(err.message));
  lire.mock.mockImplementation(async () => null);
  await assert.rejects(service.commenter(3, 'Bien', etudiant), (err) => err.status === 404);

  assert.equal(inserer.mock.callCount(), 0);
});

test('deux envois simultanés : le doublon refusé par la base devient un 409', async () => {
  mock.method(formateurNoteModel, 'getInscriptionACommenter', async () => inscription());
  mock.method(formateurNoteModel, 'insererCommentaire', async () => {
    throw Object.assign(new Error('doublon'), { code: 'ER_DUP_ENTRY' });
  });
  await assert.rejects(service.commenter(3, 'Bien', etudiant), (err) => err.status === 409);
});

test('la note va de 0 à 10 et accepte la virgule', async () => {
  const noter = mock.method(formateurNoteModel, 'setNote', async () => true);

  await service.noterCommentaire(4, '7,5');
  await service.noterCommentaire(4, 0);
  assert.deepEqual(noter.mock.calls.map((c) => c.arguments), [[4, 7.5], [4, 0]]);

  for (const note of ['', null, -1, 10.5, 'abc']) {
    await assert.rejects(service.noterCommentaire(4, note), (err) => err.status === 400);
  }
  noter.mock.mockImplementation(async () => false);
  await assert.rejects(service.noterCommentaire(99, 5), (err) => err.status === 404);
});

test('classement : 10 points de réactions + 10 de commentaires, les notes incomplètes après', () => {
  const avis = [
    { id_utilisateur: 1, total_reactions: 10, taux_positif: 80 }, // 8 + 6 = 14
    { id_utilisateur: 2, total_reactions: 10, taux_positif: 70 }, // 7 + 9 = 16
    { id_utilisateur: 3, total_reactions: 10, taux_positif: 95 }, // pas encore noté
    { id_utilisateur: 4, total_reactions: 3, taux_positif: 100 }, // trop peu de réactions
  ];
  const moyennes = [
    { id_utilisateur: 1, note_commentaires: '6.0000', nb_commentaires: 2, nb_notes: 2 },
    { id_utilisateur: 2, note_commentaires: '9.0000', nb_commentaires: 3, nb_notes: 1 },
    { id_utilisateur: 3, note_commentaires: null, nb_commentaires: 1, nb_notes: 0 },
    { id_utilisateur: 4, note_commentaires: '8.0000', nb_commentaires: 1, nb_notes: 1 },
  ];

  const classement = service.classerFormateurs(avis, moyennes);

  assert.deepEqual(classement.map((f) => f.id_utilisateur), [2, 1, 3, 4]);
  assert.deepEqual(classement[0], {
    id_utilisateur: 2, total_reactions: 10, taux_positif: 70,
    note_reactions: 7, note_commentaires: 9, nb_commentaires: 3, note_finale: 16,
  });
  assert.equal(classement[2].note_finale, null);
  assert.equal(classement[3].note_reactions, null);
});
