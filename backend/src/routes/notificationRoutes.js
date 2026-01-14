const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const Notification = require("../models/Notification");

/**
 * Routes compatibles avec le frontend:
 * - GET  /api/notifications
 * - GET  /api/notifications/unread
 * - PUT  /api/notifications/:id/read
 * - PUT  /api/notifications/read-all
 * - DELETE /api/notifications/:id
 * - DELETE /api/notifications/batch
 * - POST /api/notifications (manager)
 */

// GET /api/notifications - list (avec filtres)
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, priority, read, action_required } = req.query;

    const query = { user_id: req.user._id };

    if (type) query.type = Array.isArray(type) ? { $in: type } : type;
    if (priority) query.priority = Array.isArray(priority) ? { $in: priority } : priority;

    if (read !== undefined) query.read = String(read) === "true";
    if (action_required !== undefined) query.action_required = String(action_required) === "true";

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const notifications = await Notification.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .select("-__v");

    const total = await Notification.countDocuments(query);

    const unreadCount = await Notification.countDocuments({
      user_id: req.user._id,
      read: false,
    });

    const types = await Notification.distinct("type", { user_id: req.user._id });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          current: parseInt(page, 10),
          pages: Math.ceil(total / parseInt(limit, 10)),
          total,
          limit: parseInt(limit, 10),
        },
        unread_count: unreadCount,
        filters: { types, priorities: ["low", "medium", "high"] },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des notifications",
      error: error.message,
    });
  }
});

// GET /api/notifications/unread - unread only
router.get("/unread", auth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const notifications = await Notification.find({
      user_id: req.user._id,
      read: false,
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .select("-__v");

    res.json({
      success: true,
      data: { notifications, count: notifications.length },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des notifications non lues",
      error: error.message,
    });
  }
});

// PUT /api/notifications/read-all - mark all read
router.put("/read-all", auth, async (req, res) => {
  try {
    const { type, priority } = req.query;

    const filter = { user_id: req.user._id, read: false };
    if (type) filter.type = Array.isArray(type) ? { $in: type } : type;
    if (priority) filter.priority = Array.isArray(priority) ? { $in: priority } : priority;

    const result = await Notification.updateMany(filter, {
      $set: { read: true, read_at: new Date() },
    });

    res.json({
      success: true,
      message: `${result.modifiedCount} notification(s) marquée(s) comme lue(s)`,
      data: { modified_count: result.modifiedCount },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors du marquage des notifications",
      error: error.message,
    });
  }
});

// DELETE /api/notifications/batch - delete many
router.delete("/batch", auth, async (req, res) => {
  try {
    const { notification_ids } = req.body;

    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Liste d'IDs de notifications requise",
      });
    }

    const result = await Notification.deleteMany({
      _id: { $in: notification_ids },
      user_id: req.user._id,
    });

    res.json({
      success: true,
      message: `${result.deletedCount} notification(s) supprimée(s)`,
      data: { deleted_count: result.deletedCount },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression des notifications",
      error: error.message,
    });
  }
});

// POST /api/notifications - create (admin/supervisor)
router.post("/", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const { user_ids, type, title, message, priority = "medium", action_required = false, action_url, action_text } =
      req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ success: false, message: "Liste d'utilisateurs requise" });
    }
    if (!type || !title || !message) {
      return res.status(400).json({ success: false, message: "type, title, message sont requis" });
    }

    const validPriorities = ["low", "medium", "high"];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ success: false, message: "Priorité invalide" });
    }

    // supervisor => seulement son département
    if (req.user.role === "supervisor") {
      const User = require("../models/User");
      const allowed = await User.find({ department: req.user.department }).select("_id");
      const allowedIds = new Set(allowed.map((u) => String(u._id)));
      const invalid = user_ids.filter((id) => !allowedIds.has(String(id)));
      if (invalid.length) {
        return res.status(403).json({
          success: false,
          message: "Vous ne pouvez envoyer des notifications qu'à votre département",
        });
      }
    }

    const docs = user_ids.map((userId) => ({
      user_id: userId,
      type,
      title,
      message,
      priority,
      action_required,
      action_url: action_url || "",
      action_text: action_text || "",
    }));

    const created = await Notification.insertMany(docs);

    res.status(201).json({
      success: true,
      message: `${created.length} notification(s) créée(s)`,
      data: created,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création des notifications",
      error: error.message,
    });
  }
});

// GET /api/notifications/:id - get single
router.get("/:id", auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user_id: req.user._id,
    }).select("-__v");

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification non trouvée" });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la notification",
      error: error.message,
    });
  }
});

// PUT /api/notifications/:id/read - mark read
router.put("/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user_id: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification non trouvée" });
    }

    if (notification.read) {
      return res.json({
        success: true,
        message: "Notification déjà lue",
        data: notification,
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: "Notification marquée comme lue",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors du marquage de la notification",
      error: error.message,
    });
  }
});

// DELETE /api/notifications/:id - delete one
router.delete("/:id", auth, async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      user_id: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Notification non trouvée" });
    }

    res.json({ success: true, message: "Notification supprimée avec succès" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de la notification",
      error: error.message,
    });
  }
});

module.exports = router;
