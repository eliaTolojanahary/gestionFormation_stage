require('./setup');
const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const decrochageModel = require('../models/decrochageModel');
const alerteModel = require('../models/alerteModel');
const attestationService = require('../services/attestationService');
const formateurNoteModel = require('../models/formateurNoteModel');
const dependanceService = require('../services/dependanceService');
const notifService = require('../services/notifService');
const service = require('../services/decrochageService');
const { verifierAlertes, messageDecrochages } = require('../services/alerteService');

afterEach(() => mock.restoreAll());

// Lundi 26/10/2026 ; les 10 derniers jours de cours sont du 12 au 23/10
const AUJOURDHUI = '2026-10-26';
const FENETRE = ['2026-10-23', '2026-10-22', '2026-10-21', '2026-10-20', '2026-10-19',
  '2026-10-16', '2026-10-15', '2026-10-14', '2026-10-13', '2026-10-12'];

function inscription(champs = {}) {
  return {
    id_inscription: 17, id_utilisateur: 16, prenom: 'Sitraka', nom: 'Rakotondrabe', formation_nom: 'Réseaux',
    date_debut: '2026-09-28', derniere_presence: '2026-10-23', nb_retards: 0, montant_retard: '0.00',
    ...champs,
  };
}

const evaluer = (champs, presences = FENETRE) => service.evaluerInscription(inscription(champs), presences, AUJOURDHUI);

test('fenêtre : les 10 derniers jours de cours avant aujourd’hui, sans week-end ni jour avant le début', () => {
  assert.deepEqual(service.derniersJoursDeCours(AUJOURDHUI, '2026-09-28', 10), FENETRE);
  assert.deepEqual(service.derniersJoursDeCours(AUJOURDHUI, '2026-10-21', 10), ['2026-10-23', '2026-10-22', '2026-10-21']);
});

test('élève assidu, connecté, à jour : score 0, rien à signaler', () => {
  const r = evaluer({});
  assert.equal(r.score, 0);
  assert.equal(r.niveau, null);
  assert.deepEqual(r.raisons, []);
});

test('assiduité : 75 % et plus → 0, 50 à 74 % → 1, moins de 50 % → 2', () => {
  assert.equal(evaluer({}, FENETRE.slice(0, 8)).points.assiduite, 0); // 80 %
  assert.equal(evaluer({}, FENETRE.slice(0, 5)).points.assiduite, 1); // 50 %
  const faible = evaluer({}, FENETRE.slice(0, 4)); // 40 %
  assert.equal(faible.points.assiduite, 2);
  assert.equal(faible.niveau, 'a_surveiller');
  assert.deepEqual(faible.raisons, ['Présent 4 jours sur les 10 derniers jours de cours']);
});

test("l'élève qui ne vient plus du tout est à contacter (silence + assiduité)", () => {
  const r = evaluer({ derniere_presence: '2026-10-13' }, ['2026-10-12', '2026-10-13']);
  assert.deepEqual(r.points, { assiduite: 2, silence: 2, paiement: 0 });
  assert.equal(r.niveau, 'a_contacter');
  assert.deepEqual(r.raisons, ['Présent 2 jours sur les 10 derniers jours de cours', 'Aucun cours ouvert depuis 13 jours']);
});

test('silence : compté depuis le début de la formation si l’étudiant ne s’est jamais connecté depuis', () => {
  const r = evaluer({ derniere_presence: '2026-09-01' }, []);
  assert.equal(r.jours_silence, 28);
  assert.equal(r.raisons[1], 'Aucun cours ouvert depuis le début de la formation (28 jours)');
  assert.equal(evaluer({ derniere_presence: null }, []).jours_silence, 28);
  assert.equal(evaluer({ derniere_presence: '2026-10-20' }).points.silence, 0); // 6 jours
  assert.equal(evaluer({ derniere_presence: '2026-10-19' }).points.silence, 2); // 7 jours
});

test('paiement : 1 point par échéance en retard, au plus 2 ; un seul problème ne suffit pas à contacter', () => {
  const unRetard = evaluer({ nb_retards: 1, montant_retard: '150000.00' });
  assert.equal(unRetard.score, 1);
  assert.equal(unRetard.niveau, null);

  const troisRetards = evaluer({ nb_retards: 3, montant_retard: '300000.00' });
  assert.equal(troisRetards.points.paiement, 2);
  assert.equal(troisRetards.niveau, 'a_surveiller');
  assert.deepEqual(troisRetards.raisons, ['3 échéances en retard (300 000 Ar)']);

  // Irrégulier (1) + 2 retards (2) : à surveiller ; absent (2) + 2 retards (2) : à contacter
  assert.equal(evaluer({ nb_retards: 2 }, FENETRE.slice(0, 6)).niveau, 'a_surveiller');
  assert.equal(evaluer({ nb_retards: 2 }, FENETRE.slice(0, 3)).niveau, 'a_contacter');
});

