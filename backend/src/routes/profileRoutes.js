const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Reservation = require("../models/Reservation");
const Notification = require("../models/Notification");

// GET /api/profile - Get user profile
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    // Get reservation statistics
    const reservationStats = await Reservation.aggregate([
      { $match: { user_id: user._id } },
      {
        $group: {
          _id: null,
          total_reservations: { $sum: 1 },
          pending_reservations: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          approved_reservations: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
          },
          active_reservations: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
          },
          completed_reservations: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          cancelled_reservations: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
          }
        }
      }
    ]);

    // Get recent activity
    const recentActivity = await Reservation.find({ user_id: user._id })
      .populate('equipment_id', 'name images category')
      .sort({ updated_at: -1 })
      .limit(5)
      .select('status created_at updated_at equipment_id quantity start_date end_date');

    // Calculate completion rate if there are completed reservations
    const stats = reservationStats[0] || {
      total_reservations: 0,
      pending_reservations: 0,
      approved_reservations: 0,
      active_reservations: 0,
      completed_reservations: 0,
      cancelled_reservations: 0
    };

    if (stats.completed_reservations > 0) {
      stats.completion_rate = Math.round(
        (stats.completed_reservations / stats.total_reservations) * 100
      );
    } else {
      stats.completion_rate = 100;
    }

    const profileData = {
      ...user.toObject(),
      stats: {
        ...user.stats,
        ...stats
      },
      recent_activity: recentActivity
    };

    res.json({
      success: true,
      data: profileData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du profil",
      error: error.message
    });
  }
});

// PUT /api/profile - Update profile information
router.put("/", auth, async (req, res) => {
  try {
    const {
      name,
      phone,
      department,
      bio,
      avatar_url,
      preferences
    } = req.body;

    const allowedUpdates = {
      name,
      phone,
      department,
      bio,
      avatar_url,
      preferences
    };

    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      }
    });

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    // Validate phone number format if provided
    if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Format de numéro de téléphone invalide"
      });
    }

    // Validate avatar URL if provided
    if (avatar_url) {
      try {
        new URL(avatar_url);
        if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(avatar_url)) {
          throw new Error('Invalid image format');
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "URL d'avatar invalide"
        });
      }
    }

    // Validate department if provided
    if (department) {
      const validDepartments = [
        "General", "IT", "HR", "Finance", "Marketing",
        "Operations", "Research", "Development", "Sales", "Support", "Maintenance"
      ];

      if (!validDepartments.includes(department)) {
        return res.status(400).json({
          success: false,
          message: "Département invalide"
        });
      }
    }

    // Validate preferences structure if provided
    if (preferences) {
      if (typeof preferences !== 'object' || Array.isArray(preferences)) {
        return res.status(400).json({
          success: false,
          message: "Les préférences doivent être un objet"
        });
      }

      const validNotificationTypes = [
        'email', 'browser', 'reservation_reminders',
        'equipment_available', 'system_updates'
      ];

      if (preferences.notifications) {
        Object.keys(preferences.notifications).forEach(key => {
          if (!validNotificationTypes.includes(key)) {
            return res.status(400).json({
              success: false,
              message: `Type de notification invalide: ${key}`
            });
          }

          if (typeof preferences.notifications[key] !== 'boolean') {
            return res.status(400).json({
              success: false,
              message: `La valeur de ${key} doit être un booléen`
            });
          }
        });
      }

      if (preferences.language && !['en', 'fr'].includes(preferences.language)) {
        return res.status(400).json({
          success: false,
          message: "Langue invalide. Choisissez 'en' ou 'fr'"
        });
      }

      if (preferences.theme && !['light', 'dark', 'auto'].includes(preferences.theme)) {
        return res.status(400).json({
          success: false,
          message: "Thème invalide. Choisissez 'light', 'dark' ou 'auto'"
        });
      }
    }

    // Update user
    Object.assign(user, allowedUpdates);
    user.stats.last_activity = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Profil mis à jour avec succès",
      data: user
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
      message: "Erreur lors de la mise à jour du profil",
      error: error.message
    });
  }
});

