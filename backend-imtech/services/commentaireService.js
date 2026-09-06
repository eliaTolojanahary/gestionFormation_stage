const db = require('../config/db');
const commentaireModel = require('../models/commentaireModel');

async function listerCommentaires(id_support) {
  return await commentaireModel.getCommentairesBySupport(id_support);
}

async function recupererIdEtudiant(id_utilisateur) {
  return await commentaireModel.getIdEtudiantByUtilisateur(id_utilisateur);
}

async function creerCommentaire({ id_support, id_etudiant, contenu, mentions }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const id_commentaire = await commentaireModel.insertCommentaire(connection, { id_support, id_etudiant, contenu });

    if (mentions && mentions.length > 0) {
      await commentaireModel.insertMentions(connection, id_commentaire, mentions);
    }

    await connection.commit();
    return id_commentaire;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function supprimerCommentaire(id_commentaire) {
  return await commentaireModel.deleteCommentaire(id_commentaire);
}

module.exports = { listerCommentaires, recupererIdEtudiant, creerCommentaire, supprimerCommentaire };