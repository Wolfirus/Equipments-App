const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const User = require("../models/User");
const { ok, fail } = require("../utils/apiResponse");

// GET /api/profile
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return fail(res, 404, "Utilisateur introuvable");
    return ok(res, user);
  } catch (e) {
    return fail(res, 500, "Erreur récupération profil", { error: e.message });
  }
});

// PUT /api/profile (update basic profile)
router.put("/", auth, async (req, res) => {
  try {
    const allowed = ["name", "email", "phone", "department", "bio", "avatar_url"];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }

    if (updates.email) {
      updates.email = String(updates.email).trim().toLowerCase();
      const exists = await User.findOne({ email: updates.email, _id: { $ne: req.user._id } });
      if (exists) return fail(res, 400, "Email déjà utilisé");
    }
    if (updates.name) updates.name = String(updates.name).trim();
    if (updates.phone) updates.phone = String(updates.phone).trim();
    if (updates.bio) updates.bio = String(updates.bio).trim();

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");
    return ok(res, user, "Profil mis à jour");
  } catch (e) {
    return fail(res, 500, "Erreur update profil", { error: e.message });
  }
});

// PUT /api/profile/preferences
router.put("/preferences", auth, async (req, res) => {
  try {
    const updates = { preferences: req.body || {} };
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");
    return ok(res, user, "Préférences mises à jour");
  } catch (e) {
    return fail(res, 500, "Erreur update préférences", { error: e.message });
  }
});

// PUT /api/profile/password
router.put("/password", auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) return fail(res, 400, "oldPassword et newPassword requis");
    if (String(newPassword).length < 6) return fail(res, 400, "Mot de passe trop court (min 6)");

    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 404, "Utilisateur introuvable");

    const okPass = await user.matchPassword(String(oldPassword));
    if (!okPass) return fail(res, 400, "Ancien mot de passe incorrect");

    user.password = String(newPassword); // hash via pre-save
    await user.save();

    return ok(res, null, "Mot de passe modifié");
  } catch (e) {
    return fail(res, 500, "Erreur modification mot de passe", { error: e.message });
  }
});

// DELETE /api/profile (delete my account)
router.delete("/", auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    return ok(res, null, "Compte supprimé");
  } catch (e) {
    return fail(res, 500, "Erreur suppression compte", { error: e.message });
  }
});

module.exports = router;
