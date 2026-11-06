// Note des formateurs sur 20 :
//   10 points calculés : % de réactions positives sur leurs supports (voir reactionService)
//   10 points manuels : moyenne des notes données par l'Accueil ou le Super Admin aux commentaires
//   que les étudiants écrivent à partir de la veille de la fin de formation.
// Ce commentaire est obligatoire pour obtenir l'attestation.
const formateurNoteModel = require('../models/formateurNoteModel');
const reactionService = require('./reactionService');
const notifService = require('./notifService');
const { badRequest, conflict, forbidden, notFound } = require('../utils/errors');

const NOTE_MAX = 10;
const TAILLE_MAX_COMMENTAIRE = 2000;

const arrondi = (valeur) => Math.round(valeur * 100) / 100;

// ─── Étudiant ───

async function listerACommenter(auteur) {
  if (!auteur.id_etudiant) return [];
  return formateurNoteModel.getACommenter(auteur.id_etudiant);
}

// Le commentaire part à l'Accueil et au Super Admin ; le formateur ne le reçoit pas.
async function commenter(id_inscription, commentaire, auteur) {
  const texte = String(commentaire ?? '').trim();
  if (!texte) throw badRequest('Le commentaire est obligatoire.');
  if (texte.length > TAILLE_MAX_COMMENTAIRE) {
    throw badRequest(`Le commentaire ne doit pas dépasser ${TAILLE_MAX_COMMENTAIRE} caractères.`);
  }

  const inscription = await formateurNoteModel.getInscriptionACommenter(id_inscription);
  if (!inscription) throw notFound('Inscription introuvable.');
  if (Number(inscription.id_etudiant) !== Number(auteur.id_etudiant)) {
    throw forbidden('Cette inscription ne vous appartient pas.');
  }
  if (!Number(inscription.valide) || !Number(inscription.ouvert)) {
    throw conflict('Le commentaire ouvre la veille de la fin de la formation.');
  }
  if (Number(inscription.commentaire_existe)) throw conflict('Vous avez déjà commenté ce formateur.');

  try {
    await formateurNoteModel.insererCommentaire({
      id_utilisateur: inscription.id_formateur,
      id_etudiant: inscription.id_etudiant,
      id_inscription: inscription.id_inscription,
      commentaire: texte,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw conflict('Vous avez déjà commenté ce formateur.');
    throw error;
  }

  // Un échec de notification n'annule pas le commentaire
  await notifService.notifierPersonnel(
    `${inscription.etudiant_prenom} ${inscription.etudiant_nom} a commenté ${inscription.formateur_prenom} ` +
    `${inscription.formateur_nom} (${inscription.formation_nom}). Commentaire à noter.`
  ).catch((error) => console.warn('Notification du personnel échouée :', error.message));
}

// ─── Accueil et Super Admin ───

async function listerCommentaires(filtres = {}, pagination = null) {
  if (!pagination) return formateurNoteModel.getCommentaires(filtres);
  const [lignes, total] = await Promise.all([
    formateurNoteModel.getCommentaires(filtres, pagination),
    formateurNoteModel.compterCommentaires(filtres),
  ]);
  return { lignes, total };
}

// Accepte "7,5" comme "7.5", puis arrondit à 2 décimales
async function noterCommentaire(id_note, note) {
  const valeur = Number(String(note ?? '').trim().replace(',', '.'));
  if (String(note ?? '').trim() === '' || !Number.isFinite(valeur) || valeur < 0 || valeur > NOTE_MAX) {
    throw badRequest(`La note doit être comprise entre 0 et ${NOTE_MAX}.`);
  }
  const ok = await formateurNoteModel.setNote(id_note, arrondi(valeur));
  if (!ok) throw notFound('Commentaire introuvable.');
}

// ─── Classement ───

/**
 * Ajoute à l'avis par réactions la note sur 20 et trie (fonction pure, testée).
 * Comme pour l'avis, on ne note pas sur moins de AVIS_MINIMUM réactions. Sans ses deux parties, un
 * formateur n'a pas de note sur 20 : il passe après les autres, dans l'ordre de l'avis.
 */
function classerFormateurs(avis, moyennes) {
  const parFormateur = new Map(moyennes.map((m) => [Number(m.id_utilisateur), m]));

  const lignes = avis.map((f) => {
    const moyenne = parFormateur.get(Number(f.id_utilisateur));
    const note_reactions = f.total_reactions >= reactionService.AVIS_MINIMUM ? arrondi(f.taux_positif / 10) : null;
    const note_commentaires = Number(moyenne?.nb_notes) > 0 ? arrondi(Number(moyenne.note_commentaires)) : null;
    const complete = note_reactions !== null && note_commentaires !== null;
    return {
      ...f,
      note_reactions,
      note_commentaires,
      nb_commentaires: Number(moyenne?.nb_commentaires) || 0,
      note_finale: complete ? arrondi(note_reactions + note_commentaires) : null,
    };
  });

  return lignes.sort((a, b) => (b.note_finale ?? -1) - (a.note_finale ?? -1));
}

async function classementFormateurs(periode = {}) {
  const [avis, moyennes] = await Promise.all([
    reactionService.avisFormateurs(periode),
    formateurNoteModel.getMoyennes(periode),
  ]);
  return classerFormateurs(avis, moyennes);
}

module.exports = {
  listerACommenter, commenter, listerCommentaires, noterCommentaire, classerFormateurs, classementFormateurs,
};
