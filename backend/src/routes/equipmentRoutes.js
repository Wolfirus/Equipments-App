const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const Equipment = require("../models/Equipment");
const Reservation = require("../models/Reservation");

/**
 * Overlap si: startA <= endB AND endA >= startB
 */
function overlapQuery(start, end) {
  return {
    start_date: { $lte: end },
    end_date: { $gte: start },
  };
}

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function parseDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* =========================================================
   GET /api/equipment
   Liste paginée avec filtres (auth requis)
   Query:
   - page, limit
   - search (nom)
   - category, status
   - available=true => status=available + available_quantity > 0
========================================================= */
router.get("/", auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "24", 10)));
    const skip = (page - 1) * limit;

    const { search, category, status, available } = req.query;

    const q = {};

    if (search) q.name = { $regex: String(search).trim(), $options: "i" };
    if (category) q.category = String(category);
    if (status) q.status = String(status);

    if (available === "true") {
      q.status = "available";
      q.available_quantity = { $gt: 0 };
    }

    const [equipment, total] = await Promise.all([
      Equipment.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Equipment.countDocuments(q),
    ]);

    res.json({
      success: true,
      data: {
        equipment,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit,
        },
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur liste équipements", error: e.message });
  }
});

/* =========================================================
   GET /api/equipment/:id
   Détails d'un équipement
========================================================= */
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) return res.status(400).json({ success: false, message: "ID invalide" });

    const eq = await Equipment.findById(id);
    if (!eq) return res.status(404).json({ success: false, message: "Équipement introuvable" });

    res.json({ success: true, data: eq });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur équipement", error: e.message });
  }
});

/* =========================================================
   GET /api/equipment/:id/availability?start=YYYY-MM-DD&end=YYYY-MM-DD
   Disponibilité sur une période donnée (auth requis)

   Logique:
   - on prend total_quantity
   - on soustrait les réservations APPROVED qui se chevauchent
========================================================= */
router.get("/:id/availability", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { start, end } = req.query;

    if (!isValidId(id)) return res.status(400).json({ success: false, message: "ID invalide" });
    if (!start || !end) return res.status(400).json({ success: false, message: "start et end requis" });

    const startDate = parseDate(start);
    const endDate = parseDate(end);
    if (!startDate || !endDate || startDate > endDate) {
      return res.status(400).json({ success: false, message: "Période invalide" });
    }

    const eq = await Equipment.findById(id);
    if (!eq) return res.status(404).json({ success: false, message: "Équipement introuvable" });

    // Si l'équipement n'est pas "available", il n'est pas réservable
    if (eq.status !== "available") {
      return res.json({
        success: true,
        data: {
          equipment_id: eq._id,
          start: startDate,
          end: endDate,
          status: eq.status,
          total_quantity: eq.total_quantity,
          reserved_quantity: 0,
          available_quantity: 0,
          available: false,
        },
      });
    }

    // 🔥 IMPORTANT : si tu as simplifié Reservation à seulement approved/pending...
    // alors on garde seulement "approved"
    const overlaps = await Reservation.find({
      equipment_id: eq._id,
      status: { $in: ["approved"] },
      ...overlapQuery(startDate, endDate),
    }).select("quantity");

    const reserved = overlaps.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
    const availableForPeriod = Math.max(0, Number(eq.total_quantity || 0) - reserved);

    res.json({
      success: true,
      data: {
        equipment_id: eq._id,
        start: startDate,
        end: endDate,
        status: eq.status,
        total_quantity: Number(eq.total_quantity || 0),
        reserved_quantity: reserved,
        available_quantity: availableForPeriod,
        available: availableForPeriod > 0,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur availability", error: e.message });
  }
});

/* =========================================================
   POST /api/equipment
   Créer un équipement (admin/supervisor)

   Accepte:
   - total_quantity (recommandé)
   - quantity (alias pour compat frontend)
========================================================= */
router.post("/", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();
    const category = String(req.body?.category || "").trim();
    const status = String(req.body?.status || "available").trim();

    const qtyRaw = req.body?.total_quantity ?? req.body?.quantity ?? 1;
    const total_quantity = Math.max(1, Number(qtyRaw || 1));

    const image_url = String(req.body?.image_url || "").trim();

    if (!name) return res.status(400).json({ success: false, message: "Nom requis" });
    if (!description) return res.status(400).json({ success: false, message: "Description requise" });
    if (!category) return res.status(400).json({ success: false, message: "Catégorie requise" });

    const validStatus = ["available", "maintenance", "retired"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ success: false, message: "Statut invalide" });
    }

    const eq = await Equipment.create({
      name,
      description,
      category,
      status,
      total_quantity,
      // disponible maintenant
      available_quantity: status === "available" ? total_quantity : 0,
      images: image_url ? [image_url] : [],
    });

    res.status(201).json({ success: true, data: eq });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur création équipement", error: e.message });
  }
});

/* =========================================================
   PUT /api/equipment/:id
   Modifier un équipement (admin/supervisor)

   Règle importante:
   - On ne reset PAS available_quantity à total_quantity
   - On fait juste un "clamp" si total_quantity diminue
========================================================= */
router.put("/:id", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ success: false, message: "ID invalide" });

    const current = await Equipment.findById(id);
    if (!current) return res.status(404).json({ success: false, message: "Équipement introuvable" });

    const updates = {};

    if (req.body?.name !== undefined) updates.name = String(req.body.name).trim();
    if (req.body?.description !== undefined) updates.description = String(req.body.description).trim();
    if (req.body?.category !== undefined) updates.category = String(req.body.category).trim();

    if (req.body?.status !== undefined) {
      const st = String(req.body.status).trim();
      const validStatus = ["available", "maintenance", "retired"];
      if (!validStatus.includes(st)) return res.status(400).json({ success: false, message: "Statut invalide" });
      updates.status = st;
    }

    // total_quantity / quantity (alias)
    if (req.body?.total_quantity !== undefined || req.body?.quantity !== undefined) {
      const qtyRaw = req.body?.total_quantity ?? req.body?.quantity;
      const newTotal = Math.max(1, Number(qtyRaw || 1));
      updates.total_quantity = newTotal;

      // Clamp available_quantity si total diminue
      updates.available_quantity = Math.min(Number(current.available_quantity || 0), newTotal);

      // Si on met status != available => disponible = 0
      const nextStatus = updates.status ?? current.status;
      if (nextStatus !== "available") updates.available_quantity = 0;
    } else {
      // Si seulement status devient non available => disponible = 0
      if (updates.status && updates.status !== "available") updates.available_quantity = 0;
    }

    if (req.body?.image_url !== undefined) {
      const url = String(req.body.image_url || "").trim();
      updates.images = url ? [url] : [];
    }

    const updated = await Equipment.findByIdAndUpdate(id, updates, { new: true });

    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur update équipement", error: e.message });
  }
});

/* =========================================================
   DELETE /api/equipment/:id
   Supprimer un équipement (admin/supervisor)
========================================================= */
router.delete("/:id", auth, requireRole("supervisor", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ success: false, message: "ID invalide" });

    const eq = await Equipment.findByIdAndDelete(id);
    if (!eq) return res.status(404).json({ success: false, message: "Équipement introuvable" });

    res.json({ success: true, message: "Équipement supprimé" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Erreur suppression équipement", error: e.message });
  }
});

module.exports = router;
