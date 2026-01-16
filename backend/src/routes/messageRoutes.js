const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const Message = require("../models/Message");

/**
 * POST /api/messages
 * Public (page Contact)
 * Crée un message de contact
 */
router.post("/", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const message = String(req.body?.message || "").trim();

    // ✅ Validation simple
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Champs requis: name, email, message",
      });
    }

    // ✅ Email basique
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res.status(400).json({
        success: false,
        message: "Email invalide",
      });
    }

    const created = await Message.create({ name, email, message });

    return res.status(201).json({
      success: true,
      message: "Message envoyé",
      data: created,
    });
  } catch (e) {
    console.error("POST /messages error:", e);
    return res.status(500).json({
      success: false,
      message: "Erreur envoi message",
      error: e.message,
    });
  }
});

/**
 * GET /api/messages
 * Admin/Supervisor : liste des messages (tri par date)
 */
router.get("/", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const msgs = await Message.find()
      .sort({ createdAt: -1 }) // ✅ nécessite timestamps
      .select("-__v");

    return res.json({
      success: true,
      data: msgs,
    });
  } catch (e) {
    console.error("GET /messages error:", e);
    return res.status(500).json({
      success: false,
      message: "Erreur récupération messages",
      error: e.message,
    });
  }
});

/**
 * DELETE /api/messages/:id
 * Admin/Supervisor : suppression d'un message
 */
router.delete("/:id", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ ID Mongo valide
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID invalide",
      });
    }

    const deleted = await Message.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Message introuvable",
      });
    }

    return res.json({
      success: true,
      message: "Message supprimé",
    });
  } catch (e) {
    console.error("DELETE /messages/:id error:", e);
    return res.status(500).json({
      success: false,
      message: "Erreur suppression message",
      error: e.message,
    });
  }
});

module.exports = router;
