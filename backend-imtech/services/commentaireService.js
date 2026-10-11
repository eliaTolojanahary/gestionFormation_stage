// Service des commentaires sur les supports : fil de discussion (commentaires principaux +
// réponses) et mentions d'étudiants.
const commentaireModel = require('../models/commentaireModel')
const supportModel = require('../models/supportModel')
const notifService = require('./notifService')
const { ROLES } = require('../config/roles')
const { avecTransaction } = require('../utils/transaction')
const { badRequest, forbidden, notFound } = require('../utils/errors')

// Range les commentaires en fil de discussion, comme sur les réseaux sociaux :
// commentaires principaux du plus récent au plus ancien, chacun avec ses réponses
// (ordre chronologique) et leur nombre. Les réponses dont le commentaire principal
// a été supprimé disparaissent avec lui. Fonction pure, testée.
function construireFil(commentaires) {
  const principaux = commentaires
    .filter((c) => !c.id_parent)
    .map((c) => ({ ...c, reponses: [] }))
  const parId = new Map(principaux.map((c) => [c.id_commentaire, c]))

  for (const c of commentaires) {
    if (c.id_parent) parId.get(c.id_parent)?.reponses.push(c)
  }

  const date = (c) => new Date(c.date_commentaire).getTime()
  return principaux
    .map((c) => ({
      ...c,
      reponses: c.reponses.sort((a, b) => date(a) - date(b)),
      nb_reponses: c.reponses.length,
    }))
    .sort((a, b) => date(b) - date(a))
}

async function listerCommentairesParSupport(idSupport) {
  return construireFil(await commentaireModel.getCommentairesBySupport(idSupport))
}

// Réponse : le commentaire visé doit exister sur le même support.
// Une réponse à une réponse est rattachée au même commentaire principal (un seul niveau).
async function trouverParent(idParent, idSupport) {
  if (!idParent) return null
  const parent = await commentaireModel.getCommentaireParent(idParent)
  if (!parent || Number(parent.id_support) !== Number(idSupport)) {
    throw notFound('Le commentaire auquel vous répondez est introuvable.')
  }
  return { ...parent, id_principal: parent.id_parent || parent.id_commentaire }
}

// `auteur` = utilisateur connecté (req.user : id, role, id_etudiant)
// `idParent` (facultatif) = commentaire auquel on répond
async function creerCommentaire({ idSupport, idParent, contenu, mentions }, auteur) {
  if (!idSupport) throw badRequest('Le support est requis.')
  if (!contenu || !contenu.trim()) throw badRequest('Le contenu du commentaire est requis.')

  const support = await supportModel.getSupportById(idSupport)
  if (!support) throw notFound('Support introuvable ou désactivé.')
  const parent = await trouverParent(idParent, idSupport)

  // id_etudiant renseigné seulement si l'auteur est un étudiant (sinon formateur / admin)
  let idEtudiant = null
  if (auteur.role === ROLES.ETUDIANT) {
    idEtudiant = auteur.id_etudiant
    if (!idEtudiant) throw forbidden('Profil étudiant introuvable.')
  }

  // Mentions sans doublon, en excluant l'auteur lui-même
  const mentionsUniques = Array.isArray(mentions)
    ? [...new Set(mentions.map(Number))].filter((id) => id && id !== Number(idEtudiant))
    : []

  // Commentaire + mentions enregistrés ensemble (transaction)
  const idCommentaire = await avecTransaction(async (connection) => {
    const id = await commentaireModel.insertCommentaire(connection, {
      idSupport,
      idParent: parent?.id_principal,
      idEtudiant,
      idUtilisateur: auteur.id,
      contenu: contenu.trim(),
    })
    if (mentionsUniques.length > 0) {
      await commentaireModel.insertMentions(connection, id, mentionsUniques)
    }
    return id
  })

  // Notification après le commit : un échec d'envoi ne doit pas annuler le commentaire
  if (mentionsUniques.length > 0) {
    try {
      await notifService.notifierMention({
        idCommentaire,
        idSupport,
        mentions: mentionsUniques,
        auteur: { idUtilisateur: auteur.id },
      })
    } catch (notifError) {
      console.warn('Notification de mention échouée:', notifError.message)
    }
  }

  // Prévient l'auteur du commentaire auquel on répond (sauf s'il se répond à lui-même)
  if (parent && parent.id_utilisateur_auteur && Number(parent.id_utilisateur_auteur) !== Number(auteur.id)) {
    try {
      await notifService.notifierReponse({ idDestinataire: parent.id_utilisateur_auteur, idSupport, auteur: { idUtilisateur: auteur.id } })
    } catch (notifError) {
      console.warn('Notification de réponse échouée:', notifError.message)
    }
  }

  // Renvoie le commentaire complet (nom, photo de l'auteur...) pour l'afficher tout de suite
  const commentaires = await commentaireModel.getCommentairesBySupport(idSupport)
  return commentaires.find((c) => c.id_commentaire === idCommentaire) || { id_commentaire: idCommentaire }
}

// Super Admin : tout ; Formateur : commentaires de ses formations ; Étudiant : ses propres commentaires.
async function supprimerCommentaire(idCommentaire, auteur) {
  const commentaire = await commentaireModel.getCommentaireAvecFormateur(idCommentaire)
  if (!commentaire) throw notFound('Commentaire introuvable.')

  const autorise =
    auteur.role === ROLES.SUPER_ADMIN ||
    (auteur.role === ROLES.FORMATEUR && Number(commentaire.id_formateur) === Number(auteur.id)) ||
    (auteur.role === ROLES.ETUDIANT && auteur.id_etudiant && Number(commentaire.id_etudiant) === Number(auteur.id_etudiant))

  if (!autorise) {
    throw forbidden(auteur.role === ROLES.FORMATEUR
      ? 'Vous ne pouvez supprimer que les commentaires de vos formations.'
      : 'Vous ne pouvez supprimer que vos propres commentaires.')
  }

  await commentaireModel.deleteCommentaire(idCommentaire)
}

module.exports = {
  construireFil,
  listerCommentairesParSupport,
  creerCommentaire,
  supprimerCommentaire,
}
