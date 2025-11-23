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
      {
        $set: {
          name: name ?? req.user.name,
          email: email ?? req.user.email,
        },
      },
      { new: true }
    ).select("-password");

    res.json(updated);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /api/users  → liste des users (admin only)
router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PATCH /api/users/:id/role  → changer le rôle (admin only)
// ⚠️ plus spécifique, donc avant /:id
router.patch("/:id/role", auth, requireRole("admin"), async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ["user", "supervisor", "admin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Rôle invalide" });
    }

    // empêcher un admin de retirer son propre rôle
    if (req.user._id.toString() === req.params.id && role !== "admin") {
      return res
        .status(400)
        .json({ message: "Vous ne pouvez pas retirer votre propre rôle admin." });
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role } },
      { new: true }
    ).select("-password");

    if (!updated) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PATCH /api/users/:id  → modifier nom/email d’un utilisateur (admin only)
router.patch("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name && !email) {
      return res
        .status(400)
        .json({ message: "Aucun champ à mettre à jour (name / email)." });
    }

    if (email) {
      const exists = await User.findOne({
        email,
        _id: { $ne: req.params.id },
      });
      if (exists) {
        return res.status(400).json({ message: "Email déjà utilisé" });
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(name && { name }),
          ...(email && { email }),
        },
      },
      { new: true }
    ).select("-password");

    if (!updated) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Admin update user error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// DELETE /api/users/:id  → supprimer un utilisateur (admin only)
router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    // empêcher la suppression de soi-même
    if (req.user._id.toString() === req.params.id) {
      return res
        .status(400)
        .json({ message: "Vous ne pouvez pas supprimer votre propre compte admin." });
    }

    const deleted = await User.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.json({ message: "Utilisateur supprimé" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
