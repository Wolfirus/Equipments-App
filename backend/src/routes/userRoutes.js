const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");

// Multer config avatars
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/avatars"),
  filename: (req, file, cb) => cb(null, req.user._id + path.extname(file.originalname)),
});
const upload = multer({ storage });

// GET /me
router.get("/me", auth, async (req, res) => res.json(req.user));

// PATCH /me
router.patch("/me", auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (email) {
      const exists = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (exists) return res.status(400).json({ message: "Email déjà utilisé" });
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

// PATCH /me/password
router.patch("/me/password", auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!(await user.matchPassword(oldPassword))) return res.status(400).json({ message: "Ancien mot de passe incorrect" });

    user.password = newPassword;
    await user.save();

    res.json({ message: "Mot de passe mis à jour" });
  } catch (err) {
    console.error("Update password error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PATCH /me/avatar
router.patch("/me/avatar", auth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Fichier manquant" });

    const updated = await User.findByIdAndUpdate(req.user._id, { avatar: req.file.filename }, { new: true }).select("-password");
    res.json(updated);
  } catch (err) {
    console.error("Upload avatar error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
