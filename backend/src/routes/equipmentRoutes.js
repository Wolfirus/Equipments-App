// backend/src/routes/equipmentRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const Equipment = require("../models/Equipment");
const Reservation = require("../models/Reservation");

const {
  getReservedQuantity,
  getConflictingReservations,
} = require("../utils/reservationAvailability");

// LIST equipment
router.get("/", auth, async (req, res) => {
  try {
    const { search, category, status } = req.query;
    const query = {};

    if (search) query.name = { $regex: search, $options: "i" };
    if (category) query.category = category;
    if (status) query.status = status;

    const items = await Equipment.find(query).sort({ created_at: -1 });
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ✅ STATS (must be before "/:id")
router.get("/stats", auth, requireRole(["admin", "supervisor"]), async (req, res) => {
  try {
    const total = await Equipment.countDocuments();
    const byStatus = await Equipment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);

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

// ✅ Availability endpoint (calendar)
router.get("/availability/:id", auth, async (req, res) => {
  try {
    const equipmentId = req.params.id;
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

// GET by id (after specific routes)
router.get("/:id", auth, async (req, res) => {
  try {
    const item = await Equipment.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Équipement non trouvé" });
    return res.json({ success: true, data: item });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// CREATE equipment (admin)
router.post("/", auth, requireRole(["admin"]), async (req, res) => {
  try {
    const created = await Equipment.create(req.body);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: "Données invalides" });
  }
});

// UPDATE equipment (admin)
router.put("/:id", auth, requireRole(["admin"]), async (req, res) => {
  try {
    const updated = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Équipement non trouvé" });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: "Données invalides" });
  }
});

// DELETE equipment (admin)
router.delete("/:id", auth, requireRole(["admin"]), async (req, res) => {
  try {
    // Option: block deletion if active reservations exist
    const active = await Reservation.countDocuments({ equipment_id: req.params.id, status: { $in: ["approved", "active"] } });
    if (active > 0) {
      return res.status(409).json({ success: false, message: "Suppression impossible: réservations actives/existantes" });
    }

    const deleted = await Equipment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Équipement non trouvé" });

    return res.json({ success: true, message: "Équipement supprimé" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

module.exports = router;
