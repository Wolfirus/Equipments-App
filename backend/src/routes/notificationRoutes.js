const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const Notification = require("../models/Notification");

// GET /api/notifications - Get user notifications
router.get("/", auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      priority,
      read,
      action_required
    } = req.query;

    let query = {
      user_id: req.user._id,
      $and: [
        {
          $or: [
            { 'scheduling.expires_at': { $exists: false } },
            { 'scheduling.expires_at': { $gt: new Date() } }
          ]
        }
      ]
    };

    // Type filter
    if (type) {
      if (Array.isArray(type)) {
        query.type = { $in: type };
      } else {
        query.type = type;
      }
    }

    // Priority filter
    if (priority) {
      if (Array.isArray(priority)) {
        query.priority = { $in: priority };
      } else {
        query.priority = priority;
      }
    }

    // Read status filter
    if (read !== undefined) {
      query.read = read === 'true';
    }

    // Action required filter
    if (action_required !== undefined) {
      query.action_required = action_required === 'true';
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(query)
      .sort({ priority: -1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      ...query,
      read: false
    });

    // Get notification types and priorities for filters
    const types = await Notification.distinct('type', {
      user_id: req.user._id,
      ...query
    });

    const priorities = ['low', 'medium', 'high', 'urgent'];

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        },
        unread_count: unreadCount,
        filters: {
          types,
          priorities
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des notifications",
      error: error.message
    });
  }
});

// GET /api/notifications/unread - Get unread notifications only
router.get("/unread", auth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const notifications = await Notification.findUnreadByUser(req.user._id, {
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        notifications,
        count: notifications.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des notifications non lues",
      error: error.message
    });
  }
});

// GET /api/notifications/:id - Get single notification
router.get("/:id", auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification non trouvée"
      });
    }

    // Check if notification is expired
    if (notification.is_expired) {
      return res.status(410).json({
        success: false,
        message: "Notification expirée"
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la notification",
      error: error.message
    });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put("/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification non trouvée"
      });
    }

    if (notification.read) {
      return res.json({
        success: true,
        message: "Notification déjà lue",
        data: notification
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: "Notification marquée comme lue",
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors du marquage de la notification",
      error: error.message
    });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put("/read-all", auth, async (req, res) => {
  try {
    const { type, priority } = req.query;

    let filter = { user_id: req.user._id, read: false };

    // Optional filters for specific notifications
    if (type) {
      filter.type = Array.isArray(type) ? { $in: type } : type;
    }

    if (priority) {
      filter.priority = Array.isArray(priority) ? { $in: priority } : priority;
    }

    const result = await Notification.markAllAsRead(req.user._id, filter);

    res.json({
      success: true,
      message: `${result.modifiedCount} notification(s) marquée(s) comme lue(s)`,
      data: {
        modified_count: result.modifiedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors du marquage des notifications",
      error: error.message
    });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete("/:id", auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification non trouvée"
      });
    }

    await Notification.findByIdAndDelete(notification._id);

    res.json({
      success: true,
      message: "Notification supprimée avec succès"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de la notification",
      error: error.message
    });
  }
});

// DELETE /api/notifications/batch - Batch delete notifications
router.delete("/batch", auth, async (req, res) => {
  try {
    const { notification_ids } = req.body;

    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Liste d'IDs de notifications requise"
      });
    }

    const result = await Notification.deleteMany({
      _id: { $in: notification_ids },
      user_id: req.user._id
    });

    res.json({
      success: true,
      message: `${result.deletedCount} notification(s) supprimée(s)`,
      data: {
        deleted_count: result.deletedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression des notifications",
      error: error.message
    });
  }
});

