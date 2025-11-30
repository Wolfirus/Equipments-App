const Message = require("../models/Message");

exports.createMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    const newMessage = await Message.create({
      name,
      email,
      message,
    });

    res.status(201).json({
      success: true,
      message: "Message bien reçu",
      data: newMessage,
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ADMIN : get all messages
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ADMIN : delete one message
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, message: "Message introuvable" });
    }

    res.status(200).json({ success: true, message: "Message supprimé" });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

