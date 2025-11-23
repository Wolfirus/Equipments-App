const Message = require("../models/Message");

exports.createMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    const newMessage = await Message.create({
      name,
      email,
      message
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
