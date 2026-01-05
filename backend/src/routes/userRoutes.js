const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const User = require("../models/User");

/**
 * GET /api/users
 * Admin only - list users
 */
router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.json(users); // ✅ retourne un tableau direct (simple côté React)
  } catch (err) {
    console.error("GET /users error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

/**
 * GET /api/users/me
 * Auth user - current profile
 */
router.get("/me", auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select("-password");
    if (!me) return res.status(404).json({ message: "Utilisateur introuvable" });
    return res.json(me);
  } catch (err) {
    console.error("GET /users/me error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

/**
 * PATCH /api/users/:id
 * Admin only - update name/email
 */
router.patch("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const { name, email } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { ...(name !== undefined ? { name } : {}), ...(email !== undefined ? { email } : {}) },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "Utilisateur introuvable" });
    return res.json(updated);
  } catch (err) {
    console.error("PATCH /users/:id error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

/**
 * PATCH /api/users/:id/role
 * Admin only - change role
 */
router.patch("/:id/role", auth, requireRole("admin"), async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "supervisor", "admin"].includes(role)) {
      return res.status(400).json({ message: "Rôle invalide" });
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "Utilisateur introuvable" });
    return res.json(updated);
  } catch (err) {
    console.error("PATCH /users/:id/role error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

/**
 * DELETE /api/users/:id
 * Admin only - delete user
 */
router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Utilisateur introuvable" });
    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE /users/:id error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
