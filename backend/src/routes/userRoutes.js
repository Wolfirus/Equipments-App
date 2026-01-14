const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcrypt");

const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const User = require("../models/User");

// -------------------- Multer (avatars) --------------------
const AVATAR_DIR = path.join(process.cwd(), "uploads", "avatars");
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    cb(null, `u_${req.user._id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const ok = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.mimetype);
    cb(ok ? null : new Error("Format d'image non supporté"), ok);
  },
});

// -------------------- Helpers --------------------
function safeUser(u) {
  if (!u) return null;
  const obj = u.toObject ? u.toObject() : u;
  delete obj.password;
  return obj;
}

// -------------------- ME (pour UserAccount.jsx) --------------------

// GET /api/users/me
router.get("/me", auth, async (req, res) => {
  try {
    const u = await User.findById(req.user._id).select("-password");
    res.json({ success: true, data: u });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur récupération profil", error: e.message });
  }
});

// PATCH /api/users/me  (name/email uniquement)
router.patch("/me", auth, async (req, res) => {
  try {
    const { name, email } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (email !== undefined) updates.email = String(email).trim().toLowerCase();

    if (updates.email) {
      const exists = await User.findOne({ email: updates.email, _id: { $ne: req.user._id } });
      if (exists) return res.status(400).json({ success: false, message: "Email déjà utilisé" });
    }

    const u = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");
    res.json({ success: true, data: u });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur mise à jour profil", error: e.message });
  }
});

// PATCH /api/users/me/password
router.patch("/me/password", auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "oldPassword et newPassword requis" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: "Mot de passe trop court (min 6)" });
    }

    const u = await User.findById(req.user._id);
    const ok = await u.matchPassword(oldPassword);
    if (!ok) return res.status(400).json({ success: false, message: "Ancien mot de passe incorrect" });

    u.password = newPassword; // hash via pre-save
    await u.save();

    res.json({ success: true, message: "Mot de passe modifié" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur changement mot de passe", error: e.message });
  }
});

// PATCH /api/users/me/avatar
router.patch("/me/avatar", auth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Fichier avatar requis" });

    const u = await User.findById(req.user._id);

    // supprimer ancien avatar si existant
    if (u.avatar) {
      const old = path.join(AVATAR_DIR, u.avatar);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }

    u.avatar = req.file.filename;
    await u.save();

    res.json({ success: true, data: safeUser(u) });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur upload avatar", error: e.message });
  }
});

// -------------------- ADMIN CRUD utilisateurs (si tu l’avais déjà) --------------------

// GET /api/users (admin)
router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    res.json(users); // (tu peux l’envelopper si tu veux)
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur liste users", error: e.message });
  }
});

// PATCH /api/users/:id (admin)
router.patch("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const { name, email } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (email !== undefined) updates.email = String(email).trim().toLowerCase();

    if (updates.email) {
      const exists = await User.findOne({ email: updates.email, _id: { $ne: req.params.id } });
      if (exists) return res.status(400).json({ success: false, message: "Email déjà utilisé" });
    }

    const u = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-password");
    if (!u) return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    res.json({ success: true, data: u });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur update user", error: e.message });
  }
});

// PATCH /api/users/:id/role (admin)
router.patch("/:id/role", auth, requireRole("admin"), async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "supervisor", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Rôle invalide" });
    }
    const u = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
    if (!u) return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    res.json({ success: true, data: u });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur update role", error: e.message });
  }
});

// DELETE /api/users/:id (admin)
router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: "Impossible de supprimer votre propre compte" });
    }
    const u = await User.findByIdAndDelete(req.params.id);
    if (!u) return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    res.json({ success: true, message: "Utilisateur supprimé" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur suppression user", error: e.message });
  }
});

module.exports = router;