test('formation commencée depuis moins de 5 jours de cours : pas évaluée ; à 5 jours, fenêtre réduite', () => {
  assert.equal(evaluer({ date_debut: '2026-10-21' }, []), null); // 3 jours de cours
  const cinqJours = evaluer({ date_debut: '2026-10-19', derniere_presence: '2026-10-23' }, FENETRE.slice(0, 5));
  assert.equal(cinqJours.jours_fenetre, 5);
  assert.equal(cinqJours.taux_assiduite, 100);
});

test('classement : à contacter d’abord, puis à surveiller, score décroissant ; les normaux sont retirés', () => {
  const lignes = service.classerRisques(
    [
      inscription({ id_inscription: 1, id_utilisateur: 1 }), // normal
      inscription({ id_inscription: 2, id_utilisateur: 2, nb_retards: 2 }), // à surveiller, 2
      inscription({ id_inscription: 3, id_utilisateur: 3, derniere_presence: '2026-10-12' }), // à contacter, 4
      inscription({ id_inscription: 4, id_utilisateur: 4, nb_retards: 1 }), // à surveiller, 3
    ],
    new Map([[1, FENETRE], [2, FENETRE], [3, ['2026-10-12']], [4, FENETRE.slice(0, 4)]]),
    AUJOURDHUI
  );
  assert.deepEqual(lignes.map((l) => [l.id_inscription, l.niveau, l.score]),
    [[3, 'a_contacter', 4], [4, 'a_surveiller', 3], [2, 'a_surveiller', 2]]);
});

function simulerTableauDeBord() {
  mock.method(decrochageModel, 'getInscriptionsEnCours', async () => [
    inscription({ id_inscription: 1, id_utilisateur: 1 }), // normal
    inscription({ id_inscription: 2, id_utilisateur: 2, nb_retards: 2, montant_retard: '300000.00', prenom: 'Andry', nom: 'Rakotoarisoa', formation_nom: 'Python' }), // à surveiller
    inscription({ id_inscription: 3, id_utilisateur: 3, derniere_presence: '2026-10-12' }), // à contacter
    inscription({ id_inscription: 4, id_utilisateur: 4, nb_retards: 1, montant_retard: '150000.00', prenom: 'Hérilala', nom: 'Andriamanana' }), // à surveiller
  ]);
  const presences = { 1: FENETRE, 2: FENETRE, 3: ['2026-10-12'], 4: FENETRE.slice(0, 4) };
  mock.method(decrochageModel, 'getPresences', async (ids) =>
    ids.flatMap((id) => presences[id].map((jour) => ({ id_utilisateur: id, jour }))));
}

const PAGE_1 = { page: 1, limite: 10, offset: 0 };
const ids = (page) => page.lignes.map((l) => l.id_inscription);

test('page du tableau de bord : découpe après classement, compteurs sur toute la liste', async () => {
  simulerTableauDeBord();
  const page2 = await service.listerPageARisque({}, { page: 2, limite: 2, offset: 2 }, AUJOURDHUI);
  assert.deepEqual(ids(page2), [2]);
  assert.equal(page2.total, 3);
  assert.deepEqual(page2.compteurs, { a_contacter: 1, a_surveiller: 2 });
  assert.equal(page2.lignes[0].email, undefined);
});

test('tableau de bord : recherche sans accents (nom, prénom, formation) et filtre par niveau', async () => {
  simulerTableauDeBord();
  const lister = (filtres) => service.listerPageARisque(filtres, PAGE_1, AUJOURDHUI);

  const herilala = await lister({ recherche: 'herila' });
  assert.deepEqual(ids(herilala), [4]);
  assert.equal(herilala.total, 1);
  assert.deepEqual(herilala.compteurs, { a_contacter: 1, a_surveiller: 2 }); // la recherche ne les change pas
  assert.deepEqual(ids(await lister({ recherche: 'réseaux sitraka' })), [3]);
  assert.deepEqual(ids(await lister({ recherche: 'python' })), [2]);
  assert.deepEqual(ids(await lister({ recherche: 'inconnu' })), []);

  assert.deepEqual(ids(await lister({})), [3, 4, 2]); // les plus urgents d'abord
  assert.deepEqual(ids(await lister({ niveau: 'a_contacter' })), [3]);
  const surveiller = await lister({ niveau: 'a_surveiller' });
  assert.deepEqual(ids(surveiller), [4, 2]);
  assert.equal(surveiller.total, 2);
  assert.deepEqual(ids(await lister({ niveau: 'a_surveiller', recherche: 'python' })), [2]);
  assert.deepEqual(ids(await lister({ niveau: 'a_contacter', recherche: 'python' })), []);
});

