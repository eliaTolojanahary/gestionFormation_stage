const jwt = require('jsonwebtoken');


function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      status: "error", 
      message: "Accès refusé. Token manquant." 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key_imtech');
    
    req.user = decoded;
    
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