// PUT /api/profile/preferences - Update preferences only
router.put("/preferences", auth, async (req, res) => {
  try {
    const preferences = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Les préférences sont requises"
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    // Validate preferences structure
    const validNotificationTypes = [
      'email', 'browser', 'reservation_reminders',
      'equipment_available', 'system_updates'
    ];

    if (preferences.notifications) {
      Object.keys(preferences.notifications).forEach(key => {
        if (!validNotificationTypes.includes(key)) {
          return res.status(400).json({
            success: false,
            message: `Type de notification invalide: ${key}`
          });
        }

        if (typeof preferences.notifications[key] !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: `La valeur de ${key} doit être un booléen`
          });
        }
      });
    }

    if (preferences.language && !['en', 'fr'].includes(preferences.language)) {
      return res.status(400).json({
        success: false,
        message: "Langue invalide. Choisissez 'en' ou 'fr'"
      });
    }

    if (preferences.theme && !['light', 'dark', 'auto'].includes(preferences.theme)) {
      return res.status(400).json({
        success: false,
        message: "Thème invalide. Choisissez 'light', 'dark' ou 'auto'"
      });
    }

    // Merge preferences
    user.preferences = { ...user.preferences, ...preferences };
    await user.save();

    res.json({
      success: true,
      message: "Préférences mises à jour avec succès",
      data: user.preferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour des préférences",
      error: error.message
    });
  }
});

// PUT /api/profile/password - Change password
router.put("/password", auth, async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs de mot de passe sont requis"
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe doit contenir au moins 6 caractères"
      });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Les mots de passe ne correspondent pas"
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.matchPassword(current_password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Le mot de passe actuel est incorrect"
      });
    }

    // Update password
    user.password = new_password;
    await user.save();

    res.json({
      success: true,
      message: "Mot de passe changé avec succès"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors du changement de mot de passe",
      error: error.message
    });
  }
});

