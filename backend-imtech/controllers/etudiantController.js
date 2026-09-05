const {
  getAllEtudiants, getEtudiantById, getFormationsByEtudiant,
  creerEtudiant, updateEtudiant, deleteEtudiant
} = require('../models/etudiantModel');

async function listerEtudiants(req, res) {
  try {
    const etudiants = await getAllEtudiants();
    return res.json({ status: "success", data: etudiants });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function detailEtudiant(req, res) {
  try {
    const etudiant = await getEtudiantById(req.params.id);
    if (!etudiant) {
      return res.status(404).json({ status: "error", message: "Étudiant introuvable." });
    }
    return res.json({ status: "success", data: etudiant });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function formationsEtudiant(req, res) {
  try {
    const formations = await getFormationsByEtudiant(req.params.id);
    return res.json({ status: "success", data: formations });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function creerEtudiantController(req, res) {
  try {
   
    const { nom, prenom, email, mot_de_passe, telephone, id_role_etudiant, photo_1, photo_2, certificat_residence, photocopie_cin } = req.body;

    if (!nom || !prenom || !email || !mot_de_passe || !id_role_etudiant) {
      return res.status(400).json({ status: "error", message: "nom, prenom, email, mot_de_passe et id_role_etudiant sont requis." });
    }

    const id_etudiant = await creerEtudiant({ nom, prenom, email, mot_de_passe, telephone, id_role_etudiant, photo_1, photo_2, certificat_residence, photocopie_cin });

    return res.status(201).json({ status: "success", message: "Étudiant créé.", id_etudiant });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: "error", message: "Cet email existe déjà." });
    }
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function updateEtudiantController(req, res) {
  try {
    const ok = await updateEtudiant(req.params.id, req.body);
    if (!ok) {
      return res.status(404).json({ status: "error", message: "Étudiant introuvable." });
    }
    return res.json({ status: "success", message: "Étudiant mis à jour." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function deleteEtudiantController(req, res) {
  try {
    const ok = await deleteEtudiant(req.params.id);
    if (!ok) {
      return res.status(404).json({ status: "error", message: "Étudiant introuvable." });
    }
    return res.json({ status: "success", message: "Étudiant désactivé." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

module.exports = { listerEtudiants, detailEtudiant, formationsEtudiant, creerEtudiantController, updateEtudiantController, deleteEtudiantController };