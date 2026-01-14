// middleware/requireRole.js
module.exports = (...allowedRoles) => {
  // normaliser les rôles autorisés une seule fois
  const allowed = allowedRoles.map((r) => String(r).toLowerCase());

  return (req, res, next) => {
    // ✅ Non authentifié
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: "Non authentifié",
      });
    }

    // ✅ Case-insensitive
    const role = String(req.user.role).toLowerCase();
    const ok = allowed.includes(role);

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé: permissions insuffisantes",
      });
    }

    return next();
  };
};