// GET /api/profile/activity - Get user activity timeline
router.get("/activity", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    let matchQuery = { user_id: req.user._id };

    // Filter by type if specified
    if (type) {
      switch (type) {
        case 'reservations':
          // Get reservations
          const reservations = await Reservation.find(matchQuery)
            .populate('equipment_id', 'name images category')
            .sort({ created_at: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

          const reservationTotal = await Reservation.countDocuments(matchQuery);

          return res.json({
            success: true,
            data: {
              activities: reservations.map(reservation => ({
                type: 'reservation',
                action: reservation.status,
                date: reservation.created_at,
                details: {
                  equipment: reservation.equipment_id,
                  quantity: reservation.quantity,
                  start_date: reservation.start_date,
                  end_date: reservation.end_date,
                  notes: reservation.notes
                }
              })),
              pagination: {
                current: parseInt(page),
                pages: Math.ceil(reservationTotal / parseInt(limit)),
                total: reservationTotal,
                limit: parseInt(limit)
              }
            }
          });

        case 'notifications':
          // Get notifications
          const notifications = await Notification.find(matchQuery)
            .sort({ created_at: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

          const notificationTotal = await Notification.countDocuments(matchQuery);

          return res.json({
            success: true,
            data: {
              activities: notifications.map(notification => ({
                type: 'notification',
                action: notification.type,
                date: notification.created_at,
                read: notification.read,
                details: {
                  title: notification.title,
                  message: notification.message,
                  priority: notification.priority
                }
              })),
              pagination: {
                current: parseInt(page),
                pages: Math.ceil(notificationTotal / parseInt(limit)),
                total: notificationTotal,
                limit: parseInt(limit)
              }
            }
          });

        default:
          return res.status(400).json({
            success: false,
            message: "Type d'activité invalide. Utilisez 'reservations' ou 'notifications'"
          });
      }
    }

    // Get combined activity if no type specified
    const reservations = await Reservation.find(matchQuery)
      .populate('equipment_id', 'name images category')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const notifications = await Notification.find(matchQuery)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Combine and sort activities
    const activities = [...reservations, ...notifications]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, parseInt(limit))
      .map(item => ({
        type: item.equipment_id ? 'reservation' : 'notification',
        action: item.status || item.type,
        date: item.created_at,
        read: item.read,
        details: item.equipment_id ? {
          equipment: item.equipment_id,
          quantity: item.quantity,
          start_date: item.start_date,
          end_date: item.end_date,
          notes: item.notes
        } : {
          title: item.title,
          message: item.message,
          priority: item.priority
        }
      }));

    const total = reservations.length + notifications.length;

    res.json({
      success: true,
      data: {
        activities,
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
      message: "Erreur lors de la récupération de l'activité",
      error: error.message
    });
  }
});

// DELETE /api/profile - Delete user account
router.delete("/", auth, async (req, res) => {
  try {
    const { password, confirmation } = req.body;

    if (!password || !confirmation) {
      return res.status(400).json({
        success: false,
        message: "Le mot de passe et la confirmation sont requis"
      });
    }

    if (confirmation !== "DELETE_MY_ACCOUNT") {
      return res.status(400).json({
        success: false,
        message: "La confirmation doit être 'DELETE_MY_ACCOUNT'"
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    // Prevent deletion of admin users
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: "Impossible de supprimer le compte administrateur"
      });
    }

    // Verify password
    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Mot de passe incorrect"
      });
    }

    // Check for active reservations
    const activeReservations = await Reservation.find({
      user_id: user._id,
      status: { $in: ['approved', 'active'] }
    });

    if (activeReservations.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer le compte: ${activeReservations.length} réservation(s) active(s) trouvée(s)`
      });
    }

    // Soft delete by marking as inactive (you could also hard delete)
    user.email = `deleted_${Date.now()}_${user.email}`;
    user.name = "Utilisateur supprimé";
    user.phone = "";
    user.bio = "";
    user.avatar_url = "";
    user.preferences.notifications.email = false;
    user.preferences.notifications.browser = false;

    await user.save();

    // Optionally, you could hard delete:
    // await User.findByIdAndDelete(user._id);

    res.json({
      success: true,
      message: "Compte supprimé avec succès"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du compte",
      error: error.message
    });
  }
});

// GET /api/profile/stats - Get detailed statistics
router.get("/stats", auth, async (req, res) => {
  try {
    const { period = 'all' } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case '30d':
        dateFilter = { created_at: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case '90d':
        dateFilter = { created_at: { $gte: new Date(now - 90 * 24 * 60 * 60 * 1000) } };
        break;
      case '1y':
        dateFilter = { created_at: { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) } };
        break;
      default:
        dateFilter = {};
    }

    const userStats = await Reservation.aggregate([
      { $match: { ...dateFilter, user_id: req.user._id } },
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" },
            status: "$status"
          },
          count: { $sum: 1 },
          total_duration: {
            $sum: { $divide: [{ $subtract: ["$end_date", "$start_date"] }, 1000 * 60 * 60 * 24] }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.status": 1 } }
    ]);

    const equipmentStats = await Reservation.aggregate([
      { $match: { ...dateFilter, user_id: req.user._id } },
      {
        $lookup: {
          from: "equipment",
          localField: "equipment_id",
          foreignField: "_id",
          as: "equipment"
        }
      },
      { $unwind: "$equipment" },
      {
        $group: {
          _id: "$equipment.category",
          count: { $sum: 1 },
          total_cost: { $sum: "$payment_details.total_cost" },
          average_rating: { $avg: "$ratings.equipment_rating" }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const monthlyTrends = await Reservation.aggregate([
      { $match: { ...dateFilter, user_id: req.user._id } },
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" }
          },
          reservations: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    res.json({
      success: true,
      data: {
        user_stats: userStats,
        equipment_stats: equipmentStats,
        monthly_trends: monthlyTrends
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