// ─── Relance ───

function simulerRelance({ enCours = 1, reservee = true, retards = 0 } = {}) {
  mock.method(dependanceService, 'verifierInscription', async () => ({}));
  mock.method(decrochageModel, 'getInscription', async () => ({
    ...inscription({ nb_retards: retards, montant_retard: retards ? '150000.00' : '0.00' }),
    email: 'sitraka@imtech.test', en_cours: enCours, derniere_relance: '2026-10-25T08:00:00',
  }));
  const reserver = mock.method(decrochageModel, 'reserverRelance', async () => reservee);
  const envoyer = mock.method(notifService, 'notifierEtudiant', async () => ({ emailEnvoye: true }));
  return { reserver, envoyer };
}

test("relance : message bienveillant sans parler de risque, et l'échéance en retard si besoin", async () => {
  const { reserver, envoyer } = simulerRelance({ retards: 1 });
  assert.deepEqual(await service.relancer(17, 2), { emailEnvoye: true });

  assert.deepEqual(reserver.mock.calls[0].arguments, [17, 3]);
  const envoi = envoyer.mock.calls[0].arguments[0];
  assert.equal(envoi.id_utilisateur, 16);
  assert.equal(envoi.id_auteur, 2);
  assert.match(envoi.message, /Tout va bien \?/);
  assert.match(envoi.message, /1 échéance en retard \(150 000 Ar\)/);
  assert.doesNotMatch(`${envoi.message} ${envoi.contenuHtml}`, /risque|décroch/i);
});

test('relance refusée : moins de 3 jours après la précédente, ou formation pas en cours', async () => {
  const { envoyer } = simulerRelance({ reservee: false });
  await assert.rejects(service.relancer(17, 2), (err) => err.status === 409 && /déjà été relancé le 25\/10\/2026/.test(err.message));

  mock.restoreAll();
  const second = simulerRelance({ enCours: 0 });
  await assert.rejects(service.relancer(17, 2), (err) => err.status === 409 && /pas en cours/.test(err.message));
  assert.equal(second.reserver.mock.callCount(), 0);
  assert.equal(envoyer.mock.callCount(), 0);
});

// ─── Alerte automatique ───

test("tâche horaire : l'Accueil est prévenu une fois par épisode des étudiants passés à contacter", async () => {
  mock.method(alerteModel, 'getEcheancesARappeler', async () => []);
  mock.method(formateurNoteModel, 'getInscriptionsARappeler', async () => []);
  mock.method(attestationService, 'listerAttestations', async () => ({ pretes: [], bloquees: [] }));
  mock.method(service, 'listerEtudiantsARisque', async () => [
    { id_inscription: 17, prenom: 'Sitraka', nom: 'Rakotondrabe', formation_nom: 'Réseaux', niveau: 'a_contacter' },
    { id_inscription: 21, prenom: 'Rindra', nom: 'Rasoamanarivo', formation_nom: 'Maintenance', niveau: 'a_contacter' },
    { id_inscription: 19, prenom: 'Andry', nom: 'Rakotoarisoa', formation_nom: 'Python', niveau: 'a_surveiller' },
  ]);
  const oublier = mock.method(alerteModel, 'oublierAlertesSauf', async () => {});
  // Rindra était déjà signalée : pas de deuxième alerte
  mock.method(alerteModel, 'reserverAlerte', async (_type, id) => id !== 21);
  const personnel = mock.method(notifService, 'notifierPersonnel', async () => 2);

  const { decrochages } = await verifierAlertes();

  assert.equal(decrochages, 1);
  assert.deepEqual(oublier.mock.calls[0].arguments, ['decrochage', [17, 21]]);
  assert.equal(personnel.mock.callCount(), 1);
  assert.equal(personnel.mock.calls[0].arguments[0],
    '1 étudiant à contacter, risque de décrochage (tableau de bord) : Sitraka Rakotondrabe (Réseaux).');
});

test('message groupé : au-delà de 10 noms, seulement le nombre restant', () => {
  const liste = Array.from({ length: 12 }, (_, n) => ({ prenom: `E${n}`, nom: 'X', formation_nom: 'Web' }));
  assert.match(messageDecrochages(liste), /^12 étudiants à contacter.* et 2 autre\(s\)\.$/);
});
