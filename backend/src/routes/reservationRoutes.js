const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const Reservation = require("../models/Reservation");
const Equipment = require("../models/Equipment");
const Notification = require("../models/Notification");
const User = require("../models/User");

/**
 * Chevauchement de dates:
 * overlap si startA <= endB ET endA >= startB
 */
function overlapQuery(start, end) {
  return {
    start_date: { $lte: end },
    end_date: { $gte: start },
  };
}

/**
 * Parse date (YYYY-MM-DD ou ISO) -> Date | null
 */
function parseDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Retourne la quantité déjà réservée sur une période donnée
 * en prenant uniquement les réservations "approved" (et éventuellement "active" si tu l'utilises).
 *
 * Ici, pour simplifier ton projet, on considère:
 * - "approved" = réservation confirmée
 */
async function getReservedQuantity({ equipmentId, start, end, excludeId }) {
  const query = {
    equipment_id: equipmentId,
    status: { $in: ["approved"] }, // ✅ simple à expliquer (tu peux rajouter "active" si besoin)
    ...overlapQuery(start, end),
  };

  if (excludeId) query._id = { $ne: excludeId };

  const overlaps = await Reservation.find(query).select("quantity");
  return overlaps.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
}

/* =========================================================
   GET /api/reservations/me
   Réservations de l'utilisateur connecté
========================================================= */
router.get("/me", auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50", 10)));
    const skip = (page - 1) * limit;

    const query = { user_id: req.user._id };

    const [reservations, total] = await Promise.all([
      Reservation.find(query)
        .populate("equipment_id", "name category status total_quantity")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Reservation.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        reservations,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit,
        },
      },
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Erreur récupération réservations",
      error: e.message,
    });
  }
});

/* =========================================================
   GET /api/reservations/manage
   (admin/supervisor)
   Supervisor => seulement son département (optionnel)
========================================================= */
router.get("/manage", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(300, Math.max(1, parseInt(req.query.limit || "200", 10)));
    const skip = (page - 1) * limit;

    const query = {};

    // ✅ Optionnel: supervisor voit seulement son département
    if (String(req.user.role).toLowerCase() === "supervisor") {
      const users = await User.find({ department: req.user.department }).select("_id");
      query.user_id = { $in: users.map((u) => u._id) };
    }

    const [reservations, total] = await Promise.all([
      Reservation.find(query)
        .populate("equipment_id", "name category status total_quantity")
        .populate("user_id", "name email department role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Reservation.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        reservations,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit,
        },
      },
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Erreur manage réservations",
      error: e.message,
    });
  }
});

/* =========================================================
   POST /api/reservations
   Créer une réservation (user)
   Champs attendus:
   - equipment_id, start_date, end_date, quantity, purpose
========================================================= */
router.post("/", auth, async (req, res) => {
  try {
    const equipment_id = String(req.body?.equipment_id || "").trim();
    const purpose = String(req.body?.purpose || "").trim();
    const notes = String(req.body?.notes || "").trim();
    const quantity = Math.max(1, Number(req.body?.quantity || 0));

    const start = parseDate(req.body?.start_date);
    const end = parseDate(req.body?.end_date);

    // ✅ validations simples
    if (!equipment_id || !purpose || !start || !end || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Champs requis: equipment_id, start_date, end_date, quantity, purpose",
      });
    }

    if (!mongoose.isValidObjectId(equipment_id)) {
      return res.status(400).json({ success: false, message: "equipment_id invalide" });
    }

    if (start > end) {
      return res.status(400).json({ success: false, message: "Période invalide" });
    }

    const eq = await Equipment.findById(equipment_id);
    if (!eq) return res.status(404).json({ success: false, message: "Équipement introuvable" });

    if (eq.status !== "available") {
      return res.status(400).json({ success: false, message: "Équipement indisponible" });
    }

    // ✅ disponibilité par période (pas available_quantity global)
    const reserved = await getReservedQuantity({ equipmentId: eq._id, start, end });
    const remaining = Math.max(0, Number(eq.total_quantity || 0) - reserved);

    if (remaining < quantity) {
      return res.status(400).json({
        success: false,
        message: `Stock insuffisant sur cette période. Disponible: ${remaining}`,
      });
    }

    // ✅ create en pending (manager doit approuver)
    const reservation = await Reservation.create({
      user_id: req.user._id,
      equipment_id: eq._id,
      start_date: start,
      end_date: end,
      quantity,
      purpose,
      notes,
      status: "pending",
    });

    // ✅ notification à l’utilisateur
    try {
      await Notification.reservationCreated(req.user._id, reservation._id, eq.name, start);
    } catch (_) {}

    res.status(201).json({ success: true, data: reservation });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur création réservation", error: e.message });
  }
});

