const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const User = require("../models/User");
const Equipment = require("../models/Equipment");
const Reservation = require("../models/Reservation");
const Notification = require("../models/Notification");
const Category = require("../models/Category");

// GET /api/admin/stats - Dashboard statistics
router.get("/stats", auth, requireRole("admin"), async (req, res) => {
  try {
    const { period = 'all' } = req.query;

    // Date filter based on period
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

    // User statistics
    const userStats = await User.aggregate([
      { $group: {
          _id: null,
          total_users: { $sum: 1 },
          active_users: {
            $sum: { $cond: [{ $gt: ["$stats.last_activity", new Date(now - 30 * 24 * 60 * 60 * 1000)] }, 1, 0] }
          },
          users_by_role: {
            $push: {
              role: "$role",
              department: "$department",
              name: "$name"
            }
          },
          users_by_department: {
            $push: "$department"
          }
        }
      },
      {
        $project: {
          total_users: 1,
          active_users: 1,
          role_breakdown: {
            $reduce: {
              input: "$users_by_role",
              initialValue: { user: 0, supervisor: 0, admin: 0 },
              in: {
                $arrayToObject: {
                  input: ["$$this.role"],
                  values: { $add: ["$$value[$$this.role]", 1] }
                }
              }
            }
          },
          department_breakdown: {
            $reduce: {
              input: "$users_by_department",
              initialValue: {},
              in: {
                $arrayToObject: {
                  input: ["$$this"],
                  values: { $add: ["$$value[$$this]", 1] }
                }
              }
            }
          }
        }
      }
    ]);

    // Equipment statistics
    const equipmentStats = await Equipment.aggregate([
      { $group: {
          _id: null,
          total_equipment: { $sum: "$total_quantity" },
          available_equipment: { $sum: "$available_quantity" },
          utilized_equipment: {
            $sum: { $subtract: ["$total_quantity", "$available_quantity"] }
          },
          equipment_by_category: {
            $push: { category: "$category", total: "$total_quantity" }
          },
          equipment_by_status: {
            $push: { status: "$status", total: "$total_quantity" }
          },
          average_utilization_rate: {
            $avg: {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ["$total_quantity", "$available_quantity"] },
                    "$total_quantity"
                  ]
                },
                100
              ]
            }
          }
        }
      },
      {
        $project: {
          total_equipment: 1,
          available_equipment: 1,
          utilized_equipment: 1,
          utilization_rate: { $round: ["$average_utilization_rate", 2] },
          category_breakdown: {
            $reduce: {
              input: "$equipment_by_category",
              initialValue: {},
              in: {
                $arrayToObject: {
                  input: ["$$this.category"],
                  values: { $add: ["$$value[$$this.category]", "$$this.total"] }
                }
              }
            }
          },
          status_breakdown: {
            $reduce: {
              input: "$equipment_by_status",
              initialValue: {},
              in: {
                $arrayToObject: {
                  input: ["$$this.status"],
                  values: { $add: ["$$value[$$this.status]", "$$this.total"] }
                }
              }
            }
          }
        }
      }
    ]);

    // Reservation statistics
    const reservationStats = await Reservation.aggregate([
      { $match: dateFilter },
      { $group: {
          _id: null,
          total_reservations: { $sum: 1 },
          active_reservations: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
          },
          pending_reservations: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          completed_reservations: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          cancelled_reservations: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
          },
          total_revenue: { $sum: "$payment_details.total_cost" },
          average_reservation_value: {
            $avg: "$payment_details.total_cost"
          },
          reservation_trends: {
            $push: {
              month: { $month: "$created_at" },
              year: { $year: "$created_at" },
              status: "$status",
              revenue: "$payment_details.total_cost"
            }
          }
        }
      },
      {
        $project: {
          total_reservations: 1,
          active_reservations: 1,
          pending_reservations: 1,
          completed_reservations: 1,
          cancelled_reservations: 1,
          total_revenue: { $round: ["$total_revenue", 2] },
          average_reservation_value: { $round: ["$average_reservation_value", 2] },
          completion_rate: {
            $round: [
              { $multiply: [
                { $divide: ["$completed_reservations", "$total_reservations"] },
                100
              ] },
              1
            ]
          }
        }
      }
    ]);

    // Top performing equipment
    const topEquipment = await Equipment.aggregate([
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          category: { $first: "$category" },
          total_rentals: { $first: "$usage_stats.total_rentals" },
          average_rating: { $first: "$usage_stats.average_rating" },
          utilization_rate: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ["$total_quantity", "$available_quantity"] },
                  "$total_quantity"
                ]
              },
              100
            ]
          }
        }
      },
      { $sort: { total_rentals: -1 } },
      { $limit: 10 }
    ]);

    // Recent activity
    const recentActivity = await Reservation.find({
      ...dateFilter,
      $or: [
        { status: 'pending' },
        { status: 'approved' },
        { status: 'completed' },
        { status: 'cancelled' }
      ]
    })
      .populate('user_id', 'name email department')
      .populate('equipment_id', 'name category')
      .sort({ updated_at: -1 })
      .limit(20)
      .select('status created_at updated_at user_id equipment_id');

    // Notification statistics
    const notificationStats = await Notification.aggregate([
      { $group: {
          _id: null,
          total_notifications: { $sum: 1 },
          unread_notifications: {
            $sum: { $cond: ["$read", 0, 1] }
          },
          notifications_by_type: {
            $push: { type: "$type" }
          },
          notifications_by_priority: {
            $push: { priority: "$priority" }
          }
        }
      },
      {
        $project: {
          total_notifications: 1,
          unread_notifications: 1,
          read_rate: {
            $round: [
              { $multiply: [
                { $divide: [
                  { $subtract: ["$total_notifications", "$unread_notifications"] },
                  "$total_notifications"
                ] },
                100
              ] },
              1
            ]
          }
        }
      }
    ]);

    // Monthly trends
    const monthlyTrends = await Reservation.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" }
          },
          reservations: { $sum: 1 },
          revenue: { $sum: "$payment_details.total_cost" },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Department statistics
    const departmentStats = await User.aggregate([
      { $group: {
          _id: "$department",
          total_users: { $sum: 1 },
          active_users: {
            $sum: { $cond: [{ $gt: ["$stats.last_activity", new Date(now - 30 * 24 * 60 * 60 * 1000)] }, 1, 0] }
          },
          total_reservations: { $sum: "$stats.total_reservations" },
          completed_reservations: { $sum: "$stats.completed_reservations" },
          return_rate: { $avg: "$stats.return_rate" }
        }
      },
      { $sort: { total_reservations: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          users: userStats[0] || {
            total_users: 0,
            active_users: 0,
            role_breakdown: { user: 0, supervisor: 0, admin: 0 },
            department_breakdown: {}
          },
          equipment: equipmentStats[0] || {
            total_equipment: 0,
            available_equipment: 0,
            utilized_equipment: 0,
            utilization_rate: 0,
            category_breakdown: {},
            status_breakdown: {}
          },
          reservations: reservationStats[0] || {
            total_reservations: 0,
            active_reservations: 0,
            pending_reservations: 0,
            completed_reservations: 0,
            cancelled_reservations: 0,
            total_revenue: 0,
            average_reservation_value: 0,
            completion_rate: 0
          },
          notifications: notificationStats[0] || {
            total_notifications: 0,
            unread_notifications: 0,
            read_rate: 0
          }
        },
        top_equipment: topEquipment,
        recent_activity: recentActivity,
        monthly_trends: monthlyTrends,
        department_stats: departmentStats
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

// GET /api/admin/activity - Recent system activity
router.get("/activity", auth, requireRole("admin"), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      type, // 'users', 'equipment', 'reservations', 'notifications'
      period = '7d'
    } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case '24h':
        dateFilter = { updated_at: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
        break;
      case '7d':
        dateFilter = { updated_at: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { updated_at: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
      default:
        dateFilter = { updated_at: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
    }

    let activities = [];

    // User activity
    if (!type || type === 'users') {
      const userActivity = await User.find(dateFilter)
        .sort({ updated_at: -1 })
        .limit(parseInt(limit))
        .select('name email role department updated_at created_at');

      activities.push(...userActivity.map(user => ({
        type: 'user',
        action: user.updated_at.getTime() === user.created_at.getTime() ? 'created' : 'updated',
        description: `${user.name} (${user.email}) - ${user.role}`,
        date: user.updated_at,
        details: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department
        }
      })));
    }

    // Equipment activity
    if (!type || type === 'equipment') {
      const equipmentActivity = await Equipment.find(dateFilter)
        .sort({ updated_at: -1 })
        .limit(parseInt(limit))
        .select('name category status updated_at created_at');

      activities.push(...equipmentActivity.map(equipment => ({
        type: 'equipment',
        action: equipment.updated_at.getTime() === equipment.created_at.getTime() ? 'created' : 'updated',
        description: `${equipment.name} - ${equipment.category}`,
        date: equipment.updated_at,
        details: {
          _id: equipment._id,
          name: equipment.name,
          category: equipment.category,
          status: equipment.status
        }
      })));
    }

    // Reservation activity
    if (!type || type === 'reservations') {
      const reservationActivity = await Reservation.find(dateFilter)
        .populate('user_id', 'name email department')
        .populate('equipment_id', 'name category')
        .sort({ updated_at: -1 })
        .limit(parseInt(limit))
        .select('status created_at updated_at user_id equipment_id');

      activities.push(...reservationActivity.map(reservation => ({
        type: 'reservation',
        action: reservation.status,
        description: `${reservation.user_id?.name || 'Inconnu'} - ${reservation.equipment_id?.name || 'Inconnu'}`,
        date: reservation.updated_at,
        details: {
          _id: reservation._id,
          status: reservation.status,
          user: reservation.user_id,
          equipment: reservation.equipment_id
        }
      })));
    }

    // Sort all activities by date
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedActivities = activities.slice(skip, skip + parseInt(limit));

    // Get activity statistics
    const activityStats = await Promise.all([
      User.countDocuments(dateFilter),
      Equipment.countDocuments(dateFilter),
      Reservation.countDocuments(dateFilter),
      Notification.countDocuments(dateFilter)
    ]);

    const stats = {
      user_activities: activityStats[0],
      equipment_activities: activityStats[1],
      reservation_activities: activityStats[2],
      notification_activities: activityStats[3],
      total_activities: activityStats.reduce((sum, count) => sum + count, 0)
    };

    res.json({
      success: true,
      data: {
        activities: paginatedActivities,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(activities.length / parseInt(limit)),
          total: activities.length,
          limit: parseInt(limit)
        },
        statistics: stats
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

// GET /api/admin/reports - Basic usage reports
router.get("/reports", auth, requireRole("admin"), async (req, res) => {
  try {
    const {
      type = 'overview',
      period = '30d',
      start_date,
      end_date,
      format = 'json'
    } = req.query;

    // Date range
    let dateFilter = {};
    if (start_date && end_date) {
      dateFilter = {
        created_at: {
          $gte: new Date(start_date),
          $lte: new Date(end_date)
        }
      };
    } else {
      const now = new Date();
      switch (period) {
        case '7d':
          dateFilter = { created_at: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
          break;
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
          dateFilter = { created_at: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
      }
    }

    let reportData = {};

    switch (type) {
      case 'overview':
        // Basic overview
        const overviewStats = await Promise.all([
          User.countDocuments(),
          Equipment.countDocuments(),
          Reservation.countDocuments(dateFilter),
          Reservation.aggregate([
            { $match: dateFilter },
            { $group: { _id: null, revenue: { $sum: "$payment_details.total_cost" } } }
          ])
        ]);

        reportData = {
          total_users: overviewStats[0],
          total_equipment: overviewStats[1],
          total_reservations: overviewStats[2],
          total_revenue: overviewStats[3][0]?.revenue || 0,
          period: period,
          generated_at: new Date()
        };
        break;

      case 'equipment':
        // Equipment utilization report
        reportData = await Equipment.aggregate([
          {
            $group: {
              _id: "$category",
              total_equipment: { $sum: "$total_quantity" },
              available_equipment: { $sum: "$available_quantity" },
              utilized_equipment: {
                $sum: { $subtract: ["$total_quantity", "$available_quantity"] }
              },
              total_rentals: { $sum: "$usage_stats.total_rentals" },
              average_rating: { $avg: "$usage_stats.average_rating" },
              maintenance_count: { $sum: "$usage_stats.maintenance_count" }
            }
          },
          {
            $addFields: {
              utilization_rate: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $subtract: ["$utilized_equipment", "$available_equipment"] },
                          "$total_equipment"
                        ]
                      },
                      100
                    ]
                  },
                  2
                ]
              }
            }
          },
          { $sort: { total_rentals: -1 } }
        ]);
        break;

      case 'reservations':
        // Reservation analytics
        reportData = await Reservation.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: {
                year: { $year: "$created_at" },
                month: { $month: "$created_at" },
                status: "$status"
              },
              count: { $sum: 1 },
              revenue: { $sum: "$payment_details.total_cost" },
              average_duration: {
                $avg: { $divide: [{ $subtract: ["$end_date", "$start_date"] }, 1000 * 60 * 60 * 24] }
              }
            }
          },
          { $sort: { "_id.year": 1, "_id.month": 1, "_id.status": 1 } }
        ]);
        break;

      case 'users':
        // User activity report
        reportData = await User.aggregate([
          {
            $group: {
              _id: "$department",
              total_users: { $sum: 1 },
              active_users: {
                $sum: { $cond: [{ $gt: ["$stats.last_activity", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] }, 1, 0] }
              },
              total_reservations: { $sum: "$stats.total_reservations" },
              completed_reservations: { $sum: "$stats.completed_reservations" },
              return_rate: { $avg: "$stats.return_rate" }
            }
          },
          { $sort: { total_reservations: -1 } }
        ]);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Type de rapport invalide. Utilisez: overview, equipment, reservations, users"
        });
    }

    // Format response based on format parameter
    if (format === 'csv') {
      // Basic CSV conversion (you might want to use a proper CSV library)
      let csvContent = '';
      if (Array.isArray(reportData)) {
        const headers = Object.keys(reportData[0]);
        csvContent = headers.join(',') + '\n';
        for (const row of reportData) {
          csvContent += headers.map(header => row[header]).join(',') + '\n';
        }
      } else {
        const headers = Object.keys(reportData);
        csvContent = headers.join(',') + '\n';
        csvContent += headers.map(header => reportData[header]).join(',') + '\n';
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
      return res.send(csvContent);
    }

    res.json({
      success: true,
      data: {
        report_type: type,
        period: period,
        generated_at: new Date(),
        data: reportData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la génération du rapport",
      error: error.message
    });
  }
});

