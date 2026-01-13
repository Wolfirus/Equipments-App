module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    const role = (req.user?.role || "").toLowerCase();
    const ok = allowedRoles.map(r => r.toLowerCase()).includes(role);

    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé",
      });
    }
    next();
  };
};
