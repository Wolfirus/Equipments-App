const mongoose = require("mongoose");

/**
 * MessageSchema
 * Représente un message envoyé depuis la page Contact
 */
const MessageSchema = new mongoose.Schema(
  {
    // Nom de l'expéditeur
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Email de l'expéditeur
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // Contenu du message
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    // ✅ Ajoute automatiquement createdAt et updatedAt
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", MessageSchema);
