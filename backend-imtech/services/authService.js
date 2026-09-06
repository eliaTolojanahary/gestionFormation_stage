const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUserByEmail, findUserById } = require('../models/userModel'); 

async function authentifier(email, mot_de_passe) {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
  if (!isMatch) return null;

  const token = jwt.sign(
    { id: user.id_utilisateur, role: user.role_nom },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user.id_utilisateur,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role_nom
    }
  };
}

async function recupererProfil(id) {
  return await findUserById(id);
}

module.exports = { authentifier, recupererProfil };