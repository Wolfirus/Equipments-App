const express = require("express");
const router = express.Router();
const { createMessage } = require("../controllers/messageController");
const Message = require("../models/Message");

// POST — enregistrer
router.post("/", createMessage);

// GET — récupérer tous les messages
router.get("/", async (req, res) => {
  try {
    const messages = await Message.find().sort({ date: -1 });
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