/* =========================================================
   PUT /api/reservations/:id/approve
   Valider une réservation (admin/supervisor)
========================================================= */
router.put("/:id/approve", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID invalide" });
    }

    const r = await Reservation.findById(id);
    if (!r) return res.status(404).json({ success: false, message: "Réservation introuvable" });

    // ✅ on approuve seulement "pending"
    if (r.status !== "pending") {
      return res.status(400).json({ success: false, message: "Réservation déjà traitée" });
    }

    const eq = await Equipment.findById(r.equipment_id);
    if (!eq) return res.status(404).json({ success: false, message: "Équipement introuvable" });

    // ✅ re-check stock sur période (sécurité)
    const reserved = await getReservedQuantity({
      equipmentId: eq._id,
      start: r.start_date,
      end: r.end_date,
      excludeId: r._id,
    });

    const remaining = Math.max(0, Number(eq.total_quantity || 0) - reserved);

    if (remaining < Number(r.quantity || 0)) {
      return res.status(400).json({
        success: false,
        message: `Stock insuffisant au moment de l'approbation. Disponible: ${remaining}`,
      });
    }

    r.status = "approved";
    await r.save();

    // ✅ notification user
    try {
      await Notification.reservationApproved(r.user_id, r._id, eq.name);
    } catch (_) {}

    res.json({ success: true, message: "Réservation approuvée", data: r });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur approve", error: e.message });
  }
});

/* =========================================================
   PUT /api/reservations/:id/reject
   Refuser une réservation (admin/supervisor)
========================================================= */
router.put("/:id/reject", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID invalide" });
    }

    const reason = String(req.body?.reason || "Demande refusée").trim();

    const r = await Reservation.findById(id);
    if (!r) return res.status(404).json({ success: false, message: "Réservation introuvable" });

    if (r.status !== "pending") {
      return res.status(400).json({ success: false, message: "Réservation déjà traitée" });
    }

    r.status = "rejected";
    r.rejection_reason = reason;
    await r.save();

    const eq = await Equipment.findById(r.equipment_id).select("name");
    const eqName = eq?.name || "Équipement";

    // ✅ notification user
    try {
      await Notification.reservationRejected(r.user_id, r._id, eqName, reason);
    } catch (_) {}

    res.json({ success: true, message: "Réservation refusée", data: r });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur reject", error: e.message });
  }
});

/* =========================================================
   DELETE /api/reservations/:id
   Annuler une réservation
   - user: annule la sienne
   - manager: peut annuler toutes
========================================================= */
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID invalide" });
    }

    const r = await Reservation.findById(id);
    if (!r) return res.status(404).json({ success: false, message: "Réservation introuvable" });

    const owner = String(r.user_id) === String(req.user._id);
    const manager = ["admin", "supervisor"].includes(String(req.user.role).toLowerCase());

    if (!owner && !manager) {
      return res.status(403).json({ success: false, message: "Accès refusé" });
    }

    if (["cancelled", "rejected"].includes(r.status)) {
      return res.status(400).json({ success: false, message: "Réservation déjà annulée/refusée" });
    }

    r.status = "cancelled";
    await r.save();

    // ✅ notification user
    try {
      await Notification.reservationCancelled(r.user_id, r._id, "Annulée");
    } catch (_) {}

    res.json({ success: true, message: "Réservation annulée", data: r });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur annulation", error: e.message });
  }
});

module.exports = router;