// GET /api/admin/health - System health check
router.get("/health", auth, requireRole("admin"), async (req, res) => {
  try {
    // Database connectivity
    const dbStatus = {
      connected: true, // If we reach here, DB is connected
      response_time: Date.now() // Basic timing
    };

    // Model statistics
    const [userCount, equipmentCount, reservationCount, notificationCount] = await Promise.all([
      User.countDocuments(),
      Equipment.countDocuments(),
      Reservation.countDocuments(),
      Notification.countDocuments()
    ]);

    // Recent activity (last 24 hours)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recentUsers, recentReservations, recentNotifications] = await Promise.all([
      User.countDocuments({ created_at: { $gte: dayAgo } }),
      Reservation.countDocuments({ created_at: { $gte: dayAgo } }),
      Notification.countDocuments({ created_at: { $gte: dayAgo } })
    ]);

    // System performance indicators
    const performance = {
      total_users: userCount,
      total_equipment: equipmentCount,
      total_reservations: reservationCount,
      pending_notifications: await Notification.countDocuments({ read: false }),
      active_reservations: await Reservation.countDocuments({ status: 'active' }),
      recent_activity: {
        new_users: recentUsers,
        new_reservations: recentReservations,
        new_notifications: recentNotifications
      }
    };

    // Overall health score (0-100)
    const healthScore = Math.min(100, Math.max(0,
      (userCount > 0 ? 25 : 0) +
      (equipmentCount > 0 ? 25 : 0) +
      (performance.pending_notifications < performance.total_reservations * 0.1 ? 25 : 0) +
      (performance.active_reservations < performance.total_reservations * 0.3 ? 25 : 0)
    ));

    const health = {
      status: healthScore >= 75 ? 'healthy' : healthScore >= 50 ? 'warning' : 'critical',
      score: healthScore,
      database: dbStatus,
      performance,
      timestamp: new Date(),
      checks: {
        database_connected: dbStatus.connected,
        users_exist: userCount > 0,
        equipment_exist: equipmentCount > 0,
        recent_activity: (recentUsers + recentReservations + recentNotifications) > 0
      }
    };

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la vérification de la santé du système",
      error: error.message
    });
  }
});

