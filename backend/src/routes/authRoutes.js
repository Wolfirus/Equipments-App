const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { ok, created, fail } = require("../utils/apiResponse");

// helper JWT
function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "7d" }
  );
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "user" } = req.body;

    if (!name || !email || !password) {
      return fail(res, 400, "name, email et password sont requis");
    }
    if (String(password).length < 6) {
      return fail(res, 400, "Mot de passe trop court (min 6)");
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const exists = await User.findOne({ email: cleanEmail });
    if (exists) return fail(res, 400, "Email déjà utilisé");

    // sécurité: empêcher création admin via UI
    const safeRole = ["user", "supervisor"].includes(role) ? role : "user";

    const user = await User.create({
      name: String(name).trim(),
      email: cleanEmail,
      password: String(password),
      role: safeRole,
    });

    const token = signToken(user);

    const safeUser = user.toObject();
    delete safeUser.password;

    return created(res, { token, user: safeUser }, "Compte créé");
  } catch (e) {
    return fail(res, 500, "Erreur création compte", { error: e.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return fail(res, 400, "email et password requis");

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) return fail(res, 401, "Identifiants invalides");

    const okPass = await user.matchPassword(String(password));
    if (!okPass) return fail(res, 401, "Identifiants invalides");

    // update last_activity
    user.stats = user.stats || {};
    user.stats.last_activity = new Date();
    await user.save();

    const token = signToken(user);

    const safeUser = user.toObject();
    delete safeUser.password;

    return ok(res, { token, user: safeUser }, "Connexion réussie");
  } catch (e) {
    return fail(res, 500, "Erreur connexion", { error: e.message });
  }
});

module.exports = router;
