// backend/src/routes/reservationRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const Reservation = require("../models/Reservation");
const Equipment = require("../models/Equipment");
const User = require("../models/User");
const Notification = require("../models/Notification");

const {
  getReservedQuantity,
  getConflictingReservations,
} = require("../utils/reservationAvailability");

// Helper permission
const checkReservationPermission = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate("equipment_id", "name category");

    if (!reservation) {
      return res.status(404).json({ success: false, message: "Réservation non trouvée" });
    }

    // Admin can do everything
    if (req.user.role === "admin") {
      req.reservation = reservation;
      return next();
    }

    // Owner can manage own reservation
    if (reservation.user_id.toString() === req.user._id.toString()) {
      req.reservation = reservation;
      return next();
    }

    // Supervisor can manage reservations from same department
    if (req.user.role === "supervisor") {
      const reservationUser = await User.findById(reservation.user_id).select("department");
      if (reservationUser && reservationUser.department === req.user.department) {
        req.reservation = reservation;
        return next();
      }
    }

    return res.status(403).json({ success: false, message: "Accès refusé" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

/**
 * IMPORTANT: define specific routes BEFORE "/:id"
 */

// ✅ STATS (must be before "/:id")
router.get("/stats", auth, requireRole(["admin", "supervisor"]), async (req, res) => {
  try {
    const match = {};

    if (req.user.role === "supervisor") {
      // supervisor: only reservations from their department users
      const deptUsers = await User.find({ department: req.user.department }).select("_id");
      match.user_id = { $in: deptUsers.map(u => u._id) };
    }

    const total = await Reservation.countDocuments(match);
    const byStatus = await Reservation.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    return res.json({
      success: true,
      data: {
        total,
        byStatus: byStatus.reduce((acc, s) => ((acc[s._id] = s.count), acc), {}),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ✅ Availability for one equipment (calendar needs this)  :contentReference[oaicite:1]{index=1}
router.get("/equipment/:equipmentId/availability", auth, async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ success: false, message: "start et end sont requis (ISO date)" });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
      return res.status(400).json({ success: false, message: "Période invalide" });
    }

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) return res.status(404).json({ success: false, message: "Équipement non trouvé" });

    const reservedQty = await getReservedQuantity({
      equipmentId,
      start: startDate,
      end: endDate,
      statuses: ["approved", "active"],
    });

    const remaining = Math.max(0, equipment.total_quantity - reservedQty);
    const conflicts = await getConflictingReservations({
      equipmentId,
      start: startDate,
      end: endDate,
      statuses: ["approved", "active"],
    });

    return res.json({
      success: true,
      data: {
        equipment: {
          _id: equipment._id,
          name: equipment.name,
          total_quantity: equipment.total_quantity,
          status: equipment.status,
        },
        period: { start: startDate, end: endDate },
        reserved_quantity: reservedQty,
        remaining_quantity: remaining,
        conflicts,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// LIST reservations
router.get("/", auth, async (req, res) => {
  try {
    const {
      status,
      category,
      start,
      end,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    // role scoping
    if (req.user.role === "user") {
      query.user_id = req.user._id;
    } else if (req.user.role === "supervisor") {
      const deptUsers = await User.find({ department: req.user.department }).select("_id");
      query.user_id = { $in: deptUsers.map(u => u._id) };
    }

    if (status) query.status = status;

    if (start && end) {
      query.start_date = { $gte: new Date(start) };
      query.end_date = { $lte: new Date(end) };
    }

    let reservationsQuery = Reservation.find(query)
      .populate("equipment_id", "name category images")
      .populate("user_id", "name email department")
      .sort({ created_at: -1 });

    // category filter needs equipment join
    if (category) {
      reservationsQuery = reservationsQuery.where("equipment_id").in(
        (await Equipment.find({ category }).select("_id")).map(e => e._id)
      );
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [reservations, total] = await Promise.all([
      reservationsQuery.skip(skip).limit(Number(limit)),
      Reservation.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        reservations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// GET by id (after specific routes)
router.get("/:id", auth, checkReservationPermission, async (req, res) => {
  return res.json({ success: true, data: req.reservation });
});

// CREATE reservation request  :contentReference[oaicite:2]{index=2}
router.post("/", auth, async (req, res) => {
  try {
    const { equipment_id, start_date, end_date, quantity = 1, purpose, notes } = req.body;

    if (!equipment_id || !start_date || !end_date || !purpose) {
      return res.status(400).json({
        success: false,
        message: "Les champs equipment_id, start_date, end_date et purpose sont requis",
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
      return res.status(400).json({ success: false, message: "Période invalide" });
    }

    const equipment = await Equipment.findById(equipment_id);
    if (!equipment) return res.status(404).json({ success: false, message: "Équipement non trouvé" });

    if (equipment.status !== "available") {
      return res.status(400).json({ success: false, message: "Équipement indisponible (maintenance/retiré)" });
    }

    // visibility & role rules (keep your existing logic)
    if (equipment.visibility?.is_public === false && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Cet équipement n'est pas publiquement disponible" });
    }

    if (
      equipment.visibility?.restricted_to_departments?.length > 0 &&
      !equipment.visibility.restricted_to_departments.includes(req.user.department)
    ) {
      return res.status(403).json({ success: false, message: "Cet équipement n'est pas disponible pour votre département" });
    }

    // ✅ Quantity-aware conflict check  :contentReference[oaicite:3]{index=3}
    const reservedQty = await getReservedQuantity({
      equipmentId: equipment_id,
      start: startDate,
      end: endDate,
      statuses: ["approved", "active"],
    });

    const remaining = Math.max(0, equipment.total_quantity - reservedQty);

    if (Number(quantity) > remaining) {
      const conflicts = await getConflictingReservations({
        equipmentId: equipment_id,
        start: startDate,
        end: endDate,
        statuses: ["approved", "active"],
      });

      return res.status(409).json({
        success: false,
        message: "Conflit: quantité insuffisante sur cette période",
        data: {
          requested_quantity: Number(quantity),
          remaining_quantity: remaining,
          conflicting_reservations: conflicts,
        },
      });
    }

    // Limit active reservations per user (keep)
    const activeReservations = await Reservation.countDocuments({
      user_id: req.user._id,
      status: { $in: ["pending", "approved", "active"] },
    });

    if (activeReservations >= 10) {
      return res.status(400).json({ success: false, message: "Limite de réservations actives atteinte (10)" });
    }

    // Auto/manual approval rule: example
    // - admin auto-approved
    // - otherwise pending (supervisor approves)
    const status = req.user.role === "admin" ? "approved" : "pending";

    const reservation = await Reservation.create({
      user_id: req.user._id,
      equipment_id,
      start_date: startDate,
      end_date: endDate,
      quantity: Number(quantity),
      purpose,
      notes,
      status,
      approval: {
        requires_supervisor_approval: req.user.role !== "admin",
        approved_by: req.user.role === "admin" ? req.user._id : undefined,
        approved_at: req.user.role === "admin" ? new Date() : undefined,
      },
    });

    // Optional notification (if you use Notification model)
    try {
      await Notification.create({
        user_id: req.user._id,
        type: "reservation_created",
        title: "Réservation créée",
        message: `Votre demande de réservation a été créée (statut: ${reservation.status}).`,
      });
    } catch (_) {}

    return res.status(201).json({ success: true, data: reservation });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// UPDATE (owner/admin/supervisor)
router.put("/:id", auth, checkReservationPermission, async (req, res) => {
  try {
    const updatable = ["start_date", "end_date", "quantity", "purpose", "notes"];
    const payload = {};
    for (const k of updatable) if (req.body[k] !== undefined) payload[k] = req.body[k];

    // Prevent editing after approval (optional rule)
    if (["approved", "active", "completed"].includes(req.reservation.status) && req.user.role !== "admin") {
      return res.status(400).json({ success: false, message: "Impossible de modifier une réservation déjà approuvée" });
    }

    const updated = await Reservation.findByIdAndUpdate(req.params.id, payload, { new: true });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// APPROVE (admin/supervisor)  :contentReference[oaicite:4]{index=4}
router.put("/:id/approve", auth, requireRole(["admin", "supervisor"]), async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ success: false, message: "Réservation non trouvée" });

    if (reservation.status !== "pending") {
      return res.status(400).json({ success: false, message: "Seules les réservations en attente peuvent être approuvées" });
    }

    reservation.status = "approved";
    reservation.approval = reservation.approval || {};
    reservation.approval.approved_by = req.user._id;
    reservation.approval.approved_at = new Date();
    reservation.approval.approval_notes = req.body?.notes || "";

    await reservation.save();

    try {
      await Notification.create({
        user_id: reservation.user_id,
        type: "reservation_approved",
        title: "Réservation approuvée",
        message: "Votre réservation a été approuvée.",
      });
    } catch (_) {}

    return res.json({ success: true, data: reservation });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// REJECT (admin/supervisor)
router.put("/:id/reject", auth, requireRole(["admin", "supervisor"]), async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ success: false, message: "Réservation non trouvée" });

    if (reservation.status !== "pending") {
      return res.status(400).json({ success: false, message: "Seules les réservations en attente peuvent être refusées" });
    }

    reservation.status = "cancelled";
    reservation.approval = reservation.approval || {};
    reservation.approval.approved_by = req.user._id;
    reservation.approval.approved_at = new Date();
    reservation.approval.approval_notes = req.body?.notes || "";

    await reservation.save();

    try {
      await Notification.create({
        user_id: reservation.user_id,
        type: "reservation_rejected",
        title: "Réservation refusée",
        message: "Votre réservation a été refusée.",
      });
    } catch (_) {}

    return res.json({ success: true, data: reservation });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// DELETE / cancel (owner/admin/supervisor)
router.delete("/:id", auth, checkReservationPermission, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ success: false, message: "Réservation non trouvée" });

    // soft-cancel instead of remove (recommended)
    reservation.status = "cancelled";
    await reservation.save();

    return res.json({ success: true, message: "Réservation annulée" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

module.exports = router;
