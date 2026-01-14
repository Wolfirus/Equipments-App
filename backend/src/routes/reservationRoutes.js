const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const Reservation = require("../models/Reservation");
const Equipment = require("../models/Equipment");
const Notification = require("../models/Notification");

// helper overlap query
function overlapQuery(start, end) {
  return {
    start_date: { $lte: end },
    end_date: { $gte: start },
  };
}

// GET /api/reservations/me  (user)
router.get("/me", auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const query = { user_id: req.user._id };
    const reservations = await Reservation.find(query)
      .populate("equipment_id", "name category status total_quantity available_quantity")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await Reservation.countDocuments(query);

    res.json({
      success: true,
      data: {
        reservations,
        pagination: { current: +page, pages: Math.ceil(total / +limit), total, limit: +limit },
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur récupération réservations", error: e.message });
  }
});

// GET /api/reservations/manage  (admin/supervisor)
router.get("/manage", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const { page = 1, limit = 200 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const query = {};
    // supervisor => son département uniquement (si tu veux appliquer ça)
    if (req.user.role === "supervisor") {
      const User = require("../models/User");
      const users = await User.find({ department: req.user.department }).select("_id");
      query.user_id = { $in: users.map((u) => u._id) };
    }

    const reservations = await Reservation.find(query)
      .populate("equipment_id", "name category status total_quantity available_quantity")
      .populate("user_id", "name email department role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await Reservation.countDocuments(query);

    res.json({
      success: true,
      data: {
        reservations,
        pagination: { current: +page, pages: Math.ceil(total / +limit), total, limit: +limit },
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur manage réservations", error: e.message });
  }
});

// POST /api/reservations  (create)
router.post("/", auth, async (req, res) => {
  try {
    const { equipment_id, start_date, end_date, quantity, purpose, notes } = req.body;

    if (!equipment_id || !start_date || !end_date || !quantity || !purpose) {
      return res.status(400).json({ success: false, message: "Champs requis manquants" });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return res.status(400).json({ success: false, message: "Période invalide" });
    }

    const eq = await Equipment.findById(equipment_id);
    if (!eq) return res.status(404).json({ success: false, message: "Équipement introuvable" });
    if (eq.status !== "available") return res.status(400).json({ success: false, message: "Équipement indisponible" });

    // ✅ calcul dispo par dates (sum overlaps)
    const overlaps = await Reservation.find({
      equipment_id,
      status: { $in: ["approved", "active"] },
      ...overlapQuery(start, end),
    }).select("quantity");

    const reserved = overlaps.reduce((s, r) => s + (r.quantity || 0), 0);
    const remaining = (eq.total_quantity || 0) - reserved;

    if (remaining < Number(quantity)) {
      return res.status(400).json({
        success: false,
        message: `Stock insuffisant sur cette période. Disponible: ${Math.max(0, remaining)}`,
      });
    }

    const reservation = await Reservation.create({
      user_id: req.user._id,
      equipment_id,
      start_date: start,
      end_date: end,
      quantity: Number(quantity),
      purpose,
      notes: notes || "",
      status: "pending",
    });

    // notif user
    try {
      await Notification.reservationCreated(req.user._id, reservation._id, eq.name, start);
    } catch (_) {}

    res.status(201).json({ success: true, data: reservation });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur création réservation", error: e.message });
  }
});

// PUT /api/reservations/:id/approve
router.put("/:id/approve", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ success: false, message: "Réservation introuvable" });

    if (r.status !== "pending") {
      return res.status(400).json({ success: false, message: "Réservation non en attente" });
    }

    const eq = await Equipment.findById(r.equipment_id);
    if (!eq) return res.status(404).json({ success: false, message: "Équipement introuvable" });

    // ✅ re-check stock by dates before approve
    const overlaps = await Reservation.find({
      _id: { $ne: r._id },
      equipment_id: r.equipment_id,
      status: { $in: ["approved", "active"] },
      ...overlapQuery(r.start_date, r.end_date),
    }).select("quantity");

    const reserved = overlaps.reduce((s, x) => s + (x.quantity || 0), 0);
    const remaining = (eq.total_quantity || 0) - reserved;

    if (remaining < (r.quantity || 0)) {
      return res.status(400).json({
        success: false,
        message: `Stock insuffisant sur la période au moment de l’approbation. Disponible: ${Math.max(0, remaining)}`,
      });
    }

    r.status = "approved";
    await r.save();

    try {
      await Notification.reservationApproved(r.user_id, r._id, eq.name);
    } catch (_) {}

    res.json({ success: true, data: r, message: "Réservation approuvée" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur approve", error: e.message });
  }
});

// PUT /api/reservations/:id/reject
router.put("/:id/reject", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const { reason = "Demande refusée" } = req.body || {};

    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ success: false, message: "Réservation introuvable" });

    r.status = "rejected";
    r.rejection_reason = reason;
    await r.save();

    const eq = await Equipment.findById(r.equipment_id).select("name");
    try {
      await Notification.reservationRejected(r.user_id, r._id, eq?.name || "Équipement", reason);
    } catch (_) {}

    res.json({ success: true, data: r, message: "Réservation refusée" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur reject", error: e.message });
  }
});

// DELETE /api/reservations/:id (cancel)
router.delete("/:id", auth, async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ success: false, message: "Réservation introuvable" });

    const isOwner = String(r.user_id) === String(req.user._id);
    const isManager = ["admin", "supervisor"].includes(req.user.role);

    if (!isOwner && !isManager) {
      return res.status(403).json({ success: false, message: "Accès refusé" });
    }

    // pas de décrément/incrément global available_quantity ici ✅
    r.status = "cancelled";
    await r.save();

    try {
      await Notification.reservationCancelled(r.user_id, r._id, "Annulée");
    } catch (_) {}

    res.json({ success: true, message: "Réservation annulée", data: r });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur annulation", error: e.message });
  }
});

module.exports = router;
