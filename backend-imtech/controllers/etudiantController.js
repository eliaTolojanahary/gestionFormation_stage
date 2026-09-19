const etudiantService = require('../services/etudiantService');

async function listerEtudiants(req, res) {
  try {
    const etudiants = await etudiantService.listerEtudiants();
    return res.json({ status: "success", data: etudiants });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function detailEtudiant(req, res) {
  try {
    const etudiant = await etudiantService.recupererEtudiant(req.params.id);
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
    const formations = await etudiantService.recupererFormationsEtudiant(req.params.id);
    return res.json({ status: "success", data: formations });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}
async function creerEtudiantController(req, res) {
  try {
    const { nom, prenom, email, mot_de_passe, telephone, id_role } = req.body;

    if (!nom || !prenom || !email || !mot_de_passe || !id_role) {
      return res.status(400).json({ status: 'error', message: 'nom, prenom, email, mot_de_passe et id_role sont requis.' });
    }

    // Dossier différent selon le champ : "photo" -> utilisateurs/, le reste -> etudiants/
    const paths = Object.fromEntries(
      Object.entries(req.files || {}).map(([field, files]) => {
        const dossier = field === 'photo' ? 'utilisateurs' : 'etudiants';
        return [field, `${dossier}/${files[0].filename}`];
      })
    );

    const id_etudiant = await etudiantService.creerEtudiant({
      nom,
      prenom,
      email,
      mot_de_passe,
      telephone,
      id_role,
      photo: paths.photo,
      photo_1: paths.photo_1,
      photo_2: paths.photo_2,
      certificat_residence: paths.certificat_residence,
      photocopie_cin: paths.photocopie_cin,
    });

    return res.status(201).json({ status: 'success', message: 'Étudiant créé.', id_etudiant });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'Cet email existe déjà.' });
    }
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Erreur serveur.' });
  }
}

async function updateEtudiantController(req, res) {
  try {
    const { nom, prenom, email, telephone, id_role } = req.body;

    const paths = Object.fromEntries(
      Object.entries(req.files || {}).map(([field, files]) => {
        const dossier = field === 'photo' ? 'utilisateurs' : 'etudiants';
        return [field, `${dossier}/${files[0].filename}`];
      })
    );

    const updateData = {
      nom,
      prenom,
      email,
      telephone,
      id_role,
      ...paths, 
    };

    const updated = await etudiantService.modifierEtudiant(req.params.id, updateData);
    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'Étudiant introuvable.' });
    }

    return res.json({ status: 'success', data: updateData });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: "Erreur lors de la mise à jour de l'étudiant." });
  }
}

async function deleteEtudiantController(req, res) {
  try {
    const ok = await etudiantService.supprimerEtudiant(req.params.id);
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