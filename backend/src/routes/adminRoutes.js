const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const User = require("../models/User");
const Equipment = require("../models/Equipment");
const Reservation = require("../models/Reservation");
const Notification = require("../models/Notification");

// helper: period -> dateFilter
function buildDateFilter(period = "all") {
  const now = new Date();
  if (period === "30d") return { createdAt: { $gte: new Date(now.getTime() - 30 * 86400000) } };
  if (period === "90d") return { createdAt: { $gte: new Date(now.getTime() - 90 * 86400000) } };
  if (period === "1y") return { createdAt: { $gte: new Date(now.getTime() - 365 * 86400000) } };
  return {};
}

// GET /api/admin/stats
router.get("/stats", auth, requireRole("admin"), async (req, res) => {
  try {
    const { period = "all" } = req.query;
    const dateFilter = buildDateFilter(period);
    const now = new Date();
    const activeSince = new Date(now.getTime() - 30 * 86400000);

    // USERS
    const totalUsers = await User.countDocuments({});
    const activeUsers = await User.countDocuments({ "stats.last_activity": { $gte: activeSince } });

    const usersByRoleAgg = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]);
    const usersByDepartmentAgg = await User.aggregate([{ $group: { _id: "$department", count: { $sum: 1 } } }]);

    const role_breakdown = usersByRoleAgg.reduce((acc, x) => ({ ...acc, [x._id]: x.count }), {
      user: 0,
      supervisor: 0,
      admin: 0,
    });
    const department_breakdown = usersByDepartmentAgg.reduce((acc, x) => ({ ...acc, [x._id || "Unknown"]: x.count }), {});

    // EQUIPMENT
    const equipmentAgg = await Equipment.aggregate([
      {
        $group: {
          _id: null,
          total_equipment: { $sum: "$total_quantity" },
          available_equipment: { $sum: "$available_quantity" },
        },
      },
    ]);
    const eq = equipmentAgg[0] || { total_equipment: 0, available_equipment: 0 };
    const utilized_equipment = Math.max(0, (eq.total_equipment || 0) - (eq.available_equipment || 0));
    const utilization_rate =
      eq.total_equipment > 0 ? Math.round(((utilized_equipment / eq.total_equipment) * 100) * 100) / 100 : 0;

    // RESERVATIONS
    const reservationAgg = await Reservation.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          revenue: { $sum: "$payment_details.total_cost" },
        },
      },
    ]);

    const reservationBreakdown = reservationAgg.reduce((acc, x) => {
      acc[x._id] = x.count;
      return acc;
    }, {});

    const totalReservations = reservationAgg.reduce((s, x) => s + x.count, 0);
    const totalRevenue = Math.round((reservationAgg.reduce((s, x) => s + (x.revenue || 0), 0)) * 100) / 100;

    // NOTIFICATIONS
    const totalNotifications = await Notification.countDocuments({});
    const unreadNotifications = await Notification.countDocuments({ read: false });
    const readRate = totalNotifications > 0 ? Math.round((((totalNotifications - unreadNotifications) / totalNotifications) * 100) * 10) / 10 : 0;

    // RECENT ACTIVITY (reservations)
    const recentActivity = await Reservation.find(dateFilter)
      .populate("user_id", "name email department")
      .populate("equipment_id", "name category")
      .sort({ updatedAt: -1 })
      .limit(20)
      .select("status createdAt updatedAt user_id equipment_id");

    res.json({
      success: true,
      data: {
        overview: {
          users: {
            total_users: totalUsers,
            active_users: activeUsers,
            role_breakdown,
            department_breakdown,
          },
          equipment: {
            total_equipment: eq.total_equipment,
            available_equipment: eq.available_equipment,
            utilized_equipment,
            utilization_rate,
          },
          reservations: {
            total_reservations: totalReservations,
            breakdown: reservationBreakdown,
            total_revenue: totalRevenue,
          },
          notifications: {
            total_notifications: totalNotifications,
            unread_notifications: unreadNotifications,
            read_rate: readRate,
          },
        },
        recent_activity: recentActivity,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des statistiques",
      error: error.message,
    });
  }
});

module.exports = router;
