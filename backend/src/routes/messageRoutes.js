const express = require("express");
const router = require("express").Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const messageController = require("../controllers/messageController");

// Créer un message
router.post("/", messageController.createMessage);

// Récupérer tous les messages (admin)
router.get("/", auth, requireRole("admin"), messageController.getAllMessages);

// Supprimer un message (admin)
router.delete("/:id", auth, requireRole("admin"), messageController.deleteMessage);

module.exports = router;