// POST /api/notifications - Create notification (admin/supervisor only)
router.post("/", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const {
      user_ids,
      type,
      title,
      message,
      priority = 'medium',
      action_required = false,
      action_url,
      action_text,
      send_immediately = true,
      scheduled_for,
      expires_at
    } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Liste d'utilisateurs requise"
      });
    }

    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "Les champs type, title et message sont requis"
      });
    }

    const validTypes = [
      'reservation_created', 'reservation_approved', 'reservation_rejected',
      'reservation_reminder', 'reservation_cancelled', 'reservation_completed',
      'reservation_overdue', 'equipment_available', 'equipment_maintenance',
      'equipment_retired', 'equipment_due_soon', 'equipment_return_reminder',
      'payment_due', 'payment_overdue', 'payment_received', 'payment_refunded',
      'system_update', 'profile_updated', 'role_changed', 'equipment_added',
      'new_equipment_in_category'
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type de notification invalide"
      });
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Priorité invalide"
      });
    }

    // Check supervisor permissions
    if (req.user.role === 'supervisor') {
      // Supervisors can only send notifications to their department
      const User = require("../models/User");
      const supervisorUsers = await User.find({
        department: req.user.department
      }).select('_id');

      const supervisorUserIds = supervisorUsers.map(u => u._id.toString());
      const invalidUserIds = user_ids.filter(id => !supervisorUserIds.includes(id));

      if (invalidUserIds.length > 0) {
        return res.status(403).json({
          success: false,
          message: "Vous ne pouvez envoyer des notifications qu'à votre département"
        });
      }
    }

    // Validate dates
    if (scheduled_for && new Date(scheduled_for) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "La date de programmation doit être dans le futur"
      });
    }

    if (expires_at && new Date(expires_at) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "La date d'expiration doit être dans le futur"
      });
    }

    // Create notifications for each user
    const notifications = [];
    for (const userId of user_ids) {
      const notificationData = {
        user_id: userId,
        type,
        title,
        message,
        priority,
        action_required,
        action_url,
        action_text,
        scheduling: {
          send_immediately,
          scheduled_for: scheduled_for ? new Date(scheduled_for) : undefined,
          expires_at: expires_at ? new Date(expires_at) : undefined
        },
        metadata: {
          source: req.user.role === 'admin' ? 'admin_action' : 'supervisor_action',
          category: 'system',
          custom_data: {
            created_by: req.user._id,
            created_by_name: req.user.name
          }
        }
      };

      notifications.push(notificationData);
    }

    const createdNotifications = await Notification.insertMany(notifications);

    // Trigger immediate delivery if requested
    if (send_immediately) {
      for (const notification of createdNotifications) {
        await notification.deliver();
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdNotifications.length} notification(s) créée(s)`,
      data: createdNotifications
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Erreur de validation",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: "Erreur lors de la création des notifications",
      error: error.message
    });
  }
});

// GET /api/notifications/queue - Get pending notifications (admin only)
router.get("/queue", auth, requireRole("admin"), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const pendingNotifications = await Notification.getPendingDeliveries()
      .populate('user_id', 'name email department')
      .sort({ created_at: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Notification.countDocuments({
      $or: [
        { 'delivery_methods.browser.delivered': false },
        { 'delivery_methods.email.sent': false },
        { 'delivery_methods.sms.sent': false }
      ],
      $and: [
        {
          $or: [
            { 'scheduling.expires_at': { $exists: false } },
            { 'scheduling.expires_at': { $gt: new Date() } }
          ]
        }
      ]
    });

    res.json({
      success: true,
      data: {
        notifications: pendingNotifications,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la file d'attente",
      error: error.message
    });
  }
});

// POST /api/notifications/process-queue - Process notification queue (admin only)
router.post("/process-queue", auth, requireRole("admin"), async (req, res) => {
  try {
    const { limit = 100 } = req.body;

    const pendingNotifications = await Notification.getPendingDeliveries()
      .limit(parseInt(limit));

    let processedCount = 0;
    let errorCount = 0;

    for (const notification of pendingNotifications) {
      try {
        await notification.deliver();
        processedCount++;
      } catch (error) {
        console.error(`Error delivering notification ${notification._id}:`, error);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `File d'attente traitée: ${processedCount} notification(s) envoyée(s), ${errorCount} erreur(s)`,
      data: {
        processed_count: processedCount,
        error_count: errorCount,
        total_processed: processedCount + errorCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors du traitement de la file d'attente",
      error: error.message
    });
  }
});

// GET /api/notifications/stats - Get notification statistics
router.get("/stats", auth, async (req, res) => {
  try {
    let matchQuery = { user_id: req.user._id };

    // Role-based filtering
    if (req.user.role === 'admin') {
      // Admin sees all notification stats
      matchQuery = {};
    } else if (req.user.role === 'supervisor') {
      // Supervisor sees stats from their department
      const User = require("../models/User");
      const departmentUsers = await User.find({ department: req.user.department }).select('_id');
      matchQuery.user_id = { $in: departmentUsers.map(u => u._id) };
    }

    const overallStats = await Notification.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total_notifications: { $sum: 1 },
          unread_notifications: {
            $sum: { $cond: ["$read", 0, 1] }
          },
          read_notifications: {
            $sum: { $cond: ["$read", 1, 0] }
          },
          action_required: {
            $sum: { $cond: ["$action_required", 1, 0] }
          }
        }
      }
    ]);

    const typeStats = await Notification.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          unread: { $sum: { $cond: ["$read", 0, 1] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const priorityStats = await Notification.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
          unread: { $sum: { $cond: ["$read", 0, 1] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const dailyTrends = await Notification.aggregate([
      {
        $match: {
          ...matchQuery,
          created_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" },
            day: { $dayOfMonth: "$created_at" }
          },
          count: { $sum: 1 },
          unread: { $sum: { $cond: ["$read", 0, 1] } }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: overallStats[0] || {
          total_notifications: 0,
          unread_notifications: 0,
          read_notifications: 0,
          action_required: 0
        },
        by_type: typeStats,
        by_priority: priorityStats,
        daily_trends: dailyTrends
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des statistiques",
      error: error.message
    });
  }
});

module.exports = router;