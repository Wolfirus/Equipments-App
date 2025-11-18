const express = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const User = require("../models/User");

const router = express.Router();

// GET /api/users/me  → profil connecté
router.get("/me", auth, async (req, res) => {
  res.json(req.user);
});

// PUT /api/users/me  → mettre à jour son propre profil (name, email)
router.put("/me", auth, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (email) {
      const exists = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (exists) {
        return res.status(400).json({ message: "Email déjà utilisé" });
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { name: name ?? req.user.name, email: email ?? req.user.email } },
      { new: true }
    ).select("-password");

    res.json(updated);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// (optionnel) GET /api/users  → liste des users (admin only)
router.get("/", auth, requireRole("admin"), async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

module.exports = router;
