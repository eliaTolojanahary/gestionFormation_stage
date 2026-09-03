const jwt = require('jsonwebtoken');

// Middleware pour vérifier la présence et la validité du Token JWT
function verifyToken(req, res, next) {
  // Récupération de l'en-tête Authorization (ex: "Bearer eyJhbGci...")
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Si aucun token n'est fourni
  if (!token) {
    return res.status(401).json({ 
      status: "error", 
      message: "Accès refusé. Token manquant." 
    });
  }

  try {
    // Vérification et décodage du token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key_imtech');
    
    // Injection des données de l'utilisateur (id, role) dans l'objet req
    req.user = decoded;
    
    // Passage au contrôleur suivant
    next();

  } catch (error) {
    return res.status(403).json({ 
      status: "error", 
      message: "Token invalide ou expiré." 
    });
  }
}
function checkRole(...rolesAutorises) {
  return (req, res, next) => {
    if (!req.user || !rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Accès refusé : rôle insuffisant pour cette action."
      });
    }
    next();
  };
}



module.exports = {
  verifyToken,checkRole
};