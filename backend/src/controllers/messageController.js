const mongoose = require("mongoose");
const Message = require("../models/Message");

/**
 * POST /api/messages
 * Créer un message (Contact)
 */
exports.createMessage = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const message = String(req.body?.message || "").trim();

    // ✅ Validation simple (évite d'enregistrer du vide)
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Champs requis: name, email, message",
      });
    }

    // ✅ Validation email basique
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
      message: "Message bien reçu",
      data: created,
    });
  } catch (error) {
    console.error("createMessage error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * GET /api/messages
 * Récupérer tous les messages (admin/supervisor en général)
 */
exports.getAllMessages = async (req, res) => {
  try {
    // ✅ Tri par date de création (createdAt) si timestamps activés
    // Si ton schema n'a pas timestamps, adapte à ton champ.
    const messages = await Message.find()
      .sort({ createdAt: -1 })
      .select("-__v");

    return res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("getAllMessages error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/messages/:id
 * Supprimer un message
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Vérifie si l'ID Mongo est valide
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
  } catch (error) {
    console.error("deleteMessage error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};
