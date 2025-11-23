const express = require("express");
const router = express.Router();
const { createMessage } = require("../controllers/messageController");
const Message = require("../models/Message");

// POST — Enregistrer un message
router.post("/", createMessage);

// GET — Récupérer tous les messages
router.get("/", async (req, res) => {
  try {
    const messages = await Message.find().sort({ date: -1 });
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE — Supprimer un message
router.delete("/:id", async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Message supprimé" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