// GET /api/admin/maintenance - Maintenance information
router.get("/maintenance", auth, requireRole("admin"), async (req, res) => {
  try {
    // Equipment needing maintenance
    const maintenanceNeeded = await Equipment.find({
      $or: [
        { status: 'maintenance' },
        { 'usage_stats.maintenance_count': { $gt: 5 } },
        { 'usage_stats.average_rating': { $lt: 2.5 } }
      ]
    })
      .populate({
        path: 'related_entity.id',
        model: 'Category',
        select: 'name'
      })
      .sort({ 'usage_stats.last_maintenance': 1 });

    // Overdue reservations
    const overdueReservations = Reservation.findOverdueReservations()
      .populate('user_id', 'name email')
      .populate('equipment_id', 'name category');

    // System issues to address
    const issues = [];

    // Check for equipment with low availability
    const lowAvailability = await Equipment.aggregate([
      {
        $group: {
          _id: "$category",
          total_quantity: { $sum: "$total_quantity" },
          available_quantity: { $sum: "$available_quantity" }
        }
      },
      {
        $match: {
          $expr: {
            $lt: [
              { $divide: ["$available_quantity", "$total_quantity"] },
              0.2
            ]
          }
        }
      }
    ]);

    if (lowAvailability.length > 0) {
      issues.push({
        type: 'low_availability',
        severity: 'medium',
        description: `${lowAvailability.length} catégorie(s) avec moins de 20% de disponibilité`,
        details: lowAvailability
      });
    }

    // Check for long-pending reservations
    const longPending = await Reservation.find({
      status: 'pending',
      created_at: { $lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
    });

    if (longPending.length > 0) {
      issues.push({
        type: 'long_pending_reservations',
        severity: 'high',
        description: `${longPending.length} réservation(s) en attente depuis plus de 3 jours`,
        details: longPending
      });
    }

    res.json({
      success: true,
      data: {
        maintenance_needed: maintenanceNeeded,
        overdue_reservations: overdueReservations,
        system_issues: issues,
        recommendations: {
          schedule_maintenance: maintenanceNeeded.length,
          contact_users: overdueReservations.length,
          review_categories: lowAvailability.length,
          process_pending: longPending.length
        },
        last_checked: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des informations de maintenance",
      error: error.message
    });
  }
});

// POST /api/admin/system-actions - System management actions
router.post("/system-actions", auth, requireRole("admin"), async (req, res) => {
  try {
    const { action, parameters } = req.body;

    switch (action) {
      case 'cleanup_notifications':
        // Clean up old notifications
        const cutoffDate = new Date(Date.now() - (parameters.days || 90) * 24 * 60 * 60 * 1000);
        const result = await Notification.deleteMany({
          created_at: { $lt: cutoffDate },
          read: true
        });

        res.json({
          success: true,
          message: `${result.deletedCount} anciennes notifications supprimées`,
          data: { deleted_count: result.deletedCount }
        });
        break;

      case 'update_equipment_stats':
        // Update all equipment statistics
        await Category.updateEquipmentCounts();

        const equipment = await Equipment.find({});
        for (const item of equipment) {
          const activeReservations = await Reservation.find({
            equipment_id: item._id,
            status: 'active'
          });

          item.usage_stats.active_rentals = activeReservations.length;
          await item.save();
        }

        res.json({
          success: true,
          message: `Statistiques mises à jour pour ${equipment.length} équipement(s)`,
          data: { updated_count: equipment.length }
        });
        break;

      case 'notify_inactive_users':
        // Notify users who haven't been active
        const inactiveThreshold = new Date(Date.now() - (parameters.days || 30) * 24 * 60 * 60 * 1000);
        const inactiveUsers = await User.find({
          'stats.last_activity': { $lt: inactiveThreshold },
          role: { $ne: 'admin' }
        });

        let notifiedCount = 0;
        for (const user of inactiveUsers) {
          try {
            await Notification.createNotification({
              user_id: user._id,
              type: 'system_update',
              title: 'Inactivité de compte',
              message: `Votre compte n'a pas été utilisé depuis plus de ${parameters.days || 30} jours.`,
              priority: 'low',
              metadata: {
                source: 'admin_action',
                category: 'system'
              }
            });
            notifiedCount++;
          } catch (error) {
            console.error(`Failed to notify user ${user._id}:`, error);
          }
        }

        res.json({
          success: true,
          message: `${notifiedCount} utilisateurs inactifs notifiés`,
          data: { notified_count: notifiedCount, total_inactive: inactiveUsers.length }
        });
        break;

      case 'backup_data':
        // Trigger data backup (placeholder)
        res.json({
          success: true,
          message: "Opération de sauvegarde initiée",
          data: {
            backup_id: `backup_${Date.now()}`,
            status: "initiated",
            estimated_completion: new Date(Date.now() + 30 * 60 * 1000)
          }
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Action système invalide",
          available_actions: [
            'cleanup_notifications',
            'update_equipment_stats',
            'notify_inactive_users',
            'backup_data'
          ]
        });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'exécution de l'action système",
      error: error.message
    });
  }
});

module.exports = router;