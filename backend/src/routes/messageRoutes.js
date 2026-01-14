const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const Message = require("../models/Message");

const { ok, created, fail } = require("../utils/apiResponse");

// POST /api/messages (public: page contact)
router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return fail(res, 400, "name, email, message requis");
    }

    const doc = await Message.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      message: String(message).trim(),
      date: new Date(),
    });

    return created(res, doc, "Message envoyé");
  } catch (e) {
    return fail(res, 500, "Erreur envoi message", { error: e.message });
  }
});

// GET /api/messages (admin/supervisor)
router.get("/", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const msgs = await Message.find({}).sort({ createdAt: -1 });
    return ok(res, msgs);
  } catch (e) {
    return fail(res, 500, "Erreur récupération messages", { error: e.message });
  }
});

// DELETE /api/messages/:id (admin/supervisor)
router.delete("/:id", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const deleted = await Message.findByIdAndDelete(req.params.id);
    if (!deleted) return fail(res, 404, "Message introuvable");
    return ok(res, null, "Message supprimé");
  } catch (e) {
    return fail(res, 500, "Erreur suppression message", { error: e.message });
  }
});

module.exports = router